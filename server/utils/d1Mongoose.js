/**
 * Drop-in Mongoose replacement backed by Cloudflare D1.
 *
 * Loaded from server.js BEFORE any model file. When DATA_BACKEND=d1 it patches
 * mongoose.model / mongoose.connect so existing controllers keep working.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const d1 = require('./d1');

const USE_D1 = String(process.env.DATA_BACKEND || '').toLowerCase() === 'd1';

const TABLE_BY_MODEL = {
  Counter: 'counters',
  Role: 'roles',
  User: 'users',
  Settings: 'settings',
  ExchangeRate: 'exchange_rates',
  Category: 'categories',
  Warehouse: 'warehouses',
  Supplier: 'suppliers',
  Customer: 'customers',
  Product: 'products',
  InventoryItem: 'inventory_items',
  StockMovement: 'stock_movements',
  ImportOrder: 'import_orders',
  GoodsReceipt: 'goods_receipts',
  ExportOrder: 'export_orders',
  Dispatch: 'dispatches',
  Invoice: 'invoices',
  Expense: 'expenses',
  Payment: 'payments',
  TaxDutyRecord: 'tax_duty_records',
  CustomerAccount: 'customer_accounts',
  CustomerSession: 'customer_sessions',
  Coupon: 'coupons',
  StorefrontOrder: 'storefront_orders',
  ProductReview: 'product_reviews',
  SupportTicket: 'support_tickets',
  Document: 'documents',
  DocumentActivity: 'document_activities',
  Notification: 'notifications',
  CustomerNotification: 'customer_notifications',
  NotificationPreference: 'notification_preferences',
  NotificationDigestQueue: 'notification_digest_queues',
  ActivityLog: 'activity_logs',
  Reminder: 'reminders',
  CommunicationLog: 'communication_logs',
  ReportDefinition: 'report_definitions',
  ScheduledReport: 'scheduled_reports',
  ReportExport: 'report_exports'
};

const REF_TABLE = {
  parent: 'categories',
  category: 'categories',
  supplier: 'suppliers',
  warehouse: 'warehouses',
  product: 'products',
  manager: 'users',
  createdBy: 'users',
  performedBy: 'users',
  receivedBy: 'users',
  dispatchedBy: 'users',
  recordedBy: 'users',
  uploadedBy: 'users',
  lastDownloadedBy: 'users',
  lastRunBy: 'users',
  generatedBy: 'users',
  approvedBy: 'users',
  submittedBy: 'users',
  actor: 'users',
  recipient: 'users',
  user: 'users',
  customer: 'customer_accounts',
  customerAccount: 'customer_accounts',
  linkedCustomer: 'customers',
  importOrder: 'import_orders',
  exportOrder: 'export_orders',
  relatedOrder: 'storefront_orders',
  invoice: 'invoices',
  expense: 'expenses',
  shipment: 'dispatches',
  document: 'documents',
  notification: 'notifications',
  reportDefinition: 'report_definitions',
  scheduledReport: 'scheduled_reports',
  loggedBy: 'users'
};

const JSON_FIELDS = new Set([
  'permissions', 'value', 'rates', 'address', 'shippingAddress', 'billingAddress',
  'tags', 'contacts', 'bankDetails', 'documents', 'images', 'dimensions', 'faqs',
  'items', 'deliveryAddress', 'approvals', 'linkedEntities', 'previousVersions',
  'messages', 'channels', 'typeOverrides', 'metadata', 'assignedTo', 'recurrence',
  'attachments', 'config', 'recipients', 'couponSnapshot', 'contact', 'riskFlags',
  'statusHistory', 'shipmentUpdates', 'notificationPrefs', 'timeline',
  'originAddress', 'destinationAddress', 'companyDetails'
]);

const BOOL_FIELDS = new Set([
  'deleted', 'isFeatured', 'isConfidential', 'isDeleted', 'isLatestVersion',
  'isExpired', 'expiryAlertSent', 'dueAlertSent', 'isOverdue', 'emailVerified',
  'verifiedPurchase', 'active', 'isRead', 'isDismissed', 'inAppEnabled',
  'emailEnabled', 'quietHoursEnabled', 'sent', 'isShared', 'isFavourite',
  'isActive', 'followUpDone', 'stockDeductedOnConfirm'
]);

const TABLES_WITHOUT_UPDATED_AT = new Set([
  'activity_logs',
  'counters',
  'roles',
  'stock_movements',
  'document_activities',
  'notifications',
  'customer_notifications',
  'notification_digest_queues'
]);

const TABLES_WITHOUT_CREATED_AT = new Set([
  'counters'
]);

const toSnake = (key) => {
  if (key === '_id' || key === 'id') return 'id';
  if (key === 'google' || key === 'googleId') return 'google_id';
  if (REF_TABLE[key]) return `${key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)}_id`.replace(/^_/, '');
  return key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
};

const toCamel = (key) => {
  if (key === 'id') return '_id';
  if (key.endsWith('_id')) {
    const base = key.slice(0, -3).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (REF_TABLE[base]) return base;
  }
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
};

const scalar = (value) => {
  if (value == null) return value;
  if (typeof value === 'object' && value._bsontype === 'ObjectId') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && typeof value.toHexString === 'function') return value.toHexString();
  return value;
};

const parseJson = (text, fallback) => {
  if (text == null || text === '') return fallback;
  if (typeof text !== 'string') return text;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

const rowToDoc = (row, table) => {
  if (!row) return null;
  const doc = {};
  for (const [col, raw] of Object.entries(row)) {
    const key = toCamel(col);
    if (JSON_FIELDS.has(key) || (typeof raw === 'string' && (raw.startsWith('[') || raw.startsWith('{')))) {
      doc[key] = parseJson(raw, raw);
    } else if (BOOL_FIELDS.has(key)) {
      doc[key] = raw === 1 || raw === true;
    } else {
      doc[key] = raw;
    }
  }
  if (row.id && !doc._id) doc._id = row.id;
  if (table === 'customer_accounts') {
    delete doc.google;
  }
  return doc;
};

const compileFilter = (filter, params) => {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return '1=1';
  const keys = Object.keys(filter);
  if (!keys.length) return '1=1';

  const parts = [];
  for (const key of keys) {
    const value = filter[key];
    if (key === '$or' && Array.isArray(value)) {
      const inner = value.map((v) => `(${compileFilter(v, params)})`).join(' OR ');
      parts.push(`(${inner || '1=1'})`);
      continue;
    }
    if (key === '$and' && Array.isArray(value)) {
      const inner = value.map((v) => `(${compileFilter(v, params)})`).join(' AND ');
      parts.push(`(${inner || '1=1'})`);
      continue;
    }

    if (key.includes('.')) {
      const [jsonCol, ...path] = key.split('.');
      const col = toSnake(jsonCol);
      const jsonPath = `$.${path.join('.')}`;
      if (value && typeof value === 'object' && '$in' in value) {
        const placeholders = value.$in.map((v) => {
          params.push(String(scalar(v)));
          return '?';
        });
        parts.push(
          `EXISTS (SELECT 1 FROM json_each(${col}) WHERE json_extract(value, '${jsonPath}') IN (${placeholders.join(',')}) OR json_extract(${col}, '${jsonPath}') IN (${placeholders.join(',')}))`
        );
      } else {
        params.push(String(scalar(value)));
        parts.push(
          `(json_extract(${col}, '${jsonPath}') = ? OR EXISTS (SELECT 1 FROM json_each(${col}) WHERE json_extract(value, '${jsonPath}') = ?))`
        );
        params.push(String(scalar(value)));
      }
      continue;
    }

    const col = toSnake(key);

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !value._bsontype) {
      if ('$in' in value) {
        const arr = value.$in || [];
        if (!arr.length) {
          parts.push('0=1');
        } else {
          parts.push(`${col} IN (${arr.map((v) => {
            params.push(scalar(v));
            return '?';
          }).join(',')})`);
        }
      }
      if ('$nin' in value) {
        const arr = value.$nin || [];
        if (arr.length) {
          parts.push(`${col} NOT IN (${arr.map((v) => {
            params.push(scalar(v));
            return '?';
          }).join(',')})`);
        }
      }
      if ('$ne' in value) {
        const v = scalar(value.$ne);
        if (v === true || v === 1) parts.push(`COALESCE(${col}, 0) = 0`);
        else if (v === false || v === 0) parts.push(`${col} = 1`);
        else {
          parts.push(`${col} IS NOT ?`);
          params.push(v);
        }
      }
      if ('$gte' in value) {
        parts.push(`${col} >= ?`);
        params.push(scalar(value.$gte));
      }
      if ('$lte' in value) {
        parts.push(`${col} <= ?`);
        params.push(scalar(value.$lte));
      }
      if ('$gt' in value) {
        parts.push(`${col} > ?`);
        params.push(scalar(value.$gt));
      }
      if ('$lt' in value) {
        parts.push(`${col} < ?`);
        params.push(scalar(value.$lt));
      }
      if ('$regex' in value) {
        const rx = String(value.$regex).replace(/^\^/, '').replace(/\$$/, '');
        params.push(`%${rx}%`);
        parts.push(`${col} LIKE ?`);
      }
      if ('$exists' in value) {
        parts.push(value.$exists ? `${col} IS NOT NULL AND ${col} != ''` : `(${col} IS NULL OR ${col} = '')`);
      }
      continue;
    }

    const v = scalar(value);
    if (typeof v === 'boolean') {
      parts.push(`${col} = ?`);
      params.push(v ? 1 : 0);
    } else {
      parts.push(`${col} = ?`);
      params.push(v);
    }
  }

  return parts.filter(Boolean).join(' AND ') || '1=1';
};

const wrapDoc = (plain, model) => {
  if (!plain) return null;
  const doc = Object.assign({}, plain);
  doc._id = doc._id || doc.id;
  doc.id = doc._id;
  doc.toObject = () => {
    const o = { ...doc };
    delete o.toObject;
    delete o.save;
    delete o.comparePassword;
    return o;
  };
  doc.save = async function save() {
    return model._save(this);
  };
  if (model.modelName === 'User' || model.modelName === 'CustomerAccount') {
    doc.comparePassword = async function comparePassword(candidate) {
      if (!this.password || candidate == null || candidate === '') return false;
      return bcrypt.compare(candidate, this.password);
    };
  }
  return doc;
};

class Query {
  constructor(model, filter = {}, single = false) {
    this.model = model;
    this.filter = filter;
    this.single = single;
    this._sort = null;
    this._limit = null;
    this._skip = 0;
    this._populate = [];
    this._select = null;
    this._lean = false;
  }

  populate(field, select) {
    if (field && typeof field === 'object') {
      this._populate.push(field);
    } else if (field) {
      this._populate.push({ path: field, select });
    }
    return this;
  }

  sort(obj) {
    this._sort = obj;
    return this;
  }

  skip(n) {
    this._skip = Number(n) || 0;
    return this;
  }

  limit(n) {
    this._limit = Number(n);
    return this;
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }

  async exec() {
    const params = [];
    const where = compileFilter(this.filter, params);
    let order = '';
    if (this._sort) {
      const bits = Object.entries(this._sort).map(([k, dir]) => {
        const col = toSnake(k);
        return `${col} ${dir === -1 || dir === 'desc' ? 'DESC' : 'ASC'}`;
      });
      if (bits.length) order = ` ORDER BY ${bits.join(', ')}`;
    }
    let limit = '';
    if (this.single) limit = ' LIMIT 1';
    else if (this._limit != null) {
      limit = ` LIMIT ${Number(this._limit)}`;
      if (this._skip) limit += ` OFFSET ${Number(this._skip)}`;
    } else if (this._skip) {
      limit = ` LIMIT -1 OFFSET ${Number(this._skip)}`;
    }

    const sql = `SELECT * FROM ${this.model.table} WHERE ${where}${order}${limit}`;
    const rows = await d1.all(sql, params);
    let docs = rows.map((r) => rowToDoc(r, this.model.table));

    if (this._select) {
      const raw = String(this._select);
      const omit = raw.startsWith('-');
      const fields = raw.replace(/^-/, '').split(/\s+/).filter(Boolean);
      if (omit) {
        docs = docs.map((d) => {
          const copy = { ...d };
          fields.forEach((f) => {
            delete copy[f];
          });
          return copy;
        });
      }
    }

    for (const pop of this._populate) {
      const path = pop.path || pop;
      const table = REF_TABLE[path];
      if (!table) continue;
      const ids = [...new Set(docs.map((d) => d[path]).filter(Boolean).map(String))];
      if (!ids.length) {
        docs = docs.map((d) => ({ ...d, [path]: d[path] ? { _id: d[path] } : null }));
        continue;
      }
      const placeholders = ids.map(() => '?').join(',');
      const related = await d1.all(`SELECT * FROM ${table} WHERE id IN (${placeholders})`, ids);
      const map = new Map(related.map((r) => {
        const obj = rowToDoc(r, table);
        obj._id = obj._id || r.id;
        return [String(r.id), obj];
      }));
      const selectFields = pop.select ? String(pop.select).split(/\s+/).filter(Boolean) : null;
      docs = docs.map((d) => {
        const rel = map.get(String(d[path]));
        if (!rel) return d;
        let shaped = { ...rel, _id: rel._id };
        if (selectFields) {
          const next = { _id: shaped._id };
          selectFields.forEach((f) => {
            if (f !== '_id') next[f] = shaped[f];
          });
          shaped = next;
        }
        return { ...d, [path]: shaped };
      });
    }

    if (this.single) {
      const one = docs[0] || null;
      if (!one) return null;
      return this._lean ? one : wrapDoc(one, this.model);
    }
    return this._lean ? docs : docs.map((d) => wrapDoc(d, this.model));
  }
}

function createD1Model(name) {
  const table = TABLE_BY_MODEL[name];
  if (!table) {
    throw new Error(`[D1] No table mapping for model ${name}`);
  }

  const model = {
    modelName: name,
    table,
    schema: { paths: {} }
  };

  model.find = (filter = {}) => new Query(model, filter, false);
  model.findOne = (filter = {}) => new Query(model, filter, true);
  model.findById = (id) => new Query(model, { _id: String(id) }, true);

  model.countDocuments = async (filter = {}) => {
    const params = [];
    const where = compileFilter(filter, params);
    const row = await d1.first(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`, params);
    return row?.n || 0;
  };

  model.exists = async (filter = {}) => {
    const found = await model.findOne(filter).select('_id').lean();
    return found ? { _id: found._id } : null;
  };

  model.distinct = async (field, filter = {}) => {
    const params = [];
    const where = compileFilter(filter, params);
    const col = toSnake(field);
    const rows = await d1.all(`SELECT DISTINCT ${col} AS v FROM ${table} WHERE ${where}`, params);
    return rows.map((r) => r.v).filter((v) => v != null && v !== '');
  };

  model._save = async (doc) => {
    const now = new Date().toISOString();
    const isNew = !doc._id;
    if (isNew) doc._id = crypto.randomBytes(12).toString('hex');

    const hasUpdatedAt = !TABLES_WITHOUT_UPDATED_AT.has(table);
    const hasCreatedAt = !TABLES_WITHOUT_CREATED_AT.has(table);

    if (hasUpdatedAt) {
      doc.updatedAt = now;
    } else {
      delete doc.updatedAt;
    }
    if (hasCreatedAt && !doc.createdAt) {
      doc.createdAt = now;
    } else if (!hasCreatedAt) {
      delete doc.createdAt;
    }

    if (table === 'customer_accounts') {
      if (doc.google !== undefined && doc.googleId === undefined) {
        doc.googleId = doc.google;
      }
      delete doc.google;
    }

    if ((name === 'User' || name === 'CustomerAccount') && doc.password && !String(doc.password).startsWith('$2')) {
      doc.password = await bcrypt.hash(doc.password, 12);
    }

    const skip = new Set(['toObject', 'save', 'comparePassword', 'id', '__v']);
    const cols = [];
    const vals = [];
    const seenCols = new Set();
    for (const [key, value] of Object.entries(doc)) {
      if (skip.has(key) || typeof value === 'function') continue;
      const col = toSnake(key === '_id' ? 'id' : key);
      if (!hasUpdatedAt && col === 'updated_at') continue;
      if (!hasCreatedAt && col === 'created_at') continue;
      if (seenCols.has(col)) continue;
      seenCols.add(col);
      cols.push(col);
      if (value == null) vals.push(null);
      else if (BOOL_FIELDS.has(key)) vals.push(value ? 1 : 0);
      else if (typeof value === 'object' && !(value instanceof Date)) vals.push(JSON.stringify(value));
      else vals.push(scalar(value));
    }

    if (!cols.includes('id')) {
      cols.unshift('id');
      vals.unshift(doc._id);
    }

    const placeholders = cols.map(() => '?').join(',');
    const updates = cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');
    await d1.run(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updates}`,
      vals
    );
    return wrapDoc(doc, model);
  };

  model.create = async (data) => {
    if (Array.isArray(data)) {
      const out = [];
      for (const item of data) out.push(await model._save({ ...item }));
      return out;
    }
    return model._save({ ...data });
  };

  model.updateOne = async (filter, update) => {
    const params = [];
    const where = compileFilter(filter, params);
    const sets = [];
    const setVals = [];
    const payload = update.$set || (update.$inc || update.$unset ? {} : update);
    if (update.$set) Object.assign(payload, update.$set);
    if (table === 'customer_accounts') {
      if (payload.google !== undefined && payload.googleId === undefined) {
        payload.googleId = payload.google;
      }
      delete payload.google;
    }
    for (const [key, value] of Object.entries(payload)) {
      if (key.startsWith('$')) continue;
      sets.push(`${toSnake(key)} = ?`);
      if (BOOL_FIELDS.has(key)) setVals.push(value ? 1 : 0);
      else if (typeof value === 'object' && value && !(value instanceof Date)) setVals.push(JSON.stringify(value));
      else setVals.push(scalar(value));
    }
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        sets.push(`${toSnake(key)} = COALESCE(${toSnake(key)}, 0) + ?`);
        setVals.push(Number(value) || 0);
      }
    }
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) {
        sets.push(`${toSnake(key)} = NULL`);
      }
    }
    if (!TABLES_WITHOUT_UPDATED_AT.has(table)) {
      sets.push('updated_at = ?');
      setVals.push(new Date().toISOString());
    }
    if (!sets.length) return { modifiedCount: 0 };
    const meta = await d1.run(
      `UPDATE ${table} SET ${sets.join(', ')} WHERE ${where}`,
      [...setVals, ...params]
    );
    return { modifiedCount: meta.changes || 0, acknowledged: true };
  };

  model.updateMany = model.updateOne;

  model.findByIdAndUpdate = async (id, update, options = {}) => {
    await model.updateOne({ _id: String(id) }, update);
    if (options.new === false) return model.findById(id);
    return model.findById(id);
  };

  model.findOneAndDelete = async (filter) => {
    const doc = await model.findOne(filter);
    if (!doc) return null;
    await d1.run(`DELETE FROM ${table} WHERE id = ?`, [String(doc._id)]);
    return doc;
  };

  model.findByIdAndDelete = (id) => model.findOneAndDelete({ _id: String(id) });

  model.deleteMany = async (filter = {}) => {
    const params = [];
    const where = compileFilter(filter, params);
    const meta = await d1.run(`DELETE FROM ${table} WHERE ${where}`, params);
    return { deletedCount: meta.changes || 0 };
  };

  model.aggregate = async (pipeline = []) => {
    const match = pipeline.find((s) => s.$match)?.$match || {};
    const group = pipeline.find((s) => s.$group)?.$group;
    const params = [];
    const where = compileFilter(match, params);
    if (!group) {
      return d1.all(`SELECT * FROM ${table} WHERE ${where}`, params).then((rows) =>
        rows.map((r) => rowToDoc(r, table))
      );
    }

    const idExpr = group._id;
    const select = [];
    if (idExpr == null) {
      select.push('NULL AS _id');
    } else if (typeof idExpr === 'string' && idExpr.startsWith('$')) {
      select.push(`${toSnake(idExpr.slice(1))} AS _id`);
    } else {
      select.push('NULL AS _id');
    }

    for (const [alias, expr] of Object.entries(group)) {
      if (alias === '_id') continue;
      if (expr.$sum === 1) select.push(`COUNT(*) AS ${alias}`);
      else if (typeof expr.$sum === 'string' && expr.$sum.startsWith('$')) {
        select.push(`SUM(${toSnake(expr.$sum.slice(1))}) AS ${alias}`);
      } else if (typeof expr.$avg === 'string' && expr.$avg.startsWith('$')) {
        select.push(`AVG(${toSnake(expr.$avg.slice(1))}) AS ${alias}`);
      } else if (typeof expr.$min === 'string' && expr.$min.startsWith('$')) {
        select.push(`MIN(${toSnake(expr.$min.slice(1))}) AS ${alias}`);
      } else if (typeof expr.$max === 'string' && expr.$max.startsWith('$')) {
        select.push(`MAX(${toSnake(expr.$max.slice(1))}) AS ${alias}`);
      }
    }

    const groupBy = idExpr && typeof idExpr === 'string' && idExpr.startsWith('$')
      ? ` GROUP BY ${toSnake(idExpr.slice(1))}`
      : '';
    return d1.all(
      `SELECT ${select.join(', ')} FROM ${table} WHERE ${where}${groupBy}`,
      params
    );
  };

  function D1Document(data = {}) {
    Object.assign(this, data);
    return wrapDoc(this, model);
  }

  D1Document.find = model.find;
  D1Document.findOne = model.findOne;
  D1Document.findById = model.findById;
  D1Document.countDocuments = model.countDocuments;
  D1Document.exists = model.exists;
  D1Document.distinct = model.distinct;
  D1Document.create = model.create;
  D1Document.updateOne = model.updateOne;
  D1Document.updateMany = model.updateMany;
  D1Document.findByIdAndUpdate = model.findByIdAndUpdate;
  D1Document.findOneAndDelete = model.findOneAndDelete;
  D1Document.findByIdAndDelete = model.findByIdAndDelete;
  D1Document.deleteMany = model.deleteMany;
  D1Document.aggregate = model.aggregate;
  D1Document.modelName = name;
  D1Document.schema = { paths: {}, index() {} };
  D1Document._save = model._save;
  D1Document.table = table;

  return D1Document;
}

if (USE_D1) {
  const originalModel = mongoose.model.bind(mongoose);
  const cache = {};
  mongoose.model = function patchedModel(name, schema) {
    if (!TABLE_BY_MODEL[name]) {
      console.warn(`[D1] Unmapped mongoose model ${name}; leaving on Mongo API (will fail).`);
      return originalModel(name, schema);
    }
    if (!cache[name]) cache[name] = createD1Model(name);
    return cache[name];
  };

  mongoose.connect = async () => {
    await d1.ping();
    console.log('[D1] Connected via Worker gateway / Cloudflare D1. MongoDB is not used.');
    return mongoose;
  };
  mongoose.disconnect = async () => mongoose;
  mongoose.connection = {
    readyState: 1,
    on() {},
    once() {}
  };
}

module.exports = { USE_D1, TABLE_BY_MODEL };
