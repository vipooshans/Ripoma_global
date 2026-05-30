const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Expense = require('../../models/Expense');
const ExportOrder = require('../../models/ExportOrder');
const { calculatePLSummary } = require('../plCalculator');
const mongoose = require('mongoose');

/**
 * Aggregates financial reports, including P&L, receivables/payables ageing, and opex.
 * 
 * @param {object} params
 * @param {Date} params.dateFrom
 * @param {Date} params.dateTo
 * @param {string} [params.currency]
 * @returns {Promise<object>} Financial report details
 */
const aggregateFinancials = async ({ dateFrom, dateTo, currency = 'USD' }) => {
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const today = new Date();

  // 1. Profit & Loss Summary
  const plSummary = await calculatePLSummary({ start, end });

  // 2. Monthly Revenue and Expense Trend
  const monthlyRevenueTrend = await ExportOrder.aggregate([
    {
      $match: {
        status: 'delivered',
        orderDate: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$orderDate' } },
        revenue: { $sum: '$grandTotal' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const monthlyExpenseTrend = await Expense.aggregate([
    {
      $match: {
        expenseDate: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$expenseDate' } },
        expenses: { $sum: '$amountInBaseCurrency' } // expenses are saved in base currency
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Combine monthly trends
  const trendMap = {};
  monthlyRevenueTrend.forEach(r => {
    trendMap[r._id] = { month: r._id, revenue: Math.round(r.revenue * 100) / 100, expenses: 0 };
  });
  monthlyExpenseTrend.forEach(e => {
    if (!trendMap[e._id]) {
      trendMap[e._id] = { month: e._id, revenue: 0, expenses: 0 };
    }
    trendMap[e._id].expenses = Math.round(e.expenses * 100) / 100;
  });
  const monthlyTrend = Object.values(trendMap).sort((a, b) => a.month.localeCompare(b.month));

  // 3. Receivables Ageing (Unpaid Invoices)
  const unpaidInvoices = await Invoice.find({
    status: { $ne: 'paid' }
  }).populate('customer');

  const receivablesAgeingDetails = [];
  const receivablesAgeingSummary = {
    not_yet_due: 0,
    '0-30d': 0,
    '31-60d': 0,
    '61-90d': 0,
    '90d_plus': 0,
    total: 0
  };

  unpaidInvoices.forEach(inv => {
    const dueDate = new Date(inv.dueDate);
    const timeDiff = today.getTime() - dueDate.getTime();
    const daysOverdue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    let bucket = 'not_yet_due';
    if (daysOverdue > 90) {
      bucket = '90d_plus';
    } else if (daysOverdue > 60) {
      bucket = '61-90d';
    } else if (daysOverdue > 30) {
      bucket = '31-60d';
    } else if (daysOverdue > 0) {
      bucket = '0-30d';
    }

    const amount = inv.amountDue !== undefined ? inv.amountDue : (inv.grandTotal - inv.amountPaid);
    receivablesAgeingSummary[bucket] += amount;
    receivablesAgeingSummary.total += amount;

    receivablesAgeingDetails.push({
      id: inv._id,
      customerName: inv.customer?.companyName || inv.customer?.name || 'Unknown Customer',
      invoiceNumber: inv.invoiceNumber,
      amount: Math.round(amount * 100) / 100,
      dueDate: inv.dueDate,
      daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
      bucket
    });
  });

  // Round receivables summary values
  Object.keys(receivablesAgeingSummary).forEach(k => {
    receivablesAgeingSummary[k] = Math.round(receivablesAgeingSummary[k] * 100) / 100;
  });

  // 4. Payables Ageing (Outbound Payments status = pending)
  const pendingPayables = await Payment.find({
    type: 'outbound',
    status: 'pending'
  });

  const payablesAgeingDetails = [];
  const payablesAgeingSummary = {
    not_yet_due: 0,
    '0-30d': 0,
    '31-60d': 0,
    '61-90d': 0,
    '90d_plus': 0,
    total: 0
  };

  pendingPayables.forEach(pay => {
    const dueDate = pay.dueDate ? new Date(pay.dueDate) : today;
    const timeDiff = today.getTime() - dueDate.getTime();
    const daysOverdue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    let bucket = 'not_yet_due';
    if (daysOverdue > 90) {
      bucket = '90d_plus';
    } else if (daysOverdue > 60) {
      bucket = '61-90d';
    } else if (daysOverdue > 30) {
      bucket = '31-60d';
    } else if (daysOverdue > 0) {
      bucket = '0-30d';
    }

    const amount = pay.amountInBaseCurrency || pay.amount;
    payablesAgeingSummary[bucket] += amount;
    payablesAgeingSummary.total += amount;

    payablesAgeingDetails.push({
      id: pay._id,
      counterpartyName: pay.counterpartyName,
      paymentNumber: pay.paymentNumber,
      amount: Math.round(amount * 100) / 100,
      dueDate: pay.dueDate,
      daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
      bucket
    });
  });

  // Round payables summary values
  Object.keys(payablesAgeingSummary).forEach(k => {
    payablesAgeingSummary[k] = Math.round(payablesAgeingSummary[k] * 100) / 100;
  });

  // 5. Top 5 Expense Categories
  const expenseCategoriesAgg = await Expense.aggregate([
    {
      $match: {
        expenseDate: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amountInBaseCurrency' }
      }
    },
    { $sort: { total: -1 } }
  ]);

  const totalExpenseSum = expenseCategoriesAgg.reduce((acc, c) => acc + c.total, 0);

  const topExpenseCategories = expenseCategoriesAgg.map(item => ({
    category: item._id,
    amount: Math.round(item.total * 100) / 100,
    pctTotal: totalExpenseSum > 0 ? Math.round((item.total / totalExpenseSum) * 10000) / 100 : 0
  }));

  return {
    plSummary,
    monthlyTrend,
    receivablesAgeing: {
      details: receivablesAgeingDetails,
      summary: receivablesAgeingSummary
    },
    payablesAgeing: {
      details: payablesAgeingDetails,
      summary: payablesAgeingSummary
    },
    topExpenseCategories: topExpenseCategories.slice(0, 5)
  };
};

module.exports = { aggregateFinancials };
