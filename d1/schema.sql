-- Cloudflare D1 schema for Rippoma (ported from 38 Mongoose models).
--
-- Conventions:
--   id             TEXT PRIMARY KEY — 24-char Mongo ObjectId hex (survives export)
--   *_id           TEXT foreign keys referencing other tables' id
--   Dates          TEXT, ISO-8601
--   Booleans       INTEGER 0/1
--   Nested objects/arrays  TEXT containing JSON (columns suffixed with no marker;
--                          see comments). Query with SQLite json_* functions.
--   Enum values are documented in comments; not enforced with CHECK so legacy
--   data imports cleanly.
--
-- Apply:  npm run d1:schema:local   (or d1:schema:remote)
-- Tables are declared in dependency order; import data in the same order.

-- ── Core / auth ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS counters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  seq INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT,               -- JSON array<string>
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT,                  -- bcrypt hash; null for OAuth-only accounts
  role TEXT NOT NULL DEFAULT 'staff',    -- admin|manager|staff|viewer
  status TEXT NOT NULL DEFAULT 'active', -- active|inactive|suspended
  avatar TEXT,
  phone TEXT,
  department TEXT,
  permissions TEXT,               -- JSON array<string>
  last_login TEXT,
  password_reset_token TEXT,
  password_reset_expires TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,                     -- JSON (Mixed)
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  date TEXT NOT NULL,
  rates TEXT,                     -- JSON map currency->rate
  source TEXT DEFAULT 'openexchangerates',
  fetched_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(date);

-- ── Catalog / inventory ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  parent_id TEXT REFERENCES categories(id),
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,                   -- JSON {street, city, country, postalCode}
  manager_id TEXT REFERENCES users(id),
  capacity REAL,
  status TEXT NOT NULL DEFAULT 'active',  -- active|inactive
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  code TEXT UNIQUE,               -- SUP-#####
  type TEXT DEFAULT 'manufacturer',       -- manufacturer|distributor|trader|agent|other
  status TEXT DEFAULT 'active',           -- active|inactive|blacklisted
  country TEXT,
  website TEXT,
  tax_id TEXT,
  payment_terms TEXT,
  notes TEXT,
  address TEXT,                   -- JSON
  currency TEXT DEFAULT 'USD',
  lead_time_days REAL,
  rating REAL,
  tags TEXT,                      -- JSON array<string>
  contacts TEXT,                  -- JSON array<{name,title,email,phone,isPrimary}>
  bank_details TEXT,              -- JSON {bankName, accountNumber, swiftCode, iban}
  documents TEXT,                 -- JSON array<{name,url,uploadedAt}>
  created_by_id TEXT REFERENCES users(id),
  deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_suppliers_status_deleted ON suppliers(status, deleted);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_name ON suppliers(company_name);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  code TEXT UNIQUE,               -- CUS-#####
  type TEXT DEFAULT 'retailer',   -- retailer|wholesaler|distributor|end-user|government|other
  status TEXT DEFAULT 'active',   -- active|inactive|prospect|vip
  country TEXT,
  website TEXT,
  tax_id TEXT,
  payment_terms TEXT,
  notes TEXT,
  address TEXT,                   -- JSON
  shipping_address TEXT,          -- JSON
  currency TEXT DEFAULT 'USD',
  credit_limit REAL NOT NULL DEFAULT 0,
  outstanding_balance REAL NOT NULL DEFAULT 0,
  rating REAL,
  tags TEXT,                      -- JSON array<string>
  source TEXT,                    -- referral|direct|trade-show|online|other
  contacts TEXT,                  -- JSON array
  documents TEXT,                 -- JSON array
  created_by_id TEXT REFERENCES users(id),
  deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_customers_status_deleted ON customers(status, deleted);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT NOT NULL REFERENCES categories(id),
  unit TEXT DEFAULT 'pcs',        -- pcs|kg|g|l|ml|box|carton|roll|set
  unit_cost REAL NOT NULL DEFAULT 0,
  selling_price REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'LKR',
  images TEXT,                    -- JSON array<string>
  barcode TEXT,
  hs_code TEXT,
  country_of_origin TEXT,
  weight REAL,
  dimensions TEXT,                -- JSON {length, width, height}
  tags TEXT,                      -- JSON array<string>
  brand TEXT,
  faqs TEXT,                      -- JSON array<{question, answer}>
  is_featured INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',   -- active|inactive|discontinued
  supplier_id TEXT REFERENCES suppliers(id),
  low_stock_threshold REAL NOT NULL DEFAULT 10,
  reorder_quantity REAL NOT NULL DEFAULT 50,
  created_by_id TEXT REFERENCES users(id),
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category_id, status);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  quantity_on_hand REAL NOT NULL DEFAULT 0,
  quantity_reserved REAL NOT NULL DEFAULT 0,
  last_stock_check TEXT,
  batch_number TEXT,
  expiry_date TEXT,
  location TEXT,
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  type TEXT NOT NULL,             -- receive|issue|transfer_in|transfer_out|adjustment|return
  quantity REAL NOT NULL,
  quantity_before REAL,
  quantity_after REAL,
  reference TEXT,
  note TEXT,
  performed_by_id TEXT REFERENCES users(id),
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at);

-- ── Trade orders ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS import_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT UNIQUE,          -- PO-YYYY-#####
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  status TEXT DEFAULT 'draft',    -- draft|pending_approval|approved|ordered|in_transit|partially_received|received|cancelled
  priority TEXT DEFAULT 'normal', -- low|normal|high|urgent
  currency TEXT DEFAULT 'USD',
  exchange_rate REAL NOT NULL DEFAULT 1,
  items TEXT,                     -- JSON array<{product, description, quantityOrdered/Received, unitCost, discount, tax, lineTotal}>
  subtotal REAL,
  tax_total REAL,
  discount_total REAL,
  grand_total REAL,
  shipping_cost REAL NOT NULL DEFAULT 0,
  other_charges REAL NOT NULL DEFAULT 0,
  warehouse_id TEXT REFERENCES warehouses(id),
  shipping_method TEXT DEFAULT 'sea',  -- sea|air|road|rail|courier
  incoterms TEXT,                 -- EXW|FCA|FOB|CIF|DAP|DDP|other
  order_date TEXT,
  expected_delivery_date TEXT,
  actual_delivery_date TEXT,
  delivery_address TEXT,          -- JSON
  payment_status TEXT DEFAULT 'unpaid',  -- unpaid|partial|paid
  payment_terms TEXT,
  amount_paid REAL NOT NULL DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  tags TEXT,                      -- JSON array<string>
  documents TEXT,                 -- JSON array
  approvals TEXT,                 -- JSON array<{level, approver, action, comments, actionedAt}>
  created_by_id TEXT REFERENCES users(id),
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_import_orders_status ON import_orders(status);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id TEXT PRIMARY KEY,
  import_order_id TEXT NOT NULL REFERENCES import_orders(id),
  receipt_number TEXT UNIQUE,     -- GRN-YYYY-#####
  received_by_id TEXT REFERENCES users(id),
  received_at TEXT,
  warehouse_id TEXT REFERENCES warehouses(id),
  items TEXT,                     -- JSON array
  notes TEXT,
  documents TEXT,                 -- JSON array
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS export_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE,       -- SO-YYYY-#####
  customer_id TEXT NOT NULL REFERENCES customers(id),
  status TEXT DEFAULT 'draft',    -- draft|confirmed|processing|ready_to_ship|dispatched|in_transit|delivered|cancelled|returned
  priority TEXT DEFAULT 'normal',
  currency TEXT DEFAULT 'USD',
  exchange_rate REAL NOT NULL DEFAULT 1,
  items TEXT,                     -- JSON array
  subtotal REAL,
  tax_total REAL,
  discount_total REAL,
  grand_total REAL,
  shipping_charge REAL NOT NULL DEFAULT 0,
  other_charges REAL NOT NULL DEFAULT 0,
  warehouse_id TEXT REFERENCES warehouses(id),
  shipping_method TEXT DEFAULT 'sea',
  incoterms TEXT,
  payment_terms TEXT,
  payment_status TEXT DEFAULT 'unpaid',  -- unpaid|partial|paid
  amount_paid REAL NOT NULL DEFAULT 0,
  order_date TEXT,
  confirmed_date TEXT,
  requested_delivery_date TEXT,
  estimated_dispatch_date TEXT,
  stock_deducted_on_confirm INTEGER NOT NULL DEFAULT 0,
  billing_address TEXT,           -- JSON
  shipping_address TEXT,          -- JSON
  customer_reference TEXT,
  notes TEXT,
  internal_notes TEXT,
  tags TEXT,                      -- JSON array<string>
  documents TEXT,                 -- JSON array
  timeline TEXT,                  -- JSON array
  created_by_id TEXT REFERENCES users(id),
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_export_orders_status ON export_orders(status);

CREATE TABLE IF NOT EXISTS dispatches (
  id TEXT PRIMARY KEY,
  dispatch_number TEXT UNIQUE,    -- DSP-YYYY-#####
  export_order_id TEXT NOT NULL REFERENCES export_orders(id),
  status TEXT DEFAULT 'pending',  -- pending|handed_to_carrier|in_transit|out_for_delivery|delivered|failed|returned
  carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipping_method TEXT,           -- sea|air|road|rail|courier
  items TEXT,                     -- JSON array<{product, quantityDispatched}>
  dispatch_date TEXT,
  estimated_arrival TEXT,
  actual_arrival TEXT,
  origin_address TEXT,            -- JSON
  destination_address TEXT,       -- JSON
  weight REAL,
  volume REAL,
  number_of_packages REAL,
  notes TEXT,
  documents TEXT,                 -- JSON array
  dispatched_by_id TEXT REFERENCES users(id),
  created_at TEXT,
  updated_at TEXT
);

-- ── Finance ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE,     -- INV-YYYY-#####
  type TEXT DEFAULT 'commercial', -- proforma|commercial
  export_order_id TEXT NOT NULL REFERENCES export_orders(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  status TEXT DEFAULT 'draft',    -- draft|sent|viewed|paid|overdue|cancelled
  issue_date TEXT,
  due_date TEXT,
  paid_date TEXT,
  currency TEXT DEFAULT 'USD',
  subtotal REAL,
  tax_total REAL,
  discount_total REAL,
  grand_total REAL,
  amount_due REAL,
  shipping_charge REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  items TEXT,                     -- JSON array
  payment_instructions TEXT,
  notes TEXT,
  pdf_url TEXT,
  created_by_id TEXT REFERENCES users(id),
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  expense_number TEXT UNIQUE,     -- EXP-YYYY-#####
  title TEXT NOT NULL,
  category TEXT NOT NULL,         -- freight|customs_duty|import_tax|export_tax|port_charges|handling|insurance|inspection|certification|warehousing|packaging|bank_charges|currency_conversion|agent_fees|legal|audit|travel|utilities|salaries|office|marketing|other
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  exchange_rate REAL NOT NULL DEFAULT 1,
  amount_in_base_currency REAL,
  status TEXT DEFAULT 'draft',    -- draft|submitted|approved|rejected|paid
  payment_status TEXT DEFAULT 'unpaid',  -- unpaid|paid
  import_order_id TEXT REFERENCES import_orders(id),
  export_order_id TEXT REFERENCES export_orders(id),
  shipment_id TEXT,               -- legacy ref, no shipments table
  expense_date TEXT NOT NULL,
  vendor TEXT,
  invoice_reference TEXT,
  receipt_url TEXT,
  rejection_reason TEXT,
  approved_by_id TEXT REFERENCES users(id),
  approved_at TEXT,
  submitted_by_id TEXT REFERENCES users(id),
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT UNIQUE,     -- PAY-YYYY-#####
  type TEXT NOT NULL,             -- inbound|outbound
  status TEXT DEFAULT 'pending',  -- pending|completed|failed|cancelled|refunded
  import_order_id TEXT REFERENCES import_orders(id),
  export_order_id TEXT REFERENCES export_orders(id),
  invoice_id TEXT REFERENCES invoices(id),
  expense_id TEXT REFERENCES expenses(id),
  counterparty_type TEXT,         -- supplier|customer|bank|government|other
  counterparty_id TEXT,           -- polymorphic, no FK
  counterparty_name TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate REAL NOT NULL DEFAULT 1,
  amount_in_base_currency REAL,
  payment_method TEXT NOT NULL,   -- bank_transfer|cheque|cash|credit_card|letter_of_credit|other
  reference_number TEXT,
  bank_account TEXT,
  payment_date TEXT,
  due_date TEXT,
  is_overdue INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  attachments TEXT,               -- JSON array<{name,url}>
  recorded_by_id TEXT REFERENCES users(id),
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS tax_duty_records (
  id TEXT PRIMARY KEY,
  record_number TEXT UNIQUE,      -- TAX-YYYY-#####
  type TEXT NOT NULL,             -- import_duty|export_duty|vat|gst|excise|withholding_tax|customs_fee|other
  status TEXT DEFAULT 'pending',  -- pending|filed|paid|disputed|exempt
  import_order_id TEXT REFERENCES import_orders(id),
  export_order_id TEXT REFERENCES export_orders(id),
  shipment_id TEXT,               -- legacy ref, no shipments table
  country TEXT NOT NULL,
  hs_code TEXT,
  description TEXT,
  taxable_value REAL,
  rate REAL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  amount_in_base_currency REAL,
  due_date TEXT,
  filed_date TEXT,
  paid_date TEXT,
  due_alert_sent INTEGER NOT NULL DEFAULT 0,
  reference_number TEXT,
  notes TEXT,
  attachments TEXT,               -- JSON array
  recorded_by_id TEXT REFERENCES users(id),
  created_at TEXT,
  updated_at TEXT
);

-- ── Storefront ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_accounts (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password TEXT,                  -- bcrypt; nullable when google_id set
  google_id TEXT UNIQUE,
  company_name TEXT,
  company_details TEXT,
  shipping_address TEXT,          -- JSON
  billing_address TEXT,           -- JSON
  notification_prefs TEXT,        -- JSON
  status TEXT DEFAULT 'active',   -- active|inactive|suspended
  email_verified INTEGER NOT NULL DEFAULT 0,
  email_verification_token TEXT,
  email_verification_expires TEXT,
  password_reset_token TEXT,
  password_reset_expires TEXT,
  linked_customer_id TEXT REFERENCES customers(id),
  last_login TEXT,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  lock_until TEXT,
  privacy_consent_at TEXT,
  privacy_consent_version TEXT DEFAULT '',
  deleted_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_status ON customer_accounts(status);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id TEXT PRIMARY KEY,
  customer_account_id TEXT NOT NULL REFERENCES customer_accounts(id),
  refresh_token_hash TEXT NOT NULL,
  user_agent TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  last_active_at TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_account ON customer_sessions(customer_account_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_expires ON customer_sessions(expires_at);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,             -- percent|fixed|free_shipping
  value REAL NOT NULL DEFAULT 0,
  min_subtotal REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  max_uses INTEGER,
  max_uses_per_customer INTEGER DEFAULT 1,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS storefront_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,     -- WEB-YYYY-#####
  customer_account_id TEXT NOT NULL REFERENCES customer_accounts(id),
  items TEXT,                     -- JSON array<{product, sku, name, qty, unitPrice, lineTotal, image}>
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  shipping REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL,
  currency TEXT DEFAULT 'LKR',
  coupon_code TEXT,
  coupon_snapshot TEXT,           -- JSON {code, type, label}
  shipping_address TEXT,          -- JSON
  contact TEXT,                   -- JSON {email, phone, firstName, lastName}
  payment_method TEXT NOT NULL,   -- cod|bank_transfer|card_mock
  payment_status TEXT DEFAULT 'pending',  -- pending|awaiting_transfer|paid|failed
  order_status TEXT DEFAULT 'placed',     -- placed|confirmed|processing|shipped|delivered|cancellation_requested|cancelled
  customer_note TEXT DEFAULT '',
  payment_reference TEXT,
  risk_flags TEXT,                -- JSON array<string>
  placed_at TEXT,
  cancel_reason TEXT DEFAULT '',
  cancellation_requested_at TEXT,
  previous_status_before_cancel_request TEXT,
  tracking_number TEXT,
  carrier TEXT,
  tracking_url TEXT,
  estimated_delivery_date TEXT,
  actual_delivered_at TEXT,
  status_history TEXT,            -- JSON array<{status, note, at, byRole}>
  shipment_updates TEXT,          -- JSON array<{message, at, byRole}>
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_storefront_orders_account ON storefront_orders(customer_account_id);
CREATE INDEX IF NOT EXISTS idx_storefront_orders_status ON storefront_orders(order_status);

CREATE TABLE IF NOT EXISTS product_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  customer_id TEXT NOT NULL REFERENCES customer_accounts(id),
  rating REAL NOT NULL,
  title TEXT,
  comment TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending|approved|rejected
  verified_purchase INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(product_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON product_reviews(status, created_at);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,             -- inquiry|complaint|chat
  status TEXT DEFAULT 'open',     -- open|in_progress|resolved|closed
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'other',  -- shipping|order|product|billing|other
  customer_account_id TEXT REFERENCES customer_accounts(id),
  guest_name TEXT DEFAULT '',
  guest_email TEXT DEFAULT '',
  guest_phone TEXT DEFAULT '',
  related_order_id TEXT REFERENCES storefront_orders(id),
  messages TEXT,                  -- JSON array<{body, byRole, authorName, at}>
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_type ON support_tickets(type, created_at);

-- ── Documents ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  doc_number TEXT UNIQUE,         -- DOC-YYYY-#####
  name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  extension TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'other',  -- commercial_invoice|proforma_invoice|packing_list|bill_of_lading|airway_bill|certificate_of_origin|customs_declaration|insurance|delivery_receipt|purchase_order|sales_order|goods_receipt|supplier_contract|customer_contract|bank_document|tax_document|product_certificate|quality_report|warehouse_receipt|other
  tags TEXT,                      -- JSON array<string>
  description TEXT,
  language TEXT DEFAULT 'en',
  is_confidential INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  storage_key TEXT NOT NULL,      -- R2/S3 object key
  storage_url TEXT,
  thumbnail_key TEXT,
  linked_entities TEXT,           -- JSON array<{entityType, entityId, entityRef}>
  version INTEGER NOT NULL DEFAULT 1,
  is_latest_version INTEGER NOT NULL DEFAULT 1,
  previous_versions TEXT,         -- JSON array
  issue_date TEXT,
  expiry_date TEXT,
  is_expired INTEGER NOT NULL DEFAULT 0,
  expiry_alert_sent INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_downloaded_at TEXT,
  last_downloaded_by_id TEXT REFERENCES users(id),
  uploaded_by_id TEXT NOT NULL REFERENCES users(id),
  uploaded_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category, is_deleted);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date, is_expired);
CREATE INDEX IF NOT EXISTS idx_documents_name ON documents(name);

CREATE TABLE IF NOT EXISTS document_activities (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  doc_number TEXT,
  action TEXT NOT NULL,           -- uploaded|downloaded|deleted|restored|version_added|renamed|relinked|shared|viewed
  performed_by_id TEXT REFERENCES users(id),
  ip_address TEXT,
  details TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_document_activities_document ON document_activities(document_id, created_at);
CREATE INDEX IF NOT EXISTS idx_document_activities_action ON document_activities(action, created_at);

-- ── Notifications / activity ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,             -- po_*|so_*|storefront_*|shipment_*|stock/finance/document/tax/user/report/reminder types
  severity TEXT DEFAULT 'info',   -- info|success|warning|error
  title TEXT NOT NULL,
  body TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  is_dismissed INTEGER NOT NULL DEFAULT 0,
  action_url TEXT,
  action_label TEXT,
  entity_type TEXT,
  entity_ref TEXT,
  entity_id TEXT,                 -- polymorphic, no FK
  channels TEXT,                  -- JSON
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

CREATE TABLE IF NOT EXISTS customer_notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL REFERENCES customer_accounts(id),
  type TEXT NOT NULL,             -- order_placed|order_status|payment_update|shipment_update|reminder|promotion|review_update|support_update
  severity TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  action_url TEXT,
  action_label TEXT,
  entity_type TEXT,
  entity_ref TEXT,
  entity_id TEXT,                 -- polymorphic, no FK
  channels TEXT,                  -- JSON
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_recipient ON customer_notifications(recipient_id, is_read, created_at);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  in_app_enabled INTEGER NOT NULL DEFAULT 1,
  email_enabled INTEGER NOT NULL DEFAULT 1,
  email_digest TEXT DEFAULT 'instant',  -- instant|daily|weekly|never
  digest_time TEXT DEFAULT '08:00',
  digest_day_of_week INTEGER DEFAULT 1,
  type_overrides TEXT,            -- JSON map type->{inApp, email}
  quiet_hours_enabled INTEGER NOT NULL DEFAULT 0,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '07:00',
  next_digest_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS notification_digest_queues (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  notification_id TEXT NOT NULL REFERENCES notifications(id),
  sent INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_digest_queue_user_sent ON notification_digest_queues(user_id, sent);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id),
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,           -- users|inventory|suppliers|customers|import_orders|export_orders|shipments|documents|finance|reports|notifications|system
  entity_type TEXT,
  entity_ref TEXT,
  entity_id TEXT,                 -- polymorphic, no FK
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,                  -- JSON
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs(module, action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  created_by_id TEXT NOT NULL REFERENCES users(id),
  assigned_to TEXT,               -- JSON array<userId>
  title TEXT NOT NULL,
  body TEXT,
  due_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending|snoozed|done|cancelled
  snooze_until TEXT,
  entity_type TEXT,
  entity_ref TEXT,
  entity_id TEXT,                 -- polymorphic, no FK
  recurrence TEXT,                -- JSON {enabled, frequency, endDate}
  notified_at TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS communication_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,      -- supplier|customer
  entity_id TEXT NOT NULL,        -- polymorphic, no FK
  type TEXT NOT NULL,             -- email|call|meeting|note|whatsapp|other
  direction TEXT DEFAULT 'outbound',  -- inbound|outbound|internal
  subject TEXT,
  body TEXT,
  attachments TEXT,               -- JSON array
  follow_up_date TEXT,
  follow_up_done INTEGER NOT NULL DEFAULT 0,
  logged_by_id TEXT REFERENCES users(id),
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_communication_logs_entity ON communication_logs(entity_type, entity_id, created_at);

-- ── Reports ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS report_definitions (
  id TEXT PRIMARY KEY,
  report_id TEXT UNIQUE,          -- RPT-YYYY-#####
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,             -- sales|shipment|financial|inventory|supplier|customer|custom
  config TEXT,                    -- JSON
  is_shared INTEGER NOT NULL DEFAULT 0,
  is_favourite INTEGER NOT NULL DEFAULT 0,
  last_run_at TEXT,
  last_run_by_id TEXT REFERENCES users(id),
  created_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id TEXT PRIMARY KEY,
  report_definition_id TEXT NOT NULL REFERENCES report_definitions(id),
  name TEXT NOT NULL,
  frequency TEXT NOT NULL,        -- daily|weekly|monthly|quarterly
  day_of_week INTEGER,
  day_of_month INTEGER,
  time TEXT DEFAULT '07:00',
  timezone TEXT DEFAULT 'UTC',
  format TEXT DEFAULT 'xlsx',     -- csv|xlsx|pdf
  recipients TEXT,                -- JSON array<{userId, email}>
  is_active INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  next_run_at TEXT,
  last_run_status TEXT DEFAULT 'pending',  -- success|failed|pending
  created_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS report_exports (
  id TEXT PRIMARY KEY,
  report_definition_id TEXT REFERENCES report_definitions(id),
  scheduled_report_id TEXT REFERENCES scheduled_reports(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,             -- sales|shipment|financial|inventory|supplier|customer|custom|analytics
  format TEXT NOT NULL,           -- csv|xlsx|pdf
  status TEXT DEFAULT 'generating',  -- generating|ready|failed
  file_url TEXT,
  storage_key TEXT,               -- R2/S3 object key
  file_size_bytes INTEGER,
  row_count INTEGER,
  generated_by_id TEXT REFERENCES users(id),
  generated_at TEXT,
  expires_at TEXT,
  created_at TEXT,
  updated_at TEXT
);
