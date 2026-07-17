const Settings = require('../models/Settings');
const User = require('../models/User');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Category = require('../models/Category');
const Warehouse = require('../models/Warehouse');

const COMPANY_KEY = 'companyProfile';
const EMAIL_KEY = 'emailSettings';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const defaultCompany = {
  legalName: '',
  tradingName: '',
  email: '',
  phone: '',
  taxId: '',
  address: {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  },
  website: ''
};

const defaultEmail = {
  fromName: 'RIPOMA GLOBAL',
  fromEmail: '',
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: ''
  // password never returned; stored encrypted/plain in value.smtpPass if provided
};

const getSetting = async (key, fallback) => {
  const doc = await Settings.findOne({ key }).lean();
  return doc?.value ?? fallback;
};

const upsertSetting = async (key, value) => {
  return Settings.findOneAndUpdate(
    { key },
    { key, value },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
};

const validateCompany = (company) => {
  if (!company?.legalName?.trim()) return 'Company legal name is required.';
  if (!company?.email?.trim() || !EMAIL_RE.test(company.email.trim())) {
    return 'A valid company email is required.';
  }
  if (!company?.phone?.trim()) return 'Company phone is required.';
  if (!company?.taxId?.trim()) return 'Tax ID is required.';
  const a = company.address || {};
  if (!a.street?.trim() || !a.city?.trim() || !a.country?.trim()) {
    return 'Company address street, city, and country are required.';
  }
  return null;
};

exports.getCompanySettings = async (req, res) => {
  try {
    const company = await getSetting(COMPANY_KEY, defaultCompany);
    return res.status(200).json({ company });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updateCompanySettings = async (req, res) => {
  try {
    const company = { ...defaultCompany, ...req.body, address: { ...defaultCompany.address, ...(req.body.address || {}) } };
    const error = validateCompany(company);
    if (error) return res.status(400).json({ message: error });

    await upsertSetting(COMPANY_KEY, company);
    return res.status(200).json({ message: 'Company settings saved.', company });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getEmailSettings = async (req, res) => {
  try {
    const stored = await getSetting(EMAIL_KEY, defaultEmail);
    const { smtpPass, ...safe } = stored || {};
    return res.status(200).json({
      email: {
        ...defaultEmail,
        ...safe,
        hasPassword: Boolean(smtpPass)
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updateEmailSettings = async (req, res) => {
  try {
    const existing = await getSetting(EMAIL_KEY, defaultEmail);
    const next = {
      ...defaultEmail,
      ...existing,
      ...req.body
    };

    if (!next.fromEmail || !EMAIL_RE.test(String(next.fromEmail).trim())) {
      return res.status(400).json({ message: 'A valid from email is required.' });
    }
    if (!next.smtpHost?.trim()) {
      return res.status(400).json({ message: 'SMTP host is required.' });
    }

    // Keep existing password unless a new one is provided
    if (!req.body.smtpPass) {
      next.smtpPass = existing.smtpPass || '';
    }

    await upsertSetting(EMAIL_KEY, next);
    const { smtpPass, ...safe } = next;
    return res.status(200).json({
      message: 'Email settings saved.',
      email: { ...safe, hasPassword: Boolean(smtpPass) }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllSettings = async (req, res) => {
  try {
    const company = await getSetting(COMPANY_KEY, defaultCompany);
    const emailStored = await getSetting(EMAIL_KEY, defaultEmail);
    const { smtpPass, ...emailSafe } = emailStored || {};
    const baseCurrencyDoc = await Settings.findOne({ key: 'baseCurrency' }).lean();

    return res.status(200).json({
      company,
      email: { ...defaultEmail, ...emailSafe, hasPassword: Boolean(smtpPass) },
      currency: { baseCurrency: baseCurrencyDoc?.value || 'USD' }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

/** JSON backup of core reference/catalog collections (not a full Mongo dump). */
exports.createBackup = async (req, res) => {
  try {
    const [
      users,
      products,
      suppliers,
      customers,
      categories,
      warehouses,
      settings
    ] = await Promise.all([
      User.find({ deleted: { $ne: true } }).select('-password').lean(),
      Product.find({ deleted: { $ne: true } }).lean(),
      Supplier.find({ deleted: { $ne: true } }).lean(),
      Customer.find({ deleted: { $ne: true } }).lean(),
      Category.find({}).lean(),
      Warehouse.find({}).lean(),
      Settings.find({}).lean()
    ]);

    // Strip email SMTP password from backup settings values
    const safeSettings = settings.map((s) => {
      if (s.key === EMAIL_KEY && s.value && typeof s.value === 'object') {
        const { smtpPass, ...rest } = s.value;
        return { ...s, value: { ...rest, hasPassword: Boolean(smtpPass) } };
      }
      return s;
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      collections: {
        users,
        products,
        suppliers,
        customers,
        categories,
        warehouses,
        settings: safeSettings
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=ripoma-backup-${new Date().toISOString().slice(0, 10)}.json`
    );
    return res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('Backup error:', err);
    return res.status(500).json({ message: 'Failed to create backup.' });
  }
};
