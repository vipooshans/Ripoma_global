const GoodsReceipt = require('../models/GoodsReceipt');
const ImportOrder = require('../models/ImportOrder');
const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const generateNumber = require('../utils/poNumberGenerator');
const mongoose = require('mongoose');

// 1. Create Goods Receipt (GRN)
exports.createReceipt = async (req, res) => {
  const { importOrder: poId, warehouse: warehouseId, items, notes, documents } = req.body;

  if (!poId || !warehouseId || !items || items.length === 0) {
    return res.status(400).json({ message: 'Missing required GRN information: importOrder, warehouse, or items.' });
  }

  // Use a transaction if replica set is available, otherwise normal block
  const session = await mongoose.startSession().catch(() => null);
  if (session) {
    session.startTransaction();
  }

  try {
    const order = await ImportOrder.findById(poId).session(session ? session : null);
    if (!order) {
      if (session) await session.abortTransaction();
      return res.status(404).json({ message: 'Linked Purchase Order not found.' });
    }

    // Check status
    if (['draft', 'pending_approval', 'received', 'cancelled'].includes(order.status)) {
      if (session) await session.abortTransaction();
      return res.status(400).json({ message: `Cannot record receipt against order in '${order.status}' status.` });
    }

    // Generate GRN Number
    const receiptNumber = await generateNumber('goodsReceipt');

    // Create GRN Doc
    const grn = new GoodsReceipt({
      importOrder: poId,
      receiptNumber,
      receivedBy: req.user._id,
      warehouse: warehouseId,
      items: items.map(item => ({
        product: item.product,
        quantityExpected: item.quantityExpected,
        quantityReceived: item.quantityReceived || 0,
        quantityRejected: item.quantityRejected || 0,
        rejectionReason: item.rejectionReason,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        condition: item.condition || 'good'
      })),
      notes,
      documents
    });

    await grn.save({ session: session ? session : null });

    // Update stock levels and StockMovement logs
    for (const item of items) {
      const qtyReceived = parseFloat(item.quantityReceived) || 0;
      if (qtyReceived <= 0) continue; // Skip lines with zero received quantity

      // Find or create InventoryItem for product + warehouse
      let invItem = await InventoryItem.findOne({
        product: item.product,
        warehouse: warehouseId
      }).session(session ? session : null);

      if (!invItem) {
        invItem = new InventoryItem({
          product: item.product,
          warehouse: warehouseId,
          quantityOnHand: 0,
          quantityReserved: 0
        });
      }

      const quantityBefore = invItem.quantityOnHand;
      invItem.quantityOnHand += qtyReceived;
      if (item.batchNumber) invItem.batchNumber = item.batchNumber;
      if (item.expiryDate) invItem.expiryDate = item.expiryDate;
      const quantityAfter = invItem.quantityOnHand;

      await invItem.save({ session: session ? session : null });

      // Create StockMovement
      const movement = new StockMovement({
        product: item.product,
        warehouse: warehouseId,
        type: 'receive',
        quantity: qtyReceived,
        quantityBefore,
        quantityAfter,
        reference: order.poNumber,
        note: `Received via GRN: ${receiptNumber}. Condition: ${item.condition || 'good'}.`,
        performedBy: req.user._id
      });

      await movement.save({ session: session ? session : null });

      // Update quantityReceived in ImportOrder items
      const poItem = order.items.find(pi => pi.product.toString() === item.product.toString());
      if (poItem) {
        poItem.quantityReceived = (poItem.quantityReceived || 0) + qtyReceived;
      }
    }

    // Determine new status of ImportOrder
    let allFullyReceived = true;
    let anyReceived = false;

    for (const poItem of order.items) {
      if (poItem.quantityReceived < poItem.quantityOrdered) {
        allFullyReceived = false;
      }
      if (poItem.quantityReceived > 0) {
        anyReceived = true;
      }
    }

    if (allFullyReceived) {
      order.status = 'received';
      order.actualDeliveryDate = new Date();
    } else if (anyReceived) {
      order.status = 'partially_received';
    }

    await order.save({ session: session ? session : null });

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    res.status(201).json({
      grn,
      orderStatus: order.status,
      message: `Goods receipt note ${receiptNumber} recorded successfully.`
    });
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    res.status(500).json({ message: err.message });
  }
};

// 2. List Goods Receipts (GRNs)
exports.listReceipts = async (req, res) => {
  try {
    const { order, warehouse, dateFrom, dateTo } = req.query;
    const query = {};

    if (order) query.importOrder = order;
    if (warehouse) query.warehouse = warehouse;

    if (dateFrom || dateTo) {
      query.receivedAt = {};
      if (dateFrom) query.receivedAt.$gte = new Date(dateFrom);
      if (dateTo) query.receivedAt.$lte = new Date(dateTo);
    }

    const receipts = await GoodsReceipt.find(query)
      .populate('importOrder', 'poNumber')
      .populate('receivedBy', 'name')
      .populate('warehouse', 'name')
      .populate('items.product', 'sku name')
      .sort({ receivedAt: -1 });

    res.json({ receipts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Goods Receipt Detail
exports.getReceiptDetail = async (req, res) => {
  try {
    const grn = await GoodsReceipt.findById(req.params.id)
      .populate('importOrder', 'poNumber grandTotal status currency expectedDeliveryDate')
      .populate('receivedBy', 'name email')
      .populate('warehouse', 'name code location')
      .populate('items.product', 'sku name barcode unit');

    if (!grn) return res.status(404).json({ message: 'Goods Receipt Note not found.' });

    res.json({ grn });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
