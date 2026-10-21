/**
 * Test Suite: Rippoma Authentication, D1 Schema, and Gateway Tests
 * Covers all 14 points required for testing the fixes.
 */

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Set required env vars for tests
process.env.NODE_ENV = 'test';
process.env.DATA_BACKEND = 'd1';
process.env.CUSTOMER_JWT_SECRET = 'test_customer_jwt_secret_12345';
process.env.CUSTOMER_JWT_REFRESH_SECRET = 'test_customer_jwt_refresh_secret_67890';
process.env.GOOGLE_CLIENT_ID = '140622339758-03aobin1o3qfct6fdn3bpfe5hr2gujsv.apps.googleusercontent.com';
process.env.D1_INTERNAL_SECRET = 'test-internal-secret-xyz';

// ── In-Memory SQLite D1 Simulator ────────────────────────────────────────────
const rootDir = path.resolve(__dirname, '../..');
const schemaSql = fs.readFileSync(path.join(rootDir, 'd1/schema.sql'), 'utf8');

const memDb = new DatabaseSync(':memory:');
memDb.exec(schemaSql);

// Mock server/utils/d1 to route directly to our in-memory SQLite db
const d1 = require('../utils/d1');
d1.query = async (statements) => {
  const list = Array.isArray(statements) ? statements : [statements];
  const results = [];
  for (const { sql, params = [] } of list) {
    try {
      const stmt = memDb.prepare(sql);
      const isSelect = /^\s*(SELECT|PRAGMA)/i.test(sql);
      if (isSelect) {
        const rows = stmt.all(...params);
        results.push({ results: rows, success: true, meta: { changes: 0 } });
      } else {
        const info = stmt.run(...params);
        results.push({ results: [], success: true, meta: { changes: info.changes } });
      }
    } catch (err) {
      throw new Error(`[D1] ${err.message}`);
    }
  }
  return results;
};
d1.all = async (sql, params = []) => {
  const [res] = await d1.query({ sql, params });
  return res?.results || [];
};
d1.first = async (sql, params = []) => {
  const rows = await d1.all(sql, params);
  return rows[0] || null;
};
d1.run = async (sql, params = []) => {
  const [res] = await d1.query({ sql, params });
  return res?.meta || {};
};
d1.ping = async () => true;

// Load d1Mongoose and models
require('../utils/d1Mongoose');
const mongoose = require('mongoose');
const CustomerAccount = require('../models/CustomerAccount');
const CustomerSession = require('../models/CustomerSession');
const ActivityLog = require('../models/ActivityLog');
const customerAuthController = require('../controllers/customerAuth.controller');

describe('Rippoma Authentication & D1 Schema Test Suite', () => {
  beforeEach(() => {
    memDb.exec('DELETE FROM customer_sessions;');
    memDb.exec('DELETE FROM customer_accounts;');
    memDb.exec('DELETE FROM activity_logs;');
  });

  // ── 1. Customer login with valid credentials ────────────────────────────────
  it('1. Customer login succeeds with valid credentials and does not fail on google column', async () => {
    const hashedPassword = await bcrypt.hash('SecurePassword123!', 10);
    const customer = await CustomerAccount.create({
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      password: hashedPassword,
      emailVerified: 1,
      status: 'active'
    });

    let resBody = null;
    let resStatus = null;
    let cookieData = null;
    const req = {
      body: { email: 'alice@example.com', password: 'SecurePassword123!' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'TestAgent/1.0' }
    };
    const res = {
      status(code) {
        resStatus = code;
        return this;
      },
      json(body) {
        resBody = body;
        return this;
      },
      cookie(name, val, opts) {
        cookieData = { name, val, opts };
      }
    };

    await customerAuthController.login(req, res);

    assert.strictEqual(resStatus, 200, `Expected 200 but got ${resStatus}`);
    assert.ok(resBody.accessToken, 'Access token should be present');
    assert.strictEqual(resBody.customer.email, 'alice@example.com');
    assert.strictEqual(resBody.customer.firstName, 'Alice');
    assert.ok(cookieData, 'Refresh token cookie should be set');
  });

  // ── 2. Customer login with incorrect password ──────────────────────────────
  it('2. Customer login returns 401 on incorrect password and tracks failed attempts', async () => {
    const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);
    await CustomerAccount.create({
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@example.com',
      password: hashedPassword,
      status: 'active'
    });

    let resBody = null;
    let resStatus = null;
    const req = {
      body: { email: 'bob@example.com', password: 'WrongPassword!' },
      ip: '127.0.0.1',
      headers: {}
    };
    const res = {
      status(code) {
        resStatus = code;
        return this;
      },
      json(body) {
        resBody = body;
        return this;
      }
    };

    await customerAuthController.login(req, res);

    assert.strictEqual(resStatus, 401);
    assert.strictEqual(resBody.message, 'Invalid email or password.');

    const updated = await CustomerAccount.findOne({ email: 'bob@example.com' });
    assert.strictEqual(updated.failedLoginAttempts, 1);
  });

  // ── 3. Customer login with nonexistent account ─────────────────────────────
  it('3. Customer login returns 401 for nonexistent account', async () => {
    let resBody = null;
    let resStatus = null;
    const req = {
      body: { email: 'nonexistent@example.com', password: 'AnyPassword123!' },
      ip: '127.0.0.1',
      headers: {}
    };
    const res = {
      status(code) {
        resStatus = code;
        return this;
      },
      json(body) {
        resBody = body;
        return this;
      }
    };

    await customerAuthController.login(req, res);

    assert.strictEqual(resStatus, 401);
    assert.strictEqual(resBody.message, 'Invalid email or password.');
  });

  // ── 4. Google login with valid verified credential ─────────────────────────
  it('4. Google login creates/signs in verified account and correctly writes google_id', async () => {
    const { OAuth2Client } = require('google-auth-library');
    const origVerify = OAuth2Client.prototype.verifyIdToken;

    OAuth2Client.prototype.verifyIdToken = async function () {
      return {
        getPayload: () => ({
          iss: 'https://accounts.google.com',
          sub: 'google-sub-998877',
          email: 'googleuser@ripomaglobal.org',
          email_verified: true,
          given_name: 'Google',
          family_name: 'Tester'
        })
      };
    };

    try {
      let resBody = null;
      let resStatus = null;
      let cookieData = null;
      const req = {
        body: { credential: 'mock-valid-google-credential' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'TestAgent/1.0' }
      };
      const res = {
        status(code) {
          resStatus = code;
          return this;
        },
        json(body) {
          resBody = body;
          return this;
        },
        cookie(name, val, opts) {
          cookieData = { name, val, opts };
        }
      };

      await customerAuthController.loginWithGoogle(req, res);

      assert.strictEqual(resStatus, 200, `Expected 200, got ${resStatus}: ${JSON.stringify(resBody)}`);
      assert.ok(resBody.accessToken);
      assert.strictEqual(resBody.customer.email, 'googleuser@ripomaglobal.org');
      assert.strictEqual(resBody.customer.hasGoogle, true);

      // Verify row in SQLite table customer_accounts
      const row = memDb.prepare("SELECT * FROM customer_accounts WHERE email = 'googleuser@ripomaglobal.org'").get();
      assert.ok(row, 'Row should exist in customer_accounts');
      assert.strictEqual(row.google_id, 'google-sub-998877');
    } finally {
      OAuth2Client.prototype.verifyIdToken = origVerify;
    }
  });

  // ── 5. Google login with invalid credential ────────────────────────────────
  it('5. Google login returns 401 GOOGLE_TOKEN_INVALID without ReferenceError on isProd', async () => {
    const { OAuth2Client } = require('google-auth-library');
    const origVerify = OAuth2Client.prototype.verifyIdToken;

    OAuth2Client.prototype.verifyIdToken = async function () {
      throw new Error('Invalid token signature');
    };

    try {
      let resBody = null;
      let resStatus = null;
      const req = {
        body: { credential: 'header.invalidpayload.signature' },
        ip: '127.0.0.1',
        headers: {}
      };
      const res = {
        status(code) {
          resStatus = code;
          return this;
        },
        json(body) {
          resBody = body;
          return this;
        }
      };

      await customerAuthController.loginWithGoogle(req, res);

      assert.strictEqual(resStatus, 401, `Expected 401, got ${resStatus}`);
      assert.strictEqual(resBody.code, 'GOOGLE_TOKEN_INVALID');
      assert.strictEqual(resBody.message, 'Invalid Google credential.');
    } finally {
      OAuth2Client.prototype.verifyIdToken = origVerify;
    }
  });

  // ── 6. Google login with missing credential ────────────────────────────────
  it('6. Google login returns 400 when credential is missing', async () => {
    let resBody = null;
    let resStatus = null;
    const req = { body: {}, ip: '127.0.0.1', headers: {} };
    const res = {
      status(code) {
        resStatus = code;
        return this;
      },
      json(body) {
        resBody = body;
        return this;
      }
    };

    await customerAuthController.loginWithGoogle(req, res);

    assert.strictEqual(resStatus, 400);
    assert.strictEqual(resBody.message, 'Google credential is required.');
  });

  // ── 7. Existing account matching and duplicate prevention ──────────────────
  it('7. Google login links to existing account without duplicating or hijacking', async () => {
    const { OAuth2Client } = require('google-auth-library');
    const origVerify = OAuth2Client.prototype.verifyIdToken;

    // First create account with password
    const hashedPassword = await bcrypt.hash('ExistingPass123!', 10);
    await CustomerAccount.create({
      firstName: 'Existing',
      lastName: 'User',
      email: 'linkme@ripomaglobal.org',
      password: hashedPassword,
      status: 'active'
    });

    OAuth2Client.prototype.verifyIdToken = async function () {
      return {
        getPayload: () => ({
          iss: 'https://accounts.google.com',
          sub: 'google-sub-unique-111',
          email: 'linkme@ripomaglobal.org',
          email_verified: true,
          given_name: 'Existing',
          family_name: 'User'
        })
      };
    };

    try {
      let resBody = null;
      let resStatus = null;
      const req = {
        body: { credential: 'mock-google-token' },
        ip: '127.0.0.1',
        headers: {}
      };
      const res = {
        status(code) {
          resStatus = code;
          return this;
        },
        json(body) {
          resBody = body;
          return this;
        },
        cookie() {}
      };

      await customerAuthController.loginWithGoogle(req, res);
      assert.strictEqual(resStatus, 200);

      // Verify no duplicate row
      const count = memDb.prepare("SELECT COUNT(*) AS c FROM customer_accounts WHERE email = 'linkme@ripomaglobal.org'").get().c;
      assert.strictEqual(count, 1, 'Duplicate account must not be created');

      // Now attempt sign-in with a DIFFERENT google sub for the same email
      OAuth2Client.prototype.verifyIdToken = async function () {
        return {
          getPayload: () => ({
            iss: 'https://accounts.google.com',
            sub: 'different-hijack-sub-222',
            email: 'linkme@ripomaglobal.org',
            email_verified: true,
            given_name: 'Hacker',
            family_name: 'Attempt'
          })
        };
      };

      let failStatus = null;
      let failBody = null;
      const failRes = {
        status(code) {
          failStatus = code;
          return this;
        },
        json(body) {
          failBody = body;
          return this;
        }
      };

      await customerAuthController.loginWithGoogle(req, failRes);
      assert.strictEqual(failStatus, 409, 'Must reject account linking conflict');
      assert.strictEqual(failBody.message, 'This email is already linked to a different Google account.');
    } finally {
      OAuth2Client.prototype.verifyIdToken = origVerify;
    }
  });

  // ── 8. Customer account INSERT and UPDATE statements ───────────────────────
  it('8. CustomerAccount create, find, updateOne, and save operate cleanly on google_id', async () => {
    const acc = await CustomerAccount.create({
      firstName: 'Test',
      lastName: 'Insert',
      email: 'testinsert@example.com',
      googleId: 'google-sub-555',
      status: 'active'
    });

    assert.ok(acc._id);
    assert.strictEqual(acc.googleId, 'google-sub-555');

    // Retrieve via findOne
    const found = await CustomerAccount.findOne({ googleId: 'google-sub-555' });
    assert.ok(found, 'Should find customer by googleId');
    assert.strictEqual(found.email, 'testinsert@example.com');
    assert.strictEqual(found.googleId, 'google-sub-555');

    // Update via updateOne
    await CustomerAccount.updateOne(
      { _id: found._id },
      { $set: { lastName: 'UpdatedLast' } }
    );

    const reloaded = await CustomerAccount.findById(found._id);
    assert.strictEqual(reloaded.lastName, 'UpdatedLast');
    assert.strictEqual(reloaded.googleId, 'google-sub-555');

    // Save should not throw on google column
    reloaded.firstName = 'SavedFirst';
    await reloaded.save();

    const afterSave = await CustomerAccount.findById(found._id);
    assert.strictEqual(afterSave.firstName, 'SavedFirst');
  });

  // ── 9. Activity log INSERT and UPDATE statements ───────────────────────────
  it('9. ActivityLog create and update operate cleanly without missing updated_at errors', async () => {
    const log = await ActivityLog.create({
      actorName: 'Admin Tester',
      actorRole: 'admin',
      action: 'created',
      module: 'users',
      entityType: 'User',
      description: 'Created a new user'
    });

    assert.ok(log._id);
    assert.strictEqual(log.action, 'created');
    assert.strictEqual(log.module, 'users');

    // Verify row in SQLite
    const row = memDb.prepare('SELECT * FROM activity_logs WHERE id = ?').get(log._id);
    assert.ok(row, 'ActivityLog row should exist in SQLite');
    assert.strictEqual(row.action, 'created');

    // UpdateOne on ActivityLog should not throw
    await ActivityLog.updateOne({ _id: log._id }, { $set: { description: 'Updated description' } });
    const updatedRow = memDb.prepare('SELECT * FROM activity_logs WHERE id = ?').get(log._id);
    assert.strictEqual(updatedRow.description, 'Updated description');
  });

  // ── 10. Database schema migration ──────────────────────────────────────────
  it('10. Database schema migration 0001_activity_logs_updated_at.sql executes safely', () => {
    const migrationFile = path.join(rootDir, 'd1/migrations/0001_activity_logs_updated_at.sql');
    assert.ok(fs.existsSync(migrationFile), 'Migration file must exist');

    const migrationSql = fs.readFileSync(migrationFile, 'utf8');
    assert.ok(migrationSql.includes('ALTER TABLE activity_logs ADD COLUMN updated_at TEXT;'));

    // Test executing migration on a table without updated_at
    const testDb = new DatabaseSync(':memory:');
    testDb.exec(`
      CREATE TABLE activity_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        created_at TEXT
      );
      INSERT INTO activity_logs (id, action, module, created_at) VALUES ('log-1', 'create', 'auth', '2026-10-21');
    `);

    // Execute migration
    testDb.exec(migrationSql);

    // Verify column exists and data preserved
    const row = testDb.prepare('SELECT * FROM activity_logs WHERE id = ?').get('log-1');
    assert.strictEqual(row.action, 'create');
    assert.strictEqual(row.updated_at, null);
  });

  // ── 11. Refresh-token flow ─────────────────────────────────────────────────
  it('11. Customer refresh-token flow rotates token and returns new accessToken', async () => {
    const customer = await CustomerAccount.create({
      firstName: 'Session',
      lastName: 'User',
      email: 'session@example.com',
      status: 'active'
    });

    const session = await CustomerSession.create({
      customerAccount: customer._id,
      refreshTokenHash: 'pending',
      userAgent: 'TestBrowser',
      ip: '127.0.0.1',
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    const { hashToken } = require('../utils/customerTokenHash');
    const refreshToken = jwt.sign(
      { id: customer._id, type: 'customer', sid: String(session._id) },
      process.env.CUSTOMER_JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    session.refreshTokenHash = hashToken(refreshToken);
    await session.save();

    // Advance clock by 1s so rotating JWT has different iat
    await new Promise((r) => setTimeout(r, 1100));

    let resBody = null;
    let resStatus = null;
    let newCookie = null;
    const req = {
      cookies: { customerRefreshToken: refreshToken },
      ip: '127.0.0.1',
      headers: {}
    };
    const res = {
      status(code) {
        resStatus = code;
        return this;
      },
      json(body) {
        resBody = body;
        return this;
      },
      cookie(name, val, opts) {
        newCookie = { name, val, opts };
      },
      clearCookie() {}
    };

    await customerAuthController.refresh(req, res);

    assert.strictEqual(resStatus, 200);
    assert.strictEqual(resBody.authenticated, true);
    assert.ok(resBody.accessToken);
    assert.ok(newCookie);
    assert.notStrictEqual(newCookie.val, refreshToken, 'Refresh token must be rotated');
  });

  // ── 12. Frontend handling of authentication errors ─────────────────────────
  it('12. Authentication error formats match frontend expectations', async () => {
    // Missing body returns 400 with message
    let status400, body400;
    await customerAuthController.login(
      { body: {}, ip: '127.0.0.1', headers: {} },
      {
        status: (s) => ({ json: (b) => { status400 = s; body400 = b; } }),
        cookie() {},
        clearCookie() {}
      }
    );
    assert.strictEqual(status400, 400);
    assert.strictEqual(body400.message, 'Email and password are required.');

    // Locked account returns 423
    const lockedCust = await CustomerAccount.create({
      firstName: 'Locked',
      lastName: 'User',
      email: 'locked@example.com',
      password: await bcrypt.hash('pass123', 10),
      lockUntil: new Date(Date.now() + 10 * 60 * 1000),
      status: 'active'
    });

    let status423, body423;
    await customerAuthController.login(
      { body: { email: 'locked@example.com', password: 'pass123' }, ip: '127.0.0.1', headers: {} },
      {
        status: (s) => ({ json: (b) => { status423 = s; body423 = b; } }),
        cookie() {},
        clearCookie() {}
      }
    );
    assert.strictEqual(status423, 423);
    assert.ok(body423.message.includes('Account temporarily locked'));
  });

  // ── 13. Worker proxy behavior & D1 gateway ─────────────────────────────────
  it('13. Worker proxy /internal/d1 authenticates and executes queries', async () => {
    const workerModule = (await import('../../worker/src/proxy.js')).default;

    // Test unauthorized without secret
    const unauthorizedReq = new Request('https://worker.local/internal/d1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: 'SELECT 1' })
    });
    const unauthorizedRes = await workerModule.fetch(unauthorizedReq, {
      D1_INTERNAL_SECRET: 'super-secret'
    });
    assert.strictEqual(unauthorizedRes.status, 401);

    // Test query execution with valid secret
    const mockDb = {
      prepare(sql) {
        return {
          bind(...params) {
            return this;
          },
          async all() {
            return { results: [{ ok: 1 }], success: true, meta: { changes: 0 } };
          }
        };
      }
    };
    const validReq = new Request('https://worker.local/internal/d1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-D1-Secret': 'super-secret'
      },
      body: JSON.stringify({ sql: 'SELECT 1 AS ok' })
    });
    const validRes = await workerModule.fetch(validReq, {
      D1_INTERNAL_SECRET: 'super-secret',
      ripoma_db: mockDb
    });
    assert.strictEqual(validRes.status, 200);
    const body = await validRes.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.result[0].results[0].ok, 1);
  });

  // ── 14. CORS configuration for production frontend ─────────────────────────
  it('14. CORS correctly allows production frontend origins and denies unknown origins', async () => {
    const workerModule = (await import('../../worker/src/proxy.js')).default;

    // Test OPTIONS from production origin
    const prodReq = new Request('https://worker.local/api/test', {
      method: 'OPTIONS',
      headers: { Origin: 'https://ripomaglobal.org' }
    });
    const prodRes = await workerModule.fetch(prodReq, {});
    assert.strictEqual(prodRes.status, 204);
    assert.strictEqual(prodRes.headers.get('Access-Control-Allow-Origin'), 'https://ripomaglobal.org');

    // Test OPTIONS from Pages domain
    const pagesReq = new Request('https://worker.local/api/test', {
      method: 'OPTIONS',
      headers: { Origin: 'https://ripoma-global.pages.dev' }
    });
    const pagesRes = await workerModule.fetch(pagesReq, {});
    assert.strictEqual(pagesRes.headers.get('Access-Control-Allow-Origin'), 'https://ripoma-global.pages.dev');

    // Test OPTIONS from untrusted origin
    const evilReq = new Request('https://worker.local/api/test', {
      method: 'OPTIONS',
      headers: { Origin: 'https://malicious-site.com' }
    });
    const evilRes = await workerModule.fetch(evilReq, {});
    assert.strictEqual(evilRes.headers.get('Access-Control-Allow-Origin'), null);
  });
});
