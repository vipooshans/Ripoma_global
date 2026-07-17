const mongoose = require('mongoose');
const Dispatch = require('../models/Dispatch');
const ExportOrder = require('../models/ExportOrder');
const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const Customer = require('../models/Customer');
const generateExportNumber = require('../utils/soNumberGenerator');

// 1. Create Dispatch Shipment
exports.createDispatch = async (req, res) => {
  const {
    exportOrderId,
    carrier,
    trackingNumber,
    trackingUrl,
    shippingMethod,
    items,
    dispatchDate,
    estimatedArrival,
    originAddress,
    destinationAddress,
    weight,
    volume,
    numberOfPackages,
    notes
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'At least one item is required for dispatch.' });
  }

  const order = await ExportOrder.findById(exportOrderId);
  if (!order) return res.status(404).json({ message: 'Export Order not found.' });

  if (['draft', 'cancelled'].includes(order.status)) {
    return res.status(400).json({ message: `Cannot dispatch an order in status: ${order.status}` });
  }

  if (!['partial', 'paid'].includes(order.paymentStatus)) {
    return res.status(400).json({
      message: 'Payment confirmation required before dispatch. Order payment status must be partial or paid.'
    });
  }

  // Generate Dispatch Number
  const dispatchNumber = await generateExportNumber('dispatch');

  // We write a helper that runs inside or outside a transaction session
  const runDispatchOperation = async (sessionObj) => {
    const saveOpts = sessionObj ? { session: sessionObj } : {};

    // 1. Create the Dispatch record
    const dispatch = new Dispatch({
      dispatchNumber,
      exportOrder: order._id,
      status: 'pending',
      carrier,
      trackingNumber,
      trackingUrl,
      shippingMethod: shippingMethod || order.shippingMethod,
      items,
      dispatchDate: dispatchDate || Date.now(),
      estimatedArrival,
      originAddress: originAddress || {
        street: 'Main Warehouse Depot',
        city: 'Ripoma City',
        country: 'Global'
      },
      destinationAddress: destinationAddress || order.shippingAddress,
      weight,
      volume,
      numberOfPackages,
      notes,
      dispatchedBy: req.user?._id
    });
    await dispatch.save(saveOpts);

    // 2. Adjust inventory only if not already deducted on confirm
    for (const item of items) {
      if (!order.stockDeductedOnConfirm) {
        const inventoryItem = await InventoryItem.findOne({
          product: item.product,
          warehouse: order.warehouse
        }).session(sessionObj);

        if (!inventoryItem) {
          throw new Error(`Inventory item record not found for product ${item.product} in warehouse ${order.warehouse}`);
        }

        if (inventoryItem.quantityOnHand < item.quantityDispatched) {
          throw new Error(`Insufficient stock for product in warehouse.`);
        }

        const quantityBefore = inventoryItem.quantityOnHand;
        inventoryItem.quantityOnHand -= item.quantityDispatched;
        await inventoryItem.save(saveOpts);

        const movement = new StockMovement({
          product: item.product,
          warehouse: order.warehouse,
          type: 'issue',
          quantity: -item.quantityDispatched,
          quantityBefore,
          quantityAfter: inventoryItem.quantityOnHand,
          reference: dispatchNumber,
          note: `Dispatched in shipment ${dispatchNumber} for Export Order ${order.orderNumber}`,
          performedBy: req.user?._id
        });
        await movement.save(saveOpts);
      }

      // Update ExportOrder quantityDispatched
      const orderItem = order.items.find(i => i.product.toString() === item.product.toString());
      if (orderItem) {
        const remaining = orderItem.quantityOrdered - (orderItem.quantityDispatched || 0);
        if (item.quantityDispatched > remaining) {
          throw new Error(`Cannot dispatch more than remaining ordered quantity for a line item.`);
        }
        orderItem.quantityDispatched += item.quantityDispatched;
      }
    }

    // 3. Update Order Status
    let allFullyDispatched = true;
    let anyDispatched = false;
    order.items.forEach(item => {
      if (item.quantityDispatched < item.quantityOrdered) {
        allFullyDispatched = false;
      }
      if (item.quantityDispatched > 0) {
        anyDispatched = true;
      }
    });

    order.status = allFullyDispatched ? 'dispatched' : 'processing';
    order.timeline.push({
      action: 'dispatch_created',
      details: `Dispatch shipment ${dispatchNumber} created. Order status set to ${order.status}.`,
      performedBy: req.user?._id
    });
    await order.save(saveOpts);

    // 4. Update Customer Outstanding Balance on FIRST dispatch release
    const existingDispatchesCount = await Dispatch.countDocuments({
      exportOrder: order._id,
      _id: { $ne: dispatch._id }
    }).session(sessionObj);

    if (existingDispatchesCount === 0) {
      await Customer.findByIdAndUpdate(order.customer, {
        $inc: { outstandingBalance: order.grandTotal }
      }, saveOpts);
    }

    return dispatch;
  };

  // Run operation inside transactional session
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await runDispatchOperation(session);
    await session.commitTransaction();
    session.endSession();
    
    return res.status(201).json({ dispatch: result, message: 'Dispatch recorded successfully.' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Check if error is related to replica sets/transactions not supported by developer MongoDB instance
    if (error.message.includes('replica set') || error.message.includes('transaction') || error.message.includes('Transaction')) {
      console.warn('[TRANSACTION FALLBACK] Executing dispatch creation without db transaction.');
      try {
        const fallbackResult = await runDispatchOperation(null);
        return res.status(201).json({ dispatch: fallbackResult, message: 'Dispatch recorded successfully (non-transactional).' });
      } catch (fallbackError) {
        return res.status(500).json({ message: fallbackError.message });
      }
    }

    return res.status(400).json({ message: error.message });
  }
};

// 2. List Dispatches
exports.listDispatches = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, exportOrder, dateFrom, dateTo } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { dispatchNumber: { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } },
        { carrier: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (exportOrder) query.exportOrder = exportOrder;

    if (dateFrom || dateTo) {
      query.dispatchDate = {};
      if (dateFrom) query.dispatchDate.$gte = new Date(dateFrom);
      if (dateTo) query.dispatchDate.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Dispatch.countDocuments(query);
    const dispatches = await Dispatch.find(query)
      .populate('exportOrder', 'orderNumber status customer')
      .populate('dispatchedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      dispatches,
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

// 3. Get Dispatch Details
exports.getDispatch = async (req, res) => {
  try {
    const dispatch = await Dispatch.findById(req.params.id)
      .populate({
        path: 'exportOrder',
        populate: { path: 'customer' }
      })
      .populate('items.product')
      .populate('dispatchedBy', 'name email');

    if (!dispatch) return res.status(404).json({ message: 'Dispatch record not found.' });
    res.json(dispatch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Update Dispatch Status
exports.updateDispatchStatus = async (req, res) => {
  try {
    const { status, trackingNumber, trackingUrl, actualArrival, note } = req.body;
    const dispatch = await Dispatch.findById(req.params.id);
    if (!dispatch) return res.status(404).json({ message: 'Dispatch record not found.' });

    const validStatuses = ['pending', 'handed_to_carrier', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid dispatch status.' });
    }

    if (status) dispatch.status = status;
    if (trackingNumber) dispatch.trackingNumber = trackingNumber;
    if (trackingUrl) dispatch.trackingUrl = trackingUrl;
    if (actualArrival) dispatch.actualArrival = actualArrival;

    if (status === 'delivered' && !dispatch.actualArrival) {
      dispatch.actualArrival = Date.now();
    }

    await dispatch.save();

    // Log update in parent order timeline
    const order = await ExportOrder.findById(dispatch.exportOrder);
    if (order) {
      order.timeline.push({
        action: `dispatch_${dispatch.status}`,
        details: `Shipment ${dispatch.dispatchNumber} status set to ${dispatch.status.replace(/_/g, ' ')}.`,
        note: note || '',
        performedBy: req.user?._id
      });

      // If dispatch is delivered, see if order status should advance
      if (dispatch.status === 'delivered') {
        // Let's set order status to delivered if all dispatches are delivered
        const allDispatches = await Dispatch.find({ exportOrder: order._id });
        const allDelivered = allDispatches.every(d => d.status === 'delivered');
        
        if (allDelivered) {
          order.status = 'delivered';
          order.timeline.push({
            action: 'delivered',
            details: 'All shipments delivered. Order status set to Delivered.',
            performedBy: req.user?._id
          });
        } else {
          order.status = 'in_transit'; // If at least one dispatch is delivered or in transit
        }
      } else if (['handed_to_carrier', 'in_transit', 'out_for_delivery'].includes(dispatch.status)) {
        order.status = 'in_transit';
      }

      await order.save();
    }

    res.json({ dispatch, message: `Dispatch status updated to ${dispatch.status}.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
