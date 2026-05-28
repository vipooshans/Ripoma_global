const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');

// ─── GET /api/contacts ────────────────────────────────────────────────────────
exports.getContacts = async (req, res) => {
  try {
    const { search, type } = req.query;

    const baseFilter = { deleted: { $ne: true } };
    if (search) {
      baseFilter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const [suppliers, customers] = await Promise.all([
      (type && type !== 'supplier') ? [] :
        Supplier.find(baseFilter).select('companyName code country contacts status type').lean(),
      (type && type !== 'customer') ? [] :
        Customer.find(baseFilter).select('companyName code country contacts status type creditLimit outstandingBalance').lean()
    ]);

    const combined = [
      ...suppliers.map(s => ({ ...s, entityType: 'supplier' })),
      ...customers.map(c => ({ ...c, entityType: 'customer' }))
    ].sort((a, b) => a.companyName.localeCompare(b.companyName));

    return res.status(200).json({ contacts: combined, total: combined.length });
  } catch (err) {
    console.error('getContacts:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
