const Supplier = require('../models/Supplier');
const ImportOrder = require('../models/ImportOrder');
const { generateSupplierCode } = require('../utils/codeGenerator');
const Papa = require('papaparse');
const multer = require('multer');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates contacts[]:
 * - At least one contact with name, valid email, and phone
 * - Any contact with any of name/email/phone set must have all three
 * Returns error message string or null
 */
const validateContacts = (contacts) => {
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return 'At least one contact with name, email, and phone is required.';
  }

  let hasComplete = false;

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i] || {};
    const name = (c.name || '').trim();
    const email = (c.email || '').trim();
    const phone = (c.phone || '').trim();
    const anySet = !!(name || email || phone);

    if (!anySet) continue;

    if (!name || !email || !phone) {
      return `Contact ${i + 1}: name, email, and phone are all required when any contact field is set.`;
    }
    if (!EMAIL_RE.test(email)) {
      return `Contact ${i + 1}: please provide a valid email address.`;
    }
    hasComplete = true;
  }

  if (!hasComplete) {
    return 'At least one contact with name, email, and phone is required.';
  }

  return null;
};

// ─── GET /api/suppliers ───────────────────────────────────────────────────────
exports.getSuppliers = async (req, res) => {
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
    const sortObj = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [suppliers, total] = await Promise.all([
      Supplier.find(filter).sort(sortObj).skip(skip).limit(parseInt(limit))
        .populate('createdBy', 'name email').lean(),
      Supplier.countDocuments(filter)
    ]);

    return res.status(200).json({
      suppliers,
      pagination: {
        total, page: parseInt(page), limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('getSuppliers:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /api/suppliers ──────────────────────────────────────────────────────
exports.createSupplier = async (req, res) => {
  try {
    const { companyName } = req.body;
    if (!companyName) return res.status(400).json({ message: 'companyName is required.' });

    const contactError = validateContacts(req.body.contacts);
    if (contactError) return res.status(400).json({ message: contactError });

    const code = req.body.code || await generateSupplierCode();
    const existing = await Supplier.findOne({ code });
    if (existing) return res.status(400).json({ message: `Code ${code} already in use.` });

    const supplier = new Supplier({
      ...req.body,
      code,
      createdBy: req.user?._id
    });
    await supplier.save();
    return res.status(201).json({ message: 'Supplier created.', supplier });
  } catch (err) {
    console.error('createSupplier:', err);
    if (err.code === 11000) return res.status(400).json({ message: 'Supplier code already exists.' });
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /api/suppliers/:id ───────────────────────────────────────────────────
exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, deleted: { $ne: true } })
      .populate('createdBy', 'name email').lean();
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
    return res.status(200).json({ supplier });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── PUT /api/suppliers/:id ───────────────────────────────────────────────────
exports.updateSupplier = async (req, res) => {
  try {
    if (req.body.companyName !== undefined && !req.body.companyName) {
      return res.status(400).json({ message: 'companyName is required.' });
    }

    if (req.body.contacts !== undefined) {
      const contactError = validateContacts(req.body.contacts);
      if (contactError) return res.status(400).json({ message: contactError });
    }

    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, deleted: { $ne: true } },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
    return res.status(200).json({ message: 'Supplier updated.', supplier });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /api/suppliers/:id ────────────────────────────────────────────────
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });

    const activeOrderCount = await ImportOrder.countDocuments({
      supplier: req.params.id,
      status: { $nin: ['received', 'cancelled'] }
    });

    if (activeOrderCount > 0) {
      return res.status(400).json({
        message: `Cannot archive supplier. There ${activeOrderCount === 1 ? 'is' : 'are'} ${activeOrderCount} active import order${activeOrderCount === 1 ? '' : 's'}. Complete or cancel them first.`
      });
    }

    supplier.deleted = true;
    supplier.deletedAt = new Date();
    await supplier.save();

    return res.status(200).json({ message: 'Supplier archived.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── PATCH /api/suppliers/:id/status ─────────────────────────────────────────
exports.updateSupplierStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'inactive', 'blacklisted'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status.' });

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
    return res.status(200).json({ message: 'Status updated.', supplier });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /api/suppliers/:id/stats ────────────────────────────────────────────
exports.getSupplierStats = async (req, res) => {
  try {
    // Placeholder — will be populated when ImportOrder model is wired in Module 4
    return res.status(200).json({
      totalOrders: 0,
      totalSpend: 0,
      avgLeadTimeDays: 0,
      onTimePercent: 0
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /api/suppliers/:id/products ─────────────────────────────────────────
exports.getSupplierProducts = async (req, res) => {
  try {
    const Product = require('../models/Product');
    const products = await Product.find({
      supplier: req.params.id,
      deleted: { $ne: true }
    }).select('sku name images unit totalStock status').lean();
    return res.status(200).json({ products });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /api/suppliers/import ───────────────────────────────────────────────
exports.importSuppliersCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No CSV file uploaded.' });

    const csvText = req.file.buffer.toString('utf-8');
    const { data, errors } = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    if (errors.length > 0) {
      return res.status(400).json({ message: 'CSV parse error.', errors });
    }

    let created = 0, skipped = 0;
    const rowErrors = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;
      if (!row.companyName) {
        skipped++;
        rowErrors.push({ row: rowNum, reason: 'companyName is required.' });
        continue;
      }

      const contacts = (row.primaryContactName || row.primaryContactEmail || row.primaryContactPhone)
        ? [{
            name: row.primaryContactName,
            email: row.primaryContactEmail,
            phone: row.primaryContactPhone,
            isPrimary: true
          }]
        : [];

      const contactError = validateContacts(contacts);
      if (contactError) {
        skipped++;
        rowErrors.push({ row: rowNum, reason: contactError });
        continue;
      }

      try {
        const code = await generateSupplierCode();
        const supplier = new Supplier({
          companyName: row.companyName?.trim(),
          type: row.type || 'manufacturer',
          country: row.country,
          currency: row.currency || 'USD',
          paymentTerms: row.paymentTerms,
          website: row.website,
          taxId: row.taxId,
          leadTimeDays: row.leadTimeDays ? parseInt(row.leadTimeDays) : undefined,
          rating: row.rating ? parseFloat(row.rating) : undefined,
          notes: row.notes,
          code,
          contacts,
          createdBy: req.user?._id
        });
        await supplier.save();
        created++;
      } catch (e) {
        skipped++;
        rowErrors.push({ row: rowNum, reason: e.message || 'Save failed.' });
      }
    }

    return res.status(200).json({
      message: `Import complete. ${created} created, ${skipped} skipped.`,
      created, skipped, errors: rowErrors
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /api/suppliers/export ────────────────────────────────────────────────
exports.exportSuppliersCSV = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ deleted: { $ne: true } }).lean();
    const rows = suppliers.map(s => ({
      code: s.code,
      companyName: s.companyName,
      type: s.type,
      status: s.status,
      country: s.country || '',
      currency: s.currency || 'USD',
      paymentTerms: s.paymentTerms || '',
      leadTimeDays: s.leadTimeDays || '',
      rating: s.rating || '',
      website: s.website || '',
      taxId: s.taxId || '',
      notes: s.notes || '',
      primaryContact: s.contacts?.find(c => c.isPrimary)?.name || '',
      primaryEmail: s.contacts?.find(c => c.isPrimary)?.email || ''
    }));

    const csv = Papa.unparse(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=suppliers.csv');
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};
