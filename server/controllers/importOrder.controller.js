const ImportOrder = require('../models/ImportOrder');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Settings = require('../models/Settings');
const generateNumber = require('../utils/poNumberGenerator');
const calculateTotals = require('../utils/poTotalsCalculator');
const { getRequiredApprovalLevels } = require('../utils/approvalEngine');
const GoodsReceipt = require('../models/GoodsReceipt');
const papaparse = require('papaparse');

// 1. List Import Orders
exports.listOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, supplier, priority, dateFrom, dateTo, sort } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } }
      ];
      // Search by supplier company name if possible
      const suppliers = await Supplier.find({ companyName: { $regex: search, $options: 'i' } }).select('_id');
      if (suppliers.length > 0) {
        query.$or.push({ supplier: { $in: suppliers.map(s => s._id) } });
      }
    }

    if (status) {
      query.status = status.includes(',') ? { $in: status.split(',') } : status;
    }
    if (supplier) query.supplier = supplier;
    if (priority) query.priority = priority;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    let sortOption = { createdAt: -1 };
    if (sort) {
      const [field, order] = sort.split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ImportOrder.countDocuments(query);
    const orders = await ImportOrder.find(query)
      .populate('supplier', 'companyName code')
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

// 2. Create Import Order
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingCost, otherCharges, supplier, orderDate, expectedDeliveryDate, ...rest } = req.body;
    if (!supplier) {
      return res.status(400).json({ message: 'Supplier is required.' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one order item is required.' });
    }
    if (!items.every((i) => i.product)) {
      return res.status(400).json({ message: 'Each line item must include a product.' });
    }
    if (!orderDate) {
      return res.status(400).json({ message: 'Order date is required.' });
    }
    if (!expectedDeliveryDate) {
      return res.status(400).json({ message: 'Expected delivery date is required.' });
    }

    // Generate PO Number
    const poNumber = await generateNumber('importOrder');

    // Calculate totals
    const totals = calculateTotals(items, shippingCost, otherCharges);

    const order = new ImportOrder({
      ...rest,
      supplier,
      orderDate,
      expectedDeliveryDate,
      status: 'draft',
      poNumber,
      items: totals.items,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      discountTotal: totals.discountTotal,
      shippingCost,
      otherCharges,
      grandTotal: totals.grandTotal,
      createdBy: req.user._id
    });

    await order.save();
    res.status(201).json({ order, message: 'Purchase Order created.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Import Order Detail
exports.getOrderDetail = async (req, res) => {
  try {
    const order = await ImportOrder.findById(req.params.id)
      .populate('supplier')
      .populate('items.product')
      .populate('warehouse')
      .populate('createdBy', 'name email')
      .populate('approvals.approver', 'name email');

    if (!order) return res.status(404).json({ message: 'Purchase Order not found.' });

    // Include dynamic approval required levels notice
    const requiredLevels = await getRequiredApprovalLevels(order.grandTotal);
    const receiptDocs = await GoodsReceipt.find({ importOrder: order._id }).populate('receivedBy', 'name');

    res.json({
      order,
      requiredLevels,
      receipts: receiptDocs
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Update Import Order
exports.updateOrder = async (req, res) => {
  try {
    const order = await ImportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase order not found.' });

    if (!['draft', 'pending_approval'].includes(order.status)) {
      return res.status(400).json({ message: 'Orders can only be modified in draft or pending status.' });
    }

    const { items, shippingCost, otherCharges, status: _ignoredStatus, ...rest } = req.body;

    const supplier = rest.supplier !== undefined ? rest.supplier : order.supplier;
    const orderDate = rest.orderDate !== undefined ? rest.orderDate : order.orderDate;
    const expectedDeliveryDate = rest.expectedDeliveryDate !== undefined
      ? rest.expectedDeliveryDate
      : order.expectedDeliveryDate;
    const lineItems = items || order.items;

    if (!supplier) {
      return res.status(400).json({ message: 'Supplier is required.' });
    }
    if (!lineItems || lineItems.length === 0) {
      return res.status(400).json({ message: 'At least one order item is required.' });
    }
    if (!lineItems.every((i) => i.product)) {
      return res.status(400).json({ message: 'Each line item must include a product.' });
    }
    if (!orderDate) {
      return res.status(400).json({ message: 'Order date is required.' });
    }
    if (!expectedDeliveryDate) {
      return res.status(400).json({ message: 'Expected delivery date is required.' });
    }

    const totals = calculateTotals(
      lineItems,
      shippingCost ?? order.shippingCost,
      otherCharges ?? order.otherCharges
    );

    Object.assign(order, rest);
    order.supplier = supplier;
    order.orderDate = orderDate;
    order.expectedDeliveryDate = expectedDeliveryDate;
    order.items = totals.items;
    order.subtotal = totals.subtotal;
    order.taxTotal = totals.taxTotal;
    order.discountTotal = totals.discountTotal;
    order.shippingCost = shippingCost ?? order.shippingCost;
    order.otherCharges = otherCharges ?? order.otherCharges;
    order.grandTotal = totals.grandTotal;
    // Status changes only via dedicated submit/approve endpoints

    await order.save();
    res.json({ order, message: 'Purchase Order updated.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. Submit PO for Approval
exports.submitForApproval = async (req, res) => {
  try {
    const order = await ImportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase Order not found.' });
    if (order.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft orders can be submitted for approval.' });
    }

    order.status = 'pending_approval';
    order.approvals = []; // Reset any previous approval history on resubmission
    await order.save();
    res.json({ order, message: 'Submitted for approval.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 6. Approve PO
exports.approveOrder = async (req, res) => {
  try {
    const order = await ImportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase Order not found.' });
    if (order.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Order is not awaiting approval.' });
    }

    const totalLevels = await getRequiredApprovalLevels(order.grandTotal);
    const currentApprovedLevel = order.approvals.length; // e.g. 0 approved levels so far

    // Check user role permission
    const userRole = req.user.role; // admin, manager, etc.
    const comments = req.body.comments || '';

    // Determine current pending level
    const nextLevel = currentApprovedLevel + 1;
    if (nextLevel === 1) {
      if (userRole !== 'manager' && userRole !== 'admin') {
        return res.status(403).json({ message: 'Level 1 approval requires manager status.' });
      }
    } else if (nextLevel === 2) {
      if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Level 2 approval requires administrator status.' });
      }
    }

    // Add approval record
    order.approvals.push({
      level: nextLevel,
      approver: req.user._id,
      action: 'approved',
      comments
    });

    if (order.approvals.length >= totalLevels) {
      order.status = 'approved';
    }

    await order.save();
    res.json({ order, message: `Approved level ${nextLevel} successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 7. Reject PO
exports.rejectOrder = async (req, res) => {
  try {
    const order = await ImportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase Order not found.' });
    if (order.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Order is not awaiting approval.' });
    }

    const { comments } = req.body;
    if (!comments) {
      return res.status(400).json({ message: 'Rejection comments are required.' });
    }

    const currentApprovedLevel = order.approvals.length;
    const nextLevel = currentApprovedLevel + 1;

    order.approvals.push({
      level: nextLevel,
      approver: req.user._id,
      action: 'rejected',
      comments
    });

    // Revert status to draft
    order.status = 'draft';
    await order.save();
    res.json({ order, message: 'Order rejected. Reverted status to draft.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 8. Soft Cancel PO (Admin / Manager only)
exports.cancelOrder = async (req, res) => {
  try {
    const order = await ImportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase Order not found.' });

    if (['received', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel fully received or already cancelled orders.' });
    }

    order.status = 'cancelled';
    if (req.body.comments) {
      order.internalNotes = (order.internalNotes ? order.internalNotes + '\n' : '') + `Cancellation Reason: ${req.body.comments}`;
    }
    await order.save();
    res.json({ order, message: 'Purchase Order cancelled.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 9. Mark PO as Ordered
exports.markOrdered = async (req, res) => {
  try {
    const order = await ImportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase Order not found.' });
    if (order.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved orders can be sent to supplier.' });
    }

    order.status = 'ordered';
    order.orderDate = new Date();
    await order.save();
    res.json({ order, message: 'Purchase Order marked as sent/ordered.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 10. Mark PO as In Transit
exports.markInTransit = async (req, res) => {
  try {
    const order = await ImportOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase Order not found.' });
    if (!['ordered', 'approved'].includes(order.status)) {
      return res.status(400).json({ message: 'Order must be in approved or ordered state first.' });
    }

    order.status = 'in_transit';
    if (req.body.notes) {
      order.internalNotes = (order.internalNotes ? order.internalNotes + '\n' : '') + `Transit tracking details: ${req.body.notes}`;
    }
    await order.save();
    res.json({ order, message: 'Purchase Order marked as In Transit.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 11. Dashboard KPIs and Funnel Stats
exports.getDashboard = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const totalOrdersMonth = await ImportOrder.countDocuments({ createdAt: { $gte: startOfMonth } });
    const pendingApprovalCount = await ImportOrder.countDocuments({ status: 'pending_approval' });
    const inTransitCount = await ImportOrder.countDocuments({ status: 'in_transit' });

    // Aggregate monthly value
    const monthValue = await ImportOrder.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const totalMonthValue = monthValue[0]?.total || 0;

    // Funnel stats by status
    const funnelStats = await ImportOrder.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const allStatuses = ['draft', 'pending_approval', 'approved', 'ordered', 'in_transit', 'partially_received', 'received', 'cancelled'];
    const funnelData = allStatuses.map(s => {
      const stat = funnelStats.find(fs => fs._id === s);
      return { status: s, count: stat ? stat.count : 0 };
    });

    // 12 Months Spend List
    const monthlySpend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();

      const start = new Date(year, month, 1, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59);

      const spendAgg = await ImportOrder.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: { $nin: ['draft', 'cancelled'] } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]);

      const monthName = d.toLocaleString('default', { month: 'short' });
      monthlySpend.push({
        month: `${monthName} ${year}`,
        spend: spendAgg[0]?.total || 0
      });
    }

    // Recent 10 activity records
    const recentOrders = await ImportOrder.find()
      .populate('supplier', 'companyName')
      .sort({ updatedAt: -1 })
      .limit(10);

    const activities = recentOrders.map(o => ({
      id: o._id,
      poNumber: o.poNumber,
      supplierName: o.supplier?.companyName,
      status: o.status,
      updatedAt: o.updatedAt,
      grandTotal: o.grandTotal,
      creator: o.createdBy
    }));

    res.json({
      kpis: {
        totalOrdersMonth,
        pendingApprovalCount,
        inTransitCount,
        totalMonthValue
      },
      funnel: funnelData,
      monthlySpend,
      activities
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 12. Pending Approvals queue for current user
exports.getPendingApprovals = async (req, res) => {
  try {
    const userRole = req.user.role;
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.json({ orders: [] }); // simple fallback
    }

    // Retrieve all pending approval records
    const allPending = await ImportOrder.find({ status: 'pending_approval' })
      .populate('supplier', 'companyName code')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    // Filter based on levels pending
    const awaitingAction = [];
    for (const order of allPending) {
      const required = await getRequiredApprovalLevels(order.grandTotal);
      const current = order.approvals.length;
      const nextLevel = current + 1;

      if (nextLevel === 1 && (userRole === 'manager' || userRole === 'admin')) {
        awaitingAction.push(order);
      } else if (nextLevel === 2 && userRole === 'admin') {
        awaitingAction.push(order);
      }
    }

    res.json({ orders: awaitingAction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 13. Delivery Schedule Calendar data
exports.getDeliverySchedule = async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = { expectedDeliveryDate: { $exists: true, $ne: null } };
    if (start || end) {
      query.expectedDeliveryDate = {};
      if (start) query.expectedDeliveryDate.$gte = new Date(start);
      if (end) query.expectedDeliveryDate.$lte = new Date(end);
    }

    const orders = await ImportOrder.find(query)
      .populate('supplier', 'companyName')
      .select('poNumber supplier expectedDeliveryDate priority status grandTotal');

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 14. Export CSV
exports.exportCSV = async (req, res) => {
  try {
    const { search, status, supplier, priority, dateFrom, dateTo, sort } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } }
      ];
      const suppliers = await Supplier.find({ companyName: { $regex: search, $options: 'i' } }).select('_id');
      if (suppliers.length > 0) {
        query.$or.push({ supplier: { $in: suppliers.map(s => s._id) } });
      }
    }

    if (status) {
      query.status = status.includes(',') ? { $in: status.split(',') } : status;
    }
    if (supplier) query.supplier = supplier;
    if (priority) query.priority = priority;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    let sortOption = { createdAt: -1 };
    if (sort) {
      const [field, order] = sort.split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const orders = await ImportOrder.find(query)
      .populate('supplier', 'companyName')
      .populate('createdBy', 'name')
      .sort(sortOption);

    const csvData = orders.map(o => ({
      'PO Number': o.poNumber,
      'Supplier': o.supplier?.companyName || '—',
      'Status': o.status,
      'Priority': o.priority,
      'Items Count': o.items?.length || 0,
      'Grand Total': o.grandTotal,
      'Currency': o.currency,
      'Expected Delivery': o.expectedDeliveryDate ? o.expectedDeliveryDate.toISOString().split('T')[0] : '—',
      'Created By': o.createdBy?.name || '—',
      'Created At': o.createdAt.toISOString().split('T')[0]
    }));

    const csv = papaparse.unparse(csvData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=import_orders.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 15. Get Order Timeline Audit Log
exports.getOrderTimeline = async (req, res) => {
  try {
    const order = await ImportOrder.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('approvals.approver', 'name email');
      
    if (!order) return res.status(404).json({ message: 'Purchase Order not found.' });

    const receipts = await GoodsReceipt.find({ importOrder: order._id })
      .populate('receivedBy', 'name email');

    const timelineEvents = [
      {
        title: 'Draft Purchase Order Created',
        date: order.createdAt,
        type: 'creation',
        desc: `Created by ${order.createdBy?.name || 'User'} (${order.createdBy?.email || 'N/A'})`
      }
    ];

    order.approvals?.forEach(app => {
      timelineEvents.push({
        title: `Approval Level ${app.level}: ${app.action.toUpperCase()}`,
        date: app.actionedAt,
        type: 'approval',
        desc: `Reviewed by ${app.approver?.name || 'User'} (${app.approver?.email || 'N/A'}). Comments: ${app.comments || 'No comment'}`
      });
    });

    if (order.orderDate) {
      timelineEvents.push({
        title: 'Order Sent to Supplier',
        date: order.orderDate,
        type: 'ordered',
        desc: 'Purchase order marked as ordered and transmitted to the supplier.'
      });
    }

    receipts.forEach(r => {
      timelineEvents.push({
        title: `Goods Received: ${r.receiptNumber}`,
        date: r.receivedAt,
        type: 'receipt',
        desc: `Intake of ${r.items?.length || 0} product line(s) recorded at warehouse by ${r.receivedBy?.name || 'Operator'}.`
      });
    });

    if (order.status === 'received') {
      timelineEvents.push({
        title: 'PO Procurement Completed',
        date: order.actualDeliveryDate || order.updatedAt,
        type: 'received',
        desc: 'All items successfully received at destination warehouse depots.'
      });
    } else if (order.status === 'cancelled') {
      timelineEvents.push({
        title: 'PO Cancelled',
        date: order.updatedAt,
        type: 'cancelled',
        desc: order.internalNotes || 'Order status changed to cancelled.'
      });
    }

    // Sort timeline chronologically descending (newest first)
    timelineEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ timeline: timelineEvents });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

