const Customer = require('../models/Customer');
const ExportOrder = require('../models/ExportOrder');
const { generateCustomerCode } = require('../utils/codeGenerator');
const Papa = require('papaparse');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper: compute credit utilisation flag
const getCreditFlag = (customer) => {
  if (!customer.creditLimit || customer.creditLimit === 0) return 'ok';
  const util = customer.outstandingBalance / customer.creditLimit;
  if (util >= 1.0) return 'over_limit';
  if (util >= 0.8) return 'near_limit';
  return 'ok';
};

/** Require companyName, email (primary contact), address street/city/country */
const validateCustomerDetails = ({ companyName, contacts, address }) => {
  if (!companyName || !String(companyName).trim()) {
    return 'Company name is required.';
  }

  const list = Array.isArray(contacts) ? contacts : [];
  const primary = list.find((c) => c?.isPrimary) || list[0];
  const email = (primary?.email || '').trim();
  if (!email || !EMAIL_RE.test(email)) {
    return 'A primary contact with a valid email is required.';
  }

  const street = (address?.street || '').trim();
  const city = (address?.city || '').trim();
  const country = (address?.country || '').trim();
  if (!street || !city || !country) {
    return 'Address street, city, and country are required.';
  }

  return null;
};

// ─── GET /api/customers ───────────────────────────────────────────────────────
exports.getCustomers = async (req, res) => {
  try {
    const {
      page = 1, limit = 15, search, type, status, country,
      sort = 'createdAt:desc'
    } = req.query;

    const filter = { deleted: { $ne: true } };
    if (search) filter.$or = [
      { companyName: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } }
    ];
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (country) filter.country = { $regex: country, $options: 'i' };

    const [sortField, sortOrder] = sort.split(':');
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip).limit(parseInt(limit))
        .populate('createdBy', 'name email').lean(),
      Customer.countDocuments(filter)
    ]);

    const withFlags = customers.map(c => ({ ...c, creditFlag: getCreditFlag(c) }));

    return res.status(200).json({
      customers: withFlags,
      pagination: {
        total, page: parseInt(page), limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('getCustomers:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /api/customers ──────────────────────────────────────────────────────
exports.createCustomer = async (req, res) => {
  try {
    const detailError = validateCustomerDetails(req.body);
    if (detailError) return res.status(400).json({ message: detailError });

    const code = req.body.code || await generateCustomerCode();
    const existing = await Customer.findOne({ code });
    if (existing) return res.status(400).json({ message: `Code ${code} already in use.` });

    const customer = new Customer({
      ...req.body,
      code,
      createdBy: req.user?._id
    });
    await customer.save();
    return res.status(201).json({ message: 'Customer created.', customer });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Customer code already exists.' });
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /api/customers/:id ───────────────────────────────────────────────────
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, deleted: { $ne: true } })
      .populate('createdBy', 'name email').lean();
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });
    return res.status(200).json({ customer: { ...customer, creditFlag: getCreditFlag(customer) } });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── PUT /api/customers/:id ───────────────────────────────────────────────────
exports.updateCustomer = async (req, res) => {
  try {
    const existing = await Customer.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!existing) return res.status(404).json({ message: 'Customer not found.' });

    const merged = {
      companyName: req.body.companyName !== undefined ? req.body.companyName : existing.companyName,
      contacts: req.body.contacts !== undefined ? req.body.contacts : existing.contacts,
      address: req.body.address !== undefined ? req.body.address : existing.address
    };
    const detailError = validateCustomerDetails(merged);
    if (detailError) return res.status(400).json({ message: detailError });

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, deleted: { $ne: true } },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });
    return res.status(200).json({ message: 'Customer updated.', customer });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /api/customers/:id ────────────────────────────────────────────────
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { deleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });
    return res.status(200).json({ message: 'Customer archived.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── PATCH /api/customers/:id/status ─────────────────────────────────────────
exports.updateCustomerStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'inactive', 'prospect', 'vip'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status.' });

    const customer = await Customer.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });
    return res.status(200).json({ message: 'Status updated.', customer });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /api/customers/:id/stats ────────────────────────────────────────────
exports.getCustomerStats = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer || customer.deleted) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const orders = await ExportOrder.find({
      customer: req.params.id,
      status: { $ne: 'cancelled' }
    })
      .select('orderNumber status grandTotal orderDate confirmedDate createdAt paymentStatus')
      .sort({ createdAt: -1 })
      .lean();

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return res.status(200).json({
      totalOrders,
      totalRevenue,
      outstandingBalance: customer.outstandingBalance || 0,
      avgOrderValue,
      recentOrders: orders.slice(0, 20)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /api/customers/import ───────────────────────────────────────────────
exports.importCustomersCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No CSV file uploaded.' });

    const csvText = req.file.buffer.toString('utf-8');
    const { data, errors } = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (errors.length > 0) return res.status(400).json({ message: 'CSV parse error.', errors });

    let created = 0, skipped = 0;
    for (const row of data) {
      const contacts = (row.primaryContactName || row.primaryContactEmail || row.primaryContactPhone)
        ? [{
            name: row.primaryContactName,
            email: row.primaryContactEmail,
            phone: row.primaryContactPhone,
            isPrimary: true
          }]
        : [];
      const address = {
        street: row.street || row.addressStreet || '',
        city: row.city || row.addressCity || '',
        country: row.country || row.addressCountry || ''
      };
      const detailError = validateCustomerDetails({
        companyName: row.companyName,
        contacts,
        address
      });
      if (detailError) { skipped++; continue; }
      try {
        const code = await generateCustomerCode();
        const customer = new Customer({
          companyName: row.companyName?.trim(),
          type: row.type || 'retailer',
          country: address.country,
          address,
          currency: row.currency || 'USD',
          paymentTerms: row.paymentTerms,
          creditLimit: row.creditLimit ? parseFloat(row.creditLimit) : 0,
          website: row.website,
          taxId: row.taxId,
          source: row.source,
          rating: row.rating ? parseFloat(row.rating) : undefined,
          notes: row.notes,
          code,
          contacts,
          createdBy: req.user?._id
        });
        await customer.save();
        created++;
      } catch (e) { skipped++; }
    }

    return res.status(200).json({
      message: `Import complete. ${created} created, ${skipped} skipped.`,
      created, skipped
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /api/customers/export ────────────────────────────────────────────────
exports.exportCustomersCSV = async (req, res) => {
  try {
    const customers = await Customer.find({ deleted: { $ne: true } }).lean();
    const rows = customers.map(c => ({
      code: c.code,
      companyName: c.companyName,
      type: c.type,
      status: c.status,
      country: c.country || '',
      currency: c.currency || 'USD',
      paymentTerms: c.paymentTerms || '',
      creditLimit: c.creditLimit || 0,
      outstandingBalance: c.outstandingBalance || 0,
      source: c.source || '',
      rating: c.rating || '',
      website: c.website || '',
      notes: c.notes || ''
    }));

    const csv = Papa.unparse(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};
