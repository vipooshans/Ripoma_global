const Payment = require('../models/Payment');
const generatePaymentNumber = require('../utils/payNumberGenerator');
const { getBaseCurrency } = require('../utils/baseCurrencyMiddleware');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

// Helper to update associated documents when payment is completed
const applyPaymentImpact = async (payment, userId) => {
  if (payment.status !== 'completed') return;

  try {
    // 1. Linked to Invoice
    if (payment.invoice) {
      const Invoice = require('../models/Invoice');
      const ExportOrder = require('../models/ExportOrder');
      
      const invoice = await Invoice.findById(payment.invoice);
      if (invoice && invoice.status !== 'paid') {
        invoice.amountPaid += payment.amount;
        invoice.amountDue = Math.max(0, invoice.grandTotal - invoice.amountPaid);
        if (invoice.amountPaid >= invoice.grandTotal) {
          invoice.status = 'paid';
          invoice.paidDate = payment.paymentDate || new Date();
        } else {
          invoice.status = 'viewed';
        }
        await invoice.save();

        const order = await ExportOrder.findById(invoice.exportOrder);
        if (order) {
          order.amountPaid += payment.amount;
          if (order.amountPaid >= order.grandTotal) {
            order.paymentStatus = 'paid';
          } else if (order.amountPaid > 0) {
            order.paymentStatus = 'partial';
          }
          order.timeline.push({
            action: 'payment_added',
            details: `Recorded payment of ${payment.amount} ${payment.currency} via Invoice payment: ${payment.paymentNumber}.`,
            note: payment.notes || '',
            performedBy: userId
          });
          await order.save();
        }

        // Deduct customer outstanding balance
        await Customer.findByIdAndUpdate(invoice.customer, {
          $inc: { outstandingBalance: -payment.amount }
        });
      }
    } 
    // 2. Linked to ExportOrder directly
    else if (payment.exportOrder) {
      const ExportOrder = require('../models/ExportOrder');
      const order = await ExportOrder.findById(payment.exportOrder);
      if (order) {
        order.amountPaid += payment.amount;
        if (order.amountPaid >= order.grandTotal) {
          order.paymentStatus = 'paid';
        } else if (order.amountPaid > 0) {
          order.paymentStatus = 'partial';
        }
        order.timeline.push({
          action: 'payment_added',
          details: `Recorded payment of ${payment.amount} ${payment.currency} directly for order: ${payment.paymentNumber}.`,
          note: payment.notes || '',
          performedBy: userId
        });
        await order.save();

        await Customer.findByIdAndUpdate(order.customer, {
          $inc: { outstandingBalance: -payment.amount }
        });
      }
    } 
    // 3. Linked to ImportOrder
    else if (payment.importOrder) {
      const ImportOrder = require('../models/ImportOrder');
      const order = await ImportOrder.findById(payment.importOrder);
      if (order) {
        order.amountPaid += payment.amount;
        if (order.amountPaid >= order.grandTotal) {
          order.paymentStatus = 'paid';
        } else if (order.amountPaid > 0) {
          order.paymentStatus = 'partial';
        }
        await order.save();
      }
    } 
    // 4. Linked to Expense
    else if (payment.expense) {
      const Expense = require('../models/Expense');
      const expense = await Expense.findById(payment.expense);
      if (expense) {
        expense.paymentStatus = 'paid';
        expense.status = 'paid';
        await expense.save();
      }
    }
  } catch (error) {
    console.error('[PAYMENT IMPACT ERROR] Failed to propagate payment status update:', error);
  }
};

// GET /api/payments
exports.listPayments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      status, 
      counterpartyType, 
      counterpartyId, 
      currency, 
      dateFrom, 
      dateTo, 
      sort = '-createdAt',
      overdueOnly
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (counterpartyType) query.counterpartyType = counterpartyType;
    if (counterpartyId) query.counterpartyId = counterpartyId;
    if (currency) query.currency = currency;
    if (overdueOnly === 'true') {
      query.isOverdue = true;
      query.status = 'pending';
    }

    if (dateFrom || dateTo) {
      query.paymentDate = {};
      if (dateFrom) query.paymentDate.$gte = new Date(dateFrom);
      if (dateTo) query.paymentDate.$lte = new Date(dateTo);
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

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('importOrder', 'poNumber')
      .populate('exportOrder', 'orderNumber')
      .populate('invoice', 'invoiceNumber')
      .populate('expense', 'expenseNumber title')
      .populate('recordedBy', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    // Dynamic aggregated totals for the current query (unfiltered by pagination)
    const allMatching = await Payment.find(query);
    let totalInbound = 0;
    let totalOutbound = 0;
    
    allMatching.forEach(p => {
      if (p.type === 'inbound') {
        totalInbound += p.amountInBaseCurrency || 0;
      } else {
        totalOutbound += p.amountInBaseCurrency || 0;
      }
    });

    return res.status(200).json({
      payments,
      summary: {
        totalInbound: Math.round(totalInbound * 100) / 100,
        totalOutbound: Math.round(totalOutbound * 100) / 100,
        net: Math.round((totalInbound - totalOutbound) * 100) / 100
      },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('List Payments Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/payments
exports.createPayment = async (req, res) => {
  try {
    const paymentData = req.body;
    
    // Generate new PAYMENT code
    paymentData.paymentNumber = await generatePaymentNumber('payment');
    paymentData.recordedBy = req.user._id;

    const payment = new Payment(paymentData);
    await payment.save(); // pre-save middleware triggers baseCurrency conversions

    if (payment.status === 'completed') {
      await applyPaymentImpact(payment, req.user._id);
    }

    return res.status(201).json({
      message: 'Payment recorded successfully.',
      payment
    });
  } catch (error) {
    console.error('Create Payment Error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// GET /api/payments/dashboard
exports.getDashboardKPIs = async (req, res) => {
  try {
    const now = new Date();

    // 1. Receivables (Inbound pending payments)
    const receivables = await Payment.find({ type: 'inbound', status: 'pending' });
    let totalReceivables = 0;
    let overdueReceivables = 0;
    
    receivables.forEach(p => {
      totalReceivables += p.amountInBaseCurrency || 0;
      if (p.isOverdue || (p.dueDate && new Date(p.dueDate) < now)) {
        overdueReceivables += p.amountInBaseCurrency || 0;
      }
    });

    // 2. Payables (Outbound pending payments)
    const payables = await Payment.find({ type: 'outbound', status: 'pending' });
    let totalPayables = 0;
    let overduePayables = 0;

    payables.forEach(p => {
      totalPayables += p.amountInBaseCurrency || 0;
      if (p.isOverdue || (p.dueDate && new Date(p.dueDate) < now)) {
        overduePayables += p.amountInBaseCurrency || 0;
      }
    });

    // 3. Net Cash Position (Inbound completed - Outbound completed)
    const completedPayments = await Payment.find({ status: 'completed' });
    let inboundCash = 0;
    let outboundCash = 0;

    completedPayments.forEach(p => {
      if (p.type === 'inbound') {
        inboundCash += p.amountInBaseCurrency || 0;
      } else {
        outboundCash += p.amountInBaseCurrency || 0;
      }
    });

    // 4. Monthly Spend / Income breakdowns for charts
    // Last 12 months Revenue vs COGS vs Expenses
    // We will build this breakdown in the profit analysis controller.
    
    return res.status(200).json({
      totalReceivables: Math.round(totalReceivables * 100) / 100,
      totalPayables: Math.round(totalPayables * 100) / 100,
      overdueReceivables: Math.round(overdueReceivables * 100) / 100,
      overduePayables: Math.round(overduePayables * 100) / 100,
      netCashPosition: Math.round((inboundCash - outboundCash) * 100) / 100
    });
  } catch (error) {
    console.error('Get Payments Dashboard Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/payments/overdue
exports.getOverduePayments = async (req, res) => {
  try {
    const overdue = await Payment.find({ isOverdue: true, status: 'pending' })
      .populate('importOrder', 'poNumber')
      .populate('exportOrder', 'orderNumber')
      .populate('invoice', 'invoiceNumber');

    const result = overdue.map(p => {
      const today = new Date();
      const due = new Date(p.dueDate);
      const daysOverdue = Math.max(0, Math.ceil((today - due) / (1000 * 60 * 60 * 24)));
      
      return {
        _id: p._id,
        paymentNumber: p.paymentNumber,
        type: p.type,
        counterpartyName: p.counterpartyName,
        amount: p.amount,
        currency: p.currency,
        amountInBaseCurrency: p.amountInBaseCurrency,
        dueDate: p.dueDate,
        daysOverdue
      };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Get Overdue Payments Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/payments/:id
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('importOrder')
      .populate('exportOrder')
      .populate('invoice')
      .populate('expense')
      .populate('recordedBy', 'name email');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }
    return res.status(200).json(payment);
  } catch (error) {
    console.error('Get Payment Details Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/payments/:id
exports.updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: 'Only payments with a pending status can be edited.' });
    }

    const updatableFields = [
      'amount', 'currency', 'exchangeRate', 'paymentMethod',
      'referenceNumber', 'bankAccount', 'paymentDate', 'dueDate', 'notes'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        payment[field] = req.body[field];
      }
    });

    await payment.save(); // Hook converts currency again

    return res.status(200).json({
      message: 'Payment updated successfully.',
      payment
    });
  } catch (error) {
    console.error('Update Payment Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/payments/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['completed', 'failed', 'cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({ message: 'Invalid target status.' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    const oldStatus = payment.status;
    payment.status = status;
    
    if (status === 'completed' && oldStatus !== 'completed') {
      payment.paymentDate = payment.paymentDate || new Date();
    }

    await payment.save();

    if (status === 'completed' && oldStatus !== 'completed') {
      await applyPaymentImpact(payment, req.user._id);
    }

    return res.status(200).json({
      message: `Payment status transitioned from ${oldStatus} to ${status}.`,
      payment
    });
  } catch (error) {
    console.error('Update Payment Status Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/payments/export
exports.exportPaymentsCSV = async (req, res) => {
  try {
    const { type, status, dateFrom, dateTo } = req.query;
    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.paymentDate = {};
      if (dateFrom) query.paymentDate.$gte = new Date(dateFrom);
      if (dateTo) query.paymentDate.$lte = new Date(dateTo);
    }

    const payments = await Payment.find(query).sort({ createdAt: -1 });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=payments_export.csv');

    let csvContent = 'Payment Number,Type,Status,Counterparty,Amount,Currency,Base Amount (USD),Method,Reference,Date,Due Date\n';
    
    payments.forEach(p => {
      const dateStr = p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '';
      const dueStr = p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '';
      const nameEscaped = (p.counterpartyName || '').replace(/"/g, '""');
      const refEscaped = (p.referenceNumber || '').replace(/"/g, '""');
      
      csvContent += `${p.paymentNumber},${p.type},${p.status},"${nameEscaped}",${p.amount},${p.currency},${p.amountInBaseCurrency || 0},${p.paymentMethod},"${refEscaped}",${dateStr},${dueStr}\n`;
    });

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export Payments CSV Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
