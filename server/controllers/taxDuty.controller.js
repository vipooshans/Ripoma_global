const TaxDutyRecord = require('../models/TaxDutyRecord');
const generatePaymentNumber = require('../utils/payNumberGenerator');

// GET /api/tax-duty
exports.listRecords = async (req, res) => {
  try {
    const { type, status, country, dateFrom, dateTo } = req.query;
    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (country) query.country = country;

    if (dateFrom || dateTo) {
      query.dueDate = {};
      if (dateFrom) query.dueDate.$gte = new Date(dateFrom);
      if (dateTo) query.dueDate.$lte = new Date(dateTo);
    }

    const records = await TaxDutyRecord.find(query)
      .populate('importOrder', 'poNumber')
      .populate('exportOrder', 'orderNumber')
      .populate('shipment', 'shipmentNumber')
      .populate('recordedBy', 'name')
      .sort({ dueDate: 1 });

    return res.status(200).json(records);
  } catch (error) {
    console.error('List Tax/Duty Records Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/tax-duty
exports.createRecord = async (req, res) => {
  try {
    const recordData = req.body;
    
    recordData.recordNumber = await generatePaymentNumber('taxDuty');
    recordData.recordedBy = req.user._id;

    const record = new TaxDutyRecord(recordData);
    await record.save();

    return res.status(201).json({
      message: 'Tax/Duty record created successfully.',
      record
    });
  } catch (error) {
    console.error('Create Tax/Duty Record Error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// GET /api/tax-duty/summary
exports.getSummary = async (req, res) => {
  try {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    // Aggregate totals by type and country for the current year
    const summary = await TaxDutyRecord.aggregate([
      {
        $match: {
          dueDate: { $gte: startOfYear }
        }
      },
      {
        $group: {
          _id: { type: '$type', country: '$country' },
          totalAmount: { $sum: '$amountInBaseCurrency' },
          count: { $sum: 1 }
        }
      }
    ]);

    const result = summary.map(item => ({
      type: item._id.type,
      country: item._id.country,
      totalAmount: Math.round(item.totalAmount * 100) / 100,
      count: item.count
    }));

    // Calculate generic top-level card stats (MTD or YTD)
    const paidTaxesYTD = await TaxDutyRecord.aggregate([
      { $match: { status: 'paid', paidDate: { $gte: startOfYear } } },
      { $group: { _id: null, total: { $sum: '$amountInBaseCurrency' } } }
    ]);

    const filedTaxesYTD = await TaxDutyRecord.aggregate([
      { $match: { status: 'filed', filedDate: { $gte: startOfYear } } },
      { $group: { _id: null, total: { $sum: '$amountInBaseCurrency' } } }
    ]);

    const now = new Date();
    const future30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dueSoonTaxes = await TaxDutyRecord.aggregate([
      { $match: { status: { $ne: 'paid' }, dueDate: { $gte: now, $lte: future30Days } } },
      { $group: { _id: null, total: { $sum: '$amountInBaseCurrency' } } }
    ]);

    return res.status(200).json({
      breakdown: result,
      stats: {
        totalPaidYTD: paidTaxesYTD[0]?.total || 0,
        totalFiledYTD: filedTaxesYTD[0]?.total || 0,
        dueSoon30Days: dueSoonTaxes[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get Tax/Duty Summary Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/tax-duty/upcoming
exports.getUpcomingRecords = async (req, res) => {
  try {
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);

    const upcoming = await TaxDutyRecord.find({
      status: { $ne: 'paid' },
      dueDate: { $gte: today, $lte: next30Days }
    })
      .populate('importOrder', 'poNumber')
      .populate('exportOrder', 'orderNumber')
      .populate('shipment', 'shipmentNumber');

    return res.status(200).json(upcoming);
  } catch (error) {
    console.error('Get Upcoming Tax/Duty Records Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/tax-duty/:id
exports.getRecord = async (req, res) => {
  try {
    const record = await TaxDutyRecord.findById(req.params.id)
      .populate('importOrder')
      .populate('exportOrder')
      .populate('shipment')
      .populate('recordedBy', 'name email');

    if (!record) {
      return res.status(404).json({ message: 'Tax/Duty record not found.' });
    }
    return res.status(200).json(record);
  } catch (error) {
    console.error('Get Tax/Duty Record Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/tax-duty/:id
exports.updateRecord = async (req, res) => {
  try {
    const record = await TaxDutyRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Tax/Duty record not found.' });
    }

    const updatableFields = [
      'type', 'country', 'hsCode', 'description', 'taxableValue', 'rate',
      'amount', 'currency', 'dueDate', 'filedDate', 'paidDate', 'referenceNumber', 'notes'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        record[field] = req.body[field];
      }
    });

    await record.save();

    return res.status(200).json({
      message: 'Tax/Duty record updated successfully.',
      record
    });
  } catch (error) {
    console.error('Update Tax/Duty Record Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/tax-duty/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'filed', 'paid', 'disputed', 'exempt'].includes(status)) {
      return res.status(400).json({ message: 'Invalid target status.' });
    }

    const record = await TaxDutyRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Tax/Duty record not found.' });
    }

    const oldStatus = record.status;
    record.status = status;

    if (status === 'filed' && oldStatus !== 'filed') {
      record.filedDate = record.filedDate || new Date();
    }
    if (status === 'paid' && oldStatus !== 'paid') {
      record.paidDate = record.paidDate || new Date();
    }

    await record.save();

    return res.status(200).json({
      message: `Tax/Duty record status updated to ${status}.`,
      record
    });
  } catch (error) {
    console.error('Update Tax/Duty Status Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
