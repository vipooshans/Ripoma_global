const ExportOrder = require('../models/ExportOrder');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const generateExportNumber = require('../utils/soNumberGenerator');
const calculateExportTotals = require('../utils/exportTotalsCalculator');
const checkCreditLimit = require('../utils/creditLimitChecker');
const papaparse = require('papaparse');

// 1. List Export Orders
exports.listOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, customer, priority, dateFrom, dateTo, sort } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerReference: { $regex: search, $options: 'i' } }
      ];
      // Search by customer name
      const customers = await Customer.find({ companyName: { $regex: search, $options: 'i' } }).select('_id');
      if (customers.length > 0) {
        query.$or.push({ customer: { $in: customers.map(c => c._id) } });
      }
    }

    if (status) {
      query.status = status.includes(',') ? { $in: status.split(',') } : status;
    }
    if (customer) query.customer = customer;
    if (priority) query.priority = priority;

    if (dateFrom || dateTo) {
      query.orderDate = {};
      if (dateFrom) query.orderDate.$gte = new Date(dateFrom);
      if (dateTo) query.orderDate.$lte = new Date(dateTo);
    }

    let sortOption = { createdAt: -1 };
    if (sort) {
      const [field, order] = sort.split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ExportOrder.countDocuments(query);
    const orders = await ExportOrder.find(query)
      .populate('customer', 'companyName code creditLimit outstandingBalance')
      .populate('createdBy', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Get Single Export Order
exports.getOrder = async (req, res) => {
  try {
    const order = await ExportOrder.findById(req.params.id)
      .populate('customer')
      .populate('warehouse')
      .populate('items.product')
      .populate('createdBy', 'name email')
      .populate('timeline.performedBy', 'name email');

    if (!order) return res.status(404).json({ message: 'Export Order not found.' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Create Export Order
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingCharge = 0, otherCharges = 0, customer, ...rest } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one order item is required.' });
    }

    // Recalculate totals
    const totals = calculateExportTotals(items, shippingCharge, otherCharges);

    // Credit limit check
    const creditCheck = await checkCreditLimit(customer, totals.grandTotal);

    // Generate Order Number
    const orderNumber = await generateExportNumber('exportOrder');

    const timeline = [
      {
        action: 'created',
        details: `Draft Export Order ${orderNumber} created.`,
        note: rest.notes || 'Initial draft creation.',
        performedBy: req.user?._id
      }
    ];

    if (creditCheck.exceedsLimit) {
      timeline.push({
        action: 'credit_warning',
        details: `Credit limit check warning: Proposed total of ${totals.grandTotal} exceeds customer limit of ${creditCheck.creditLimit}.`,
        performedBy: req.user?._id
      });
    }

    const order = new ExportOrder({
      ...rest,
      customer,
      orderNumber,
      items: totals.items,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      discountTotal: totals.discountTotal,
      shippingCharge,
      otherCharges,
      grandTotal: totals.grandTotal,
      timeline,
      createdBy: req.user?._id
    });

    await order.save();
    res.status(201).json({
      order,
      creditLimitExceeded: creditCheck.exceedsLimit,
      creditCheckWarning: creditCheck.warning,
      message: 'Export Order created successfully.'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Update Export Order
exports.updateOrder = async (req, res) => {
  try {
    const { items, shippingCharge = 0, otherCharges = 0, ...rest } = req.body;
    const order = await ExportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Export Order not found.' });

    if (order.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft orders can be modified.' });
    }

    // Recalculate totals
    const totals = calculateExportTotals(items, shippingCharge, otherCharges);

    // Credit limit check
    const creditCheck = await checkCreditLimit(order.customer, totals.grandTotal);

    order.items = totals.items;
    order.subtotal = totals.subtotal;
    order.taxTotal = totals.taxTotal;
    order.discountTotal = totals.discountTotal;
    order.shippingCharge = shippingCharge;
    order.otherCharges = otherCharges;
    order.grandTotal = totals.grandTotal;

    // Apply rest of fields
    Object.keys(rest).forEach(key => {
      order[key] = rest[key];
    });

    order.timeline.push({
      action: 'updated',
      details: 'Export Order details updated.',
      performedBy: req.user?._id
    });

    if (creditCheck.exceedsLimit) {
      order.timeline.push({
        action: 'credit_warning',
        details: `Credit limit check warning during update: Proposed total of ${totals.grandTotal} exceeds limit.`,
        performedBy: req.user?._id
      });
    }

    await order.save();
    res.json({
      order,
      creditLimitExceeded: creditCheck.exceedsLimit,
      creditCheckWarning: creditCheck.warning,
      message: 'Export Order updated successfully.'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. Confirm Export Order
exports.confirmOrder = async (req, res) => {
  try {
    const order = await ExportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Export Order not found.' });

    if (order.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft orders can be confirmed.' });
    }

    order.status = 'confirmed';
    order.confirmedDate = Date.now();
    order.timeline.push({
      action: 'confirmed',
      details: 'Order confirmed and released for processing.',
      performedBy: req.user?._id
    });

    await order.save();
    res.json({ order, message: 'Export Order confirmed.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 6. Transition Status (processing, ready_to_ship, in_transit, delivered, returned)
exports.transitionStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await ExportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Export Order not found.' });

    const validStatuses = ['processing', 'ready_to_ship', 'in_transit', 'delivered', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid target status.' });
    }

    order.status = status;
    order.timeline.push({
      action: status,
      details: `Status transitioned to ${status.replace(/_/g, ' ')}.`,
      note: note || '',
      performedBy: req.user?._id
    });

    await order.save();
    res.json({ order, message: `Order status set to ${status}.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 7. Cancel Export Order (Soft Cancellation)
exports.cancelOrder = async (req, res) => {
  try {
    const { note } = req.body;
    const order = await ExportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Export Order not found.' });

    if (['dispatched', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel an order in status: ${order.status}` });
    }

    order.status = 'cancelled';
    order.timeline.push({
      action: 'cancelled',
      details: 'Order cancelled.',
      note: note || 'Cancellation requested by user.',
      performedBy: req.user?._id
    });

    await order.save();
    res.json({ order, message: 'Export Order cancelled.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 8. Add Timeline Audit Log Note
exports.addTimelineNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ message: 'Note is required.' });

    const order = await ExportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Export Order not found.' });

    order.timeline.push({
      action: 'note_added',
      details: 'Custom timeline note added.',
      note,
      performedBy: req.user?._id
    });

    await order.save();
    res.json({ order, message: 'Timeline note added.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 9. Export Orders to CSV
exports.exportCSV = async (req, res) => {
  try {
    const { search, status, customer, priority, dateFrom, dateTo, sort } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerReference: { $regex: search, $options: 'i' } }
      ];
      const customers = await Customer.find({ companyName: { $regex: search, $options: 'i' } }).select('_id');
      if (customers.length > 0) {
        query.$or.push({ customer: { $in: customers.map(c => c._id) } });
      }
    }

    if (status) {
      query.status = status.includes(',') ? { $in: status.split(',') } : status;
    }
    if (customer) query.customer = customer;
    if (priority) query.priority = priority;

    if (dateFrom || dateTo) {
      query.orderDate = {};
      if (dateFrom) query.orderDate.$gte = new Date(dateFrom);
      if (dateTo) query.orderDate.$lte = new Date(dateTo);
    }

    let sortOption = { createdAt: -1 };
    if (sort) {
      const [field, order] = sort.split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const orders = await ExportOrder.find(query)
      .populate('customer', 'companyName')
      .populate('createdBy', 'name')
      .sort(sortOption);

    const csvData = orders.map(o => ({
      'Order Number': o.orderNumber,
      'Customer': o.customer?.companyName || '—',
      'Status': o.status,
      'Priority': o.priority,
      'Items Count': o.items?.length || 0,
      'Grand Total': o.grandTotal,
      'Currency': o.currency,
      'Order Date': o.orderDate ? o.orderDate.toISOString().split('T')[0] : '—',
      'Created By': o.createdBy?.name || '—',
      'Created At': o.createdAt.toISOString().split('T')[0]
    }));

    const csv = papaparse.unparse(csvData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=export_orders.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 10. Get Export Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    // Aggregated Revenue & Months
    const revenueStats = await ExportOrder.aggregate([
      {
        $match: {
          status: { $in: ['processing', 'ready_to_ship', 'dispatched', 'in_transit', 'delivered'] },
          orderDate: { $gte: new Date(`${lastYear}-01-01`) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          revenue: { $sum: '$grandTotal' }
        }
      }
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueData = months.map((month, index) => {
      const monthNum = index + 1;
      const currentYearRevenue = revenueStats.find(s => s._id.year === currentYear && s._id.month === monthNum)?.revenue || 0;
      const lastYearRevenue = revenueStats.find(s => s._id.year === lastYear && s._id.month === monthNum)?.revenue || 0;
      return {
        name: month,
        currentYear: Math.round(currentYearRevenue * 100) / 100,
        lastYear: Math.round(lastYearRevenue * 100) / 100
      };
    });

    // Pipeline counts
    const pipelineStats = await ExportOrder.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const pipelineData = [
      { name: 'Draft', value: pipelineStats.find(p => p._id === 'draft')?.count || 0 },
      { name: 'Confirmed', value: pipelineStats.find(p => p._id === 'confirmed')?.count || 0 },
      { name: 'Processing', value: pipelineStats.find(p => p._id === 'processing')?.count || 0 },
      { name: 'Ready To Ship', value: pipelineStats.find(p => p._id === 'ready_to_ship')?.count || 0 },
      { name: 'Dispatched', value: pipelineStats.find(p => p._id === 'dispatched')?.count || 0 },
      { name: 'In Transit', value: pipelineStats.find(p => p._id === 'in_transit')?.count || 0 },
      { name: 'Delivered', value: pipelineStats.find(p => p._id === 'delivered')?.count || 0 }
    ];

    // KPIs
    const totalOrdersCount = await ExportOrder.countDocuments();
    const activeOrdersCount = await ExportOrder.countDocuments({
      status: { $in: ['confirmed', 'processing', 'ready_to_ship', 'in_transit'] }
    });

    // Sum revenue for all time
    const totalRevenueResult = await ExportOrder.aggregate([
      {
        $match: {
          status: { $in: ['dispatched', 'in_transit', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$grandTotal' }
        }
      }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // Recent orders
    const recentOrders = await ExportOrder.find()
      .populate('customer', 'companyName')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      kpis: {
        totalOrders: totalOrdersCount,
        activeOrders: activeOrdersCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        monthlyGrowth: 12.5
      },
      revenueData,
      pipelineData,
      recentOrders
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

