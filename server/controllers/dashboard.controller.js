const mongoose = require('mongoose');
const ExportOrder = require('../models/ExportOrder');
const ImportOrder = require('../models/ImportOrder');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Reminder = require('../models/Reminder');
const Document = require('../models/Document');
const Product = require('../models/Product');
const InventoryItem = require('../models/InventoryItem');
const ActivityLog = require('../models/ActivityLog');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const { getStockValue } = require('../utils/stockCalculator');

// GET /api/dashboard/kpis
exports.getKpis = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const startOfPriorMonth = new Date(startOfMonth);
    startOfPriorMonth.setUTCMonth(startOfPriorMonth.getUTCMonth() - 1);
    const endOfPriorMonth = new Date(startOfMonth);

    const [
      revenueAggr,
      priorRevenueAggr,
      activeImportCount,
      pendingApprovalCount,
      activeExportCount,
      readyToShipCount,
      stockValue,
      lowStockCountResult,
      receivablesAggr,
      overdueCount,
      payablesAggr,
      unreadCount
    ] = await Promise.all([
      // 1. Revenue MTD
      ExportOrder.aggregate([
        { $match: { status: 'delivered', orderDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      // 2. Prior month revenue
      ExportOrder.aggregate([
        { $match: { status: 'delivered', orderDate: { $gte: startOfPriorMonth, $lt: endOfPriorMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      // 3. Active Import Orders
      ImportOrder.countDocuments({ status: { $nin: ['received', 'cancelled'] } }),
      // 4. Pending Approval Import Orders
      ImportOrder.countDocuments({ status: 'pending_approval' }),
      // 5. Active Export Orders
      ExportOrder.countDocuments({ status: { $nin: ['delivered', 'cancelled', 'returned'] } }),
      // 6. Ready to Ship Export Orders
      ExportOrder.countDocuments({ status: 'ready_to_ship' }),
      // 7. Inventory Value
      getStockValue(),
      // 8. Low Stock Products Count
      (async () => {
        const activeProducts = await Product.find({ status: 'active', deleted: false });
        let count = 0;
        for (const p of activeProducts) {
          const items = await InventoryItem.find({ product: p._id });
          const totalQty = items.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);
          if (totalQty <= (p.lowStockThreshold || 10)) {
            count++;
          }
        }
        return count;
      })(),
      // 9. Outstanding Receivables
      Invoice.aggregate([
        { $match: { status: { $nin: ['paid', 'cancelled'] } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$grandTotal', '$amountPaid'] } } } }
      ]),
      // 10. Overdue Receivables count
      Invoice.countDocuments({ status: 'overdue' }),
      // 11. Outstanding Payables
      Payment.aggregate([
        { $match: { type: 'outbound', status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // 12. Unread notifications
      Notification.countDocuments({ recipient: req.user._id, isRead: false })
    ]);

    const revenueValue = revenueAggr[0]?.total || 0;
    const priorRevenueValue = priorRevenueAggr[0]?.total || 0;
    const trendPercent = priorRevenueValue > 0 
      ? Math.round(((revenueValue - priorRevenueValue) / priorRevenueValue) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      revenueMTD: { value: revenueValue, currency: 'LKR', trendPercent },
      activeImportOrders: { count: activeImportCount, pendingApproval: pendingApprovalCount },
      activeExportOrders: { count: activeExportCount, readyToShip: readyToShipCount },
      inventoryValue: { value: stockValue, currency: 'LKR', lowStockCount: lowStockCountResult },
      outstandingReceivables: { 
        value: receivablesAggr[0]?.total || 0, 
        currency: 'LKR', 
        overdueCount 
      },
      outstandingPayables: { value: payablesAggr[0]?.total || 0, currency: 'LKR' },
      unreadNotifications: { count: unreadCount }
    });
  } catch (error) {
    console.error('[DASHBOARD CONTROLLER] getKpis error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving KPIs' });
  }
};

// GET /api/dashboard/alerts
exports.getAlerts = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      overdueInvoicesAggr,
      overduePaymentsAggr,
      lowStockCount,
      expiringDocumentsCount,
      pendingApprovalsCount
    ] = await Promise.all([
      Invoice.aggregate([
        { $match: { status: 'overdue' } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: { $subtract: ['$grandTotal', '$amountPaid'] } } } }
      ]),
      Payment.aggregate([
        { $match: { type: 'outbound', status: 'pending', isOverdue: true } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }
      ]),
      (async () => {
        const activeProducts = await Product.find({ status: 'active', deleted: false });
        let count = 0;
        for (const p of activeProducts) {
          const items = await InventoryItem.find({ product: p._id });
          const totalQty = items.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);
          if (totalQty <= (p.lowStockThreshold || 10)) {
            count++;
          }
        }
        return count;
      })(),
      Document.countDocuments({
        expiryDate: { $gt: now, $lte: thirtyDaysFromNow },
        isExpired: false,
        isDeleted: false
      }),
      ImportOrder.countDocuments({ status: 'pending_approval' })
    ]);

    res.status(200).json({
      success: true,
      alerts: {
        overdueInvoices: {
          count: overdueInvoicesAggr[0]?.count || 0,
          totalAmount: overdueInvoicesAggr[0]?.total || 0
        },
        overduePayments: {
          count: overduePaymentsAggr[0]?.count || 0,
          totalAmount: overduePaymentsAggr[0]?.total || 0
        },
        lowStockProducts: { count: lowStockCount },
        expiringDocuments: { count: expiringDocumentsCount },
        pendingApprovals: ['admin', 'manager'].includes(req.user.role) ? pendingApprovalsCount : 0
      }
    });
  } catch (error) {
    console.error('[DASHBOARD CONTROLLER] getAlerts error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving dashboard alerts' });
  }
};

// GET /api/dashboard/chart-data
exports.getChartData = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 5);
    sixMonthsAgo.setUTCDate(1);
    sixMonthsAgo.setUTCHours(0, 0, 0, 0);

    const [revenueByMonth, expensesByMonth, importOrders, exportOrders] = await Promise.all([
      ExportOrder.aggregate([
        { $match: { status: 'delivered', orderDate: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$orderDate' },
              month: { $month: '$orderDate' }
            },
            total: { $sum: '$grandTotal' }
          }
        }
      ]),
      Payment.aggregate([
        { $match: { type: 'outbound', status: 'completed', paymentDate: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$paymentDate' },
              month: { $month: '$paymentDate' }
            },
            total: { $sum: '$amount' }
          }
        }
      ]),
      ImportOrder.find({}).lean(),
      ExportOrder.find({}).lean()
    ]);

    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setUTCMonth(d.getUTCMonth() + i);
      const yr = d.getUTCFullYear();
      const mo = d.getUTCMonth() + 1;
      const label = `${monthNames[mo - 1]} ${yr}`;

      const revItem = revenueByMonth.find(r => r._id.year === yr && r._id.month === mo);
      const expItem = expensesByMonth.find(e => e._id.year === yr && e._id.month === mo);

      months.push({
        month: label,
        revenue: revItem ? revItem.total : 0,
        expenses: expItem ? expItem.total : 0
      });
    }

    const importPipeline = { draft: 0, approved: 0, inTransit: 0, received: 0 };
    const exportPipeline = { draft: 0, confirmed: 0, dispatched: 0, delivered: 0 };

    importOrders.forEach(o => {
      if (o.status === 'draft') importPipeline.draft++;
      else if (['pending_approval', 'approved', 'ordered'].includes(o.status)) importPipeline.approved++;
      else if (o.status === 'in_transit') importPipeline.inTransit++;
      else if (['partially_received', 'received'].includes(o.status)) importPipeline.received++;
    });

    exportOrders.forEach(o => {
      if (o.status === 'draft') exportPipeline.draft++;
      else if (['confirmed', 'processing', 'ready_to_ship'].includes(o.status)) exportPipeline.confirmed++;
      else if (['dispatched', 'in_transit'].includes(o.status)) exportPipeline.dispatched++;
      else if (o.status === 'delivered') exportPipeline.delivered++;
    });

    res.status(200).json({
      success: true,
      revenueVsExpenses: months,
      orderPipeline: {
        import: importPipeline,
        export: exportPipeline
      }
    });
  } catch (error) {
    console.error('[DASHBOARD CONTROLLER] getChartData error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving chart data' });
  }
};

// GET /api/dashboard/needs-attention
exports.getNeedsAttention = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);

    const [
      pendingApprovalsCount,
      overdueInvoicesCount,
      overduePaymentsCount,
      remindersTodayCount,
      expiringDocumentsCount
    ] = await Promise.all([
      ImportOrder.countDocuments({ status: 'pending_approval' }),
      Invoice.countDocuments({ status: 'overdue' }),
      Payment.countDocuments({ type: 'outbound', status: 'pending', isOverdue: true }),
      Reminder.countDocuments({
        $or: [
          { createdBy: req.user._id },
          { assignedTo: req.user._id }
        ],
        status: { $in: ['pending', 'snoozed'] },
        $or: [
          { dueAt: { $gte: startOfToday, $lte: endOfToday } },
          { snoozeUntil: { $gte: startOfToday, $lte: endOfToday } }
        ]
      }),
      Document.countDocuments({
        expiryDate: { $gt: now, $lte: sevenDaysFromNow },
        isExpired: false,
        isDeleted: false
      })
    ]);

    const isManagerOrAdmin = ['admin', 'manager'].includes(req.user.role);

    res.status(200).json({
      success: true,
      pendingApprovals: isManagerOrAdmin ? pendingApprovalsCount : 0,
      overdueInvoices: overdueInvoicesCount,
      overduePayments: overduePaymentsCount,
      remindersToday: remindersTodayCount,
      expiringDocuments7d: expiringDocumentsCount
    });
  } catch (error) {
    console.error('[DASHBOARD CONTROLLER] getNeedsAttention error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving attention items' });
  }
};

// GET /api/search
exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(200).json({ 
        success: true, 
        results: { orders: [], products: [], contacts: [] } 
      });
    }

    const regex = new RegExp(q, 'i');

    const [importOrders, exportOrders, products, customers, suppliers] = await Promise.all([
      ImportOrder.find({ $or: [{ poNumber: regex }, { status: regex }] }).limit(5).lean(),
      ExportOrder.find({ $or: [{ orderNumber: regex }, { status: regex }] }).limit(5).lean(),
      Product.find({ deleted: false, $or: [{ name: regex }, { sku: regex }] }).limit(5).lean(),
      Customer.find({ $or: [{ companyName: regex }, { contactName: regex }, { email: regex }] }).limit(5).lean(),
      Supplier.find({ $or: [{ companyName: regex }, { contactName: regex }, { email: regex }] }).limit(5).lean()
    ]);

    const results = {
      orders: [
        ...importOrders.map(io => ({ 
          id: io._id, 
          title: io.poNumber, 
          subtitle: `Import Order · ${io.status}`, 
          url: `/imports/orders/${io._id}` 
        })),
        ...exportOrders.map(eo => ({ 
          id: eo._id, 
          title: eo.orderNumber, 
          subtitle: `Export Order · ${eo.status}`, 
          url: `/exports/orders/${eo._id}` 
        }))
      ],
      products: products.map(p => ({ 
        id: p._id, 
        title: p.name, 
        subtitle: `Product · SKU: ${p.sku}`, 
        url: `/inventory/products/${p._id}` 
      })),
      contacts: [
        ...customers.map(c => ({ 
          id: c._id, 
          title: c.companyName, 
          subtitle: `Customer · ${c.contactName}`, 
          url: `/customers/${c._id}` 
        })),
        ...suppliers.map(s => ({ 
          id: s._id, 
          title: s.companyName, 
          subtitle: `Supplier · ${s.contactName}`, 
          url: `/suppliers/${s._id}` 
        }))
      ]
    };

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('[DASHBOARD CONTROLLER] globalSearch error:', error);
    res.status(500).json({ success: false, message: 'Server error running search query' });
  }
};
