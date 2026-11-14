/**
 * Export MongoDB collections to SQL files for Cloudflare D1.
 *
 * Reads every collection listed in d1/mapping.mjs and writes one INSERT-statement
 * .sql file per table into d1/export/. Apply them with:
 *
 *   npx wrangler d1 execute ripoma-db --remote --file=d1/export/<table>.sql
 *
 * Conventions:
 *   - Mongo ObjectIds are stored as 24-char hex TEXT primary/foreign keys,
 *     so all cross-references survive the export unchanged.
 *   - Dates become ISO-8601 TEXT, booleans become INTEGER 0/1.
 *   - Nested objects/arrays are serialized into JSON TEXT columns.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... node scripts/export-mongo-to-d1.mjs [collection ...]
 */

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAPPINGS } from '../d1/mapping.mjs';

const require = createRequire(import.meta.url);
// Reuse the server's mongoose install so driver versions always match.
const mongoose = require('../server/node_modules/mongoose');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'd1', 'export');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ripoma_global';
const BATCH_SIZE = 50; // rows per INSERT statement

const sqlLiteral = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replace(/'/g, "''")}'`;
};

const toCell = (value) => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value._bsontype === 'ObjectId') return value.toHexString();
  return value;
};

const snakeCase = (s) => s.replace(/([A-Z])/g, '_$1').toLowerCase();

/** Build {column -> {path, json}} from a mapping's fields/refs/json lists. */
const columnPlan = (mapping) => {
  const plan = { id: { path: '_id', json: false } };
  for (const field of mapping.fields || []) {
    plan[snakeCase(field)] = { path: field, json: false };
  }
  for (const ref of mapping.refs || []) {
    plan[`${snakeCase(ref)}_id`] = { path: ref, json: false };
  }
  for (const field of mapping.json || []) {
    plan[snakeCase(field)] = { path: field, json: true };
  }
  return plan;
};

const toJsonText = (raw) =>
  raw === null || raw === undefined
    ? null
    : JSON.stringify(raw, (_k, v) =>
        v && typeof v === 'object' && v._bsontype === 'ObjectId' ? v.toHexString() : v
      );

const rowFor = (doc, plan) => {
  const cells = {};
  for (const [column, { path, json }] of Object.entries(plan)) {
    const raw = doc[path];
    cells[column] = json ? toJsonText(raw) : toCell(raw);
  }
  return cells;
};

const exportCollection = async (db, mapping) => {
  const docs = await db.collection(mapping.collection).find({}).toArray();
  if (!docs.length) {
    console.log(`- ${mapping.collection}: empty, skipped`);
    return;
  }

  const plan = columnPlan(mapping);
  const columns = Object.keys(plan);
  const statements = [];

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const tuples = batch
      .map((doc) => {
        const cells = rowFor(doc, plan);
        return `(${columns.map((c) => sqlLiteral(cells[c])).join(', ')})`;
      })
      .join(',\n');
    statements.push(
      `INSERT OR REPLACE INTO ${mapping.table} (${columns.join(', ')}) VALUES\n${tuples};`
    );
  }

  const file = path.join(OUT_DIR, `${mapping.table}.sql`);
  await writeFile(file, `${statements.join('\n\n')}\n`, 'utf8');
  console.log(`- ${mapping.collection}: ${docs.length} rows -> d1/export/${mapping.table}.sql`);
};

const main = async () => {
  const only = process.argv.slice(2);
  const mappings = only.length
    ? MAPPINGS.filter((m) => only.includes(m.collection) || only.includes(m.table))
    : MAPPINGS;

  if (!mappings.length) {
    console.error(`No mappings matched: ${only.join(', ')}`);
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Connecting to ${MONGODB_URI.replace(/\/\/[^@]*@/, '//***@')} ...`);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  for (const mapping of mappings) {
    await exportCollection(db, mapping);
  }

  await mongoose.disconnect();
  console.log('\nDone. Apply files in dependency order (see d1/mapping.mjs) with:');
  console.log('  npx wrangler d1 execute ripoma-db --remote --file=d1/export/<table>.sql');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
