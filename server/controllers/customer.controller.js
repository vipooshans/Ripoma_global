const Customer = require('../models/Customer');
const { generateCustomerCode } = require('../utils/codeGenerator');
const Papa = require('papaparse');

// Helper: compute credit utilisation flag
const getCreditFlag = (customer) => {
  if (!customer.creditLimit || customer.creditLimit === 0) return 'ok';
  const util = customer.outstandingBalance / customer.creditLimit;
  if (util >= 1.0) return 'over_limit';
  if (util >= 0.8) return 'near_limit';
  return 'ok';
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
    const { companyName } = req.body;
    if (!companyName) return res.status(400).json({ message: 'companyName is required.' });

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
    // Placeholder — will be populated when ExportOrder model is wired in Module 4
    const customer = await Customer.findById(req.params.id).lean();
    return res.status(200).json({
      totalOrders: 0,
      totalRevenue: 0,
      outstandingBalance: customer?.outstandingBalance || 0,
      avgOrderValue: 0
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
      if (!row.companyName) { skipped++; continue; }
      try {
        const code = await generateCustomerCode();
        const customer = new Customer({
          companyName: row.companyName?.trim(),
          type: row.type || 'retailer',
          country: row.country,
          currency: row.currency || 'USD',
          paymentTerms: row.paymentTerms,
          creditLimit: row.creditLimit ? parseFloat(row.creditLimit) : 0,
          website: row.website,
          taxId: row.taxId,
          source: row.source,
          rating: row.rating ? parseFloat(row.rating) : undefined,
          notes: row.notes,
          code,
          contacts: row.primaryContactName ? [{
            name: row.primaryContactName,
            email: row.primaryContactEmail,
            phone: row.primaryContactPhone,
            isPrimary: true
          }] : [],
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
