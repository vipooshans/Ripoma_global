const Expense = require('../models/Expense');
const generatePaymentNumber = require('../utils/payNumberGenerator');

// GET /api/expenses
exports.listExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      linkedOrder, // can match importOrder or exportOrder
      sort = '-createdAt'
    } = req.query;

    const query = {};

    if (category) {
      // support comma-separated list or array
      const categories = category.split(',');
      query.category = { $in: categories };
    }
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
    if (linkedOrder) {
      query.$or = [
        { importOrder: linkedOrder },
        { exportOrder: linkedOrder },
        { shipment: linkedOrder }
      ];
    }

    if (dateFrom || dateTo) {
      query.expenseDate = {};
      if (dateFrom) query.expenseDate.$gte = new Date(dateFrom);
      if (dateTo) query.expenseDate.$lte = new Date(dateTo);
    }

    const sortOption = {};
    if (sort.startsWith('-')) {
      sortOption[sort.substring(1)] = -1;
    } else {
      sortOption[sort] = 1;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('importOrder', 'poNumber')
      .populate('exportOrder', 'orderNumber')
      .populate('shipment', 'shipmentNumber')
      .populate('submittedBy', 'name')
      .populate('approvedBy', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    // Calculate sum for current filters
    const allMatching = await Expense.find(query);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let totalThisMonth = 0;
    let pendingApproval = 0;
    let awaitingPayment = 0;

    allMatching.forEach(e => {
      const expDate = new Date(e.expenseDate);
      if (expDate >= startOfMonth) {
        totalThisMonth += e.amountInBaseCurrency || 0;
      }
      if (e.status === 'submitted') {
        pendingApproval += e.amountInBaseCurrency || 0;
      }
      if (e.status === 'approved' && e.paymentStatus === 'unpaid') {
        awaitingPayment += e.amountInBaseCurrency || 0;
      }
    });

    return res.status(200).json({
      expenses,
      summary: {
        totalThisMonth: Math.round(totalThisMonth * 100) / 100,
        pendingApproval: Math.round(pendingApproval * 100) / 100,
        awaitingPayment: Math.round(awaitingPayment * 100) / 100
      },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('List Expenses Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/expenses
exports.createExpense = async (req, res) => {
  try {
    const expenseData = req.body;
    
    expenseData.expenseNumber = await generatePaymentNumber('expense');
    expenseData.submittedBy = req.user._id;
    expenseData.status = 'draft';
    expenseData.paymentStatus = 'unpaid';

    const expense = new Expense(expenseData);
    await expense.save();

    return res.status(201).json({
      message: 'Expense created in draft successfully.',
      expense
    });
  } catch (error) {
    console.error('Create Expense Error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// GET /api/expenses/dashboard
exports.getCategorySummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Sum base amounts by category for this month
    const thisMonthGroup = await Expense.aggregate([
      { 
        $match: { 
          expenseDate: { $gte: startOfMonth },
          status: { $nin: ['rejected'] }
        } 
      },
      { 
        $group: { 
          _id: '$category', 
          total: { $sum: '$amountInBaseCurrency' } 
        } 
      }
    ]);

    // Sum base amounts by category for YTD
    const ytdGroup = await Expense.aggregate([
      { 
        $match: { 
          expenseDate: { $gte: startOfYear },
          status: { $nin: ['rejected'] }
        } 
      },
      { 
        $group: { 
          _id: '$category', 
          total: { $sum: '$amountInBaseCurrency' } 
        } 
      }
    ]);

    const formattedThisMonth = thisMonthGroup.map(g => ({
      category: g._id,
      total: Math.round(g.total * 100) / 100
    }));

    const formattedYTD = ytdGroup.map(g => ({
      category: g._id,
      total: Math.round(g.total * 100) / 100
    }));

    return res.status(200).json({
      currentMonth: formattedThisMonth,
      ytd: formattedYTD
    });
  } catch (error) {
    console.error('Get Expenses Category Summary Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/expenses/:id
exports.getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('importOrder')
      .populate('exportOrder')
      .populate('shipment')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }
    return res.status(200).json(expense);
  } catch (error) {
    console.error('Get Expense Details Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/expenses/:id
exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    if (expense.status !== 'draft' && expense.status !== 'rejected') {
      return res.status(400).json({ message: 'Only draft or rejected expenses can be edited.' });
    }

    const updatableFields = [
      'title', 'category', 'amount', 'currency', 'exchangeRate',
      'expenseDate', 'vendor', 'invoiceReference', 'importOrder', 'exportOrder', 'shipment', 'notes', 'receiptUrl'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        expense[field] = req.body[field];
      }
    });

    // Reset status back to draft on edit if it was rejected
    if (expense.status === 'rejected') {
      expense.status = 'draft';
      expense.rejectionReason = undefined;
    }

    await expense.save();

    return res.status(200).json({
      message: 'Expense updated successfully.',
      expense
    });
  } catch (error) {
    console.error('Update Expense Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/expenses/:id/submit
exports.submitExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    if (expense.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft expenses can be submitted.' });
    }

    expense.status = 'submitted';
    await expense.save();

    return res.status(200).json({
      message: 'Expense submitted for approval.',
      expense
    });
  } catch (error) {
    console.error('Submit Expense Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/expenses/:id/approve
exports.approveExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    if (expense.status !== 'submitted') {
      return res.status(400).json({ message: 'Only submitted expenses can be approved.' });
    }

    expense.status = 'approved';
    expense.approvedBy = req.user._id;
    expense.approvedAt = new Date();
    await expense.save();

    return res.status(200).json({
      message: 'Expense approved successfully.',
      expense
    });
  } catch (error) {
    console.error('Approve Expense Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/expenses/:id/reject
exports.rejectExpense = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required.' });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    if (expense.status !== 'submitted') {
      return res.status(400).json({ message: 'Only submitted expenses can be rejected.' });
    }

    expense.status = 'rejected';
    expense.rejectionReason = rejectionReason;
    expense.approvedBy = req.user._id;
    expense.approvedAt = new Date();
    await expense.save();

    return res.status(200).json({
      message: 'Expense rejected.',
      expense
    });
  } catch (error) {
    console.error('Reject Expense Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/expenses/:id/mark-paid
exports.markPaid = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    if (expense.status !== 'approved') {
      return res.status(400).json({ message: 'Expense must be approved before payment can be recorded.' });
    }

    expense.status = 'paid';
    expense.paymentStatus = 'paid';
    await expense.save();

    return res.status(200).json({
      message: 'Expense successfully marked as paid.',
      expense
    });
  } catch (error) {
    console.error('Mark Paid Expense Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/expenses/:id
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    if (expense.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft expenses can be deleted.' });
    }

    await Expense.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: 'Draft expense deleted successfully.' });
  } catch (error) {
    console.error('Delete Expense Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/expenses/export
exports.exportExpensesCSV = async (req, res) => {
  try {
    const { category, status, paymentStatus, dateFrom, dateTo } = req.query;
    const query = {};

    if (category) query.category = { $in: category.split(',') };
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (dateFrom || dateTo) {
      query.expenseDate = {};
      if (dateFrom) query.expenseDate.$gte = new Date(dateFrom);
      if (dateTo) query.expenseDate.$lte = new Date(dateTo);
    }

    const expenses = await Expense.find(query).sort({ createdAt: -1 });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses_export.csv');

    let csvContent = 'Expense Number,Title,Category,Amount,Currency,Base Amount (USD),Status,Payment Status,Vendor,Reference,Date\n';
    
    expenses.forEach(e => {
      const dateStr = e.expenseDate ? new Date(e.expenseDate).toLocaleDateString() : '';
      const titleEscaped = e.title.replace(/"/g, '""');
      const vendorEscaped = (e.vendor || '').replace(/"/g, '""');
      const refEscaped = (e.invoiceReference || '').replace(/"/g, '""');

      csvContent += `${e.expenseNumber},"${titleEscaped}",${e.category},${e.amount},${e.currency},${e.amountInBaseCurrency || 0},${e.status},${e.paymentStatus},"${vendorEscaped}","${refEscaped}",${dateStr}\n`;
    });

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export Expenses CSV Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
