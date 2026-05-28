const Supplier = require('../models/Supplier');

// GET /api/suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    return res.status(200).json(suppliers);
  } catch (error) {
    console.error('Get Suppliers Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/suppliers
exports.createSupplier = async (req, res) => {
  try {
    const { name, code, contactPerson, email, phone, address } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'Supplier name and code are required.' });
    }

    const existing = await Supplier.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'Supplier with this code already exists.' });
    }

    const supplier = new Supplier({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      contactPerson,
      email,
      phone,
      address
    });

    await supplier.save();
    return res.status(201).json({ message: 'Supplier created successfully.', supplier });
  } catch (error) {
    console.error('Create Supplier Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
