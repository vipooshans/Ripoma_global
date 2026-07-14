const mongoose = require('mongoose');
const StockMovement = require('../models/StockMovement');
const InventoryItem = require('../models/InventoryItem');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');

// GET /api/stock-movements
exports.getStockMovements = async (req, res) => {
  try {
    const { product, warehouse, type, dateFrom, dateTo } = req.query;

    const query = {};

    if (product) {
      query.product = product;
    }

    if (warehouse) {
      query.warehouse = warehouse;
    }

    if (type) {
      query.type = type;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    const movements = await StockMovement.find(query)
      .populate('product', 'name sku unit')
      .populate('warehouse', 'name code')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json(movements);
  } catch (error) {
    console.error('Get Stock Movements Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/stock-movements/:id
exports.getStockMovementById = async (req, res) => {
  try {
    const { id } = req.params;
    const movement = await StockMovement.findById(id)
      .populate('product', 'name sku unit unitCost sellingPrice')
      .populate('warehouse', 'name code')
      .populate('performedBy', 'name email');

    if (!movement) {
      return res.status(404).json({ message: 'Stock movement log not found.' });
    }

    return res.status(200).json(movement);
  } catch (error) {
    console.error('Get Stock Movement Detail Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/stock-movements
exports.createStockMovement = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      product: productId,
      warehouse: warehouseId,
      transferTo: transferToId, // only for transfer type
      type,
      quantity,
      reference,
      batchNumber,
      expiryDate,
      note
    } = req.body;

    if (!productId || !warehouseId || !type || quantity === undefined || quantity === null || quantity === '') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Product, warehouse, movement type, and quantity are required.' });
    }

    const qtyNum = Number(quantity);
    if (!Number.isInteger(qtyNum)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Quantity must be a whole number.' });
    }

    if (type === 'adjustment') {
      if (qtyNum === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Adjustment quantity must be a non-zero integer.' });
      }
    } else if (qtyNum <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Quantity must be a positive integer.' });
    }

    const qtyVal = Math.abs(qtyNum);

    // Verify product exists
    const productRecord = await Product.findOne({ _id: productId, deleted: false }).session(session);
    if (!productRecord) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Verify source warehouse exists
    const srcWarehouse = await Warehouse.findById(warehouseId).session(session);
    if (!srcWarehouse) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Source warehouse not found.' });
    }

    // Handle Transfer Movement (two StockMovement records + rollback support)
    if (type === 'transfer') {
      if (!transferToId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Destination warehouse is required for transfers.' });
      }

      if (warehouseId === transferToId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Source and destination warehouses must be different.' });
      }

      // Verify destination warehouse exists
      const destWarehouse = await Warehouse.findById(transferToId).session(session);
      if (!destWarehouse) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Destination warehouse not found.' });
      }

      // 1. Deduct from Source Warehouse
      let srcItem = await InventoryItem.findOne({ product: productId, warehouse: warehouseId }).session(session);
      if (!srcItem || srcItem.quantityOnHand < qtyVal) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: `Insufficient stock in source warehouse. Available: ${srcItem ? srcItem.quantityOnHand : 0}`
        });
      }

      const srcBefore = srcItem.quantityOnHand;
      srcItem.quantityOnHand -= qtyVal;
      await srcItem.save({ session });

      const sourceMovement = new StockMovement({
        product: productId,
        warehouse: warehouseId,
        type: 'transfer_out',
        quantity: -qtyVal,
        quantityBefore: srcBefore,
        quantityAfter: srcItem.quantityOnHand,
        reference,
        note: note || `Transfer to warehouse: ${destWarehouse.name}`,
        performedBy: req.user?._id
      });
      await sourceMovement.save({ session });

      // 2. Add to Destination Warehouse
      let destItem = await InventoryItem.findOne({ product: productId, warehouse: transferToId }).session(session);
      if (!destItem) {
        destItem = new InventoryItem({
          product: productId,
          warehouse: transferToId,
          quantityOnHand: 0,
          quantityReserved: 0,
          batchNumber,
          expiryDate
        });
      }

      const destBefore = destItem.quantityOnHand;
      destItem.quantityOnHand += qtyVal;
      if (batchNumber) destItem.batchNumber = batchNumber;
      if (expiryDate) destItem.expiryDate = expiryDate;
      await destItem.save({ session });

      const destMovement = new StockMovement({
        product: productId,
        warehouse: transferToId,
        type: 'transfer_in',
        quantity: qtyVal,
        quantityBefore: destBefore,
        quantityAfter: destItem.quantityOnHand,
        reference,
        note: note || `Transfer from warehouse: ${srcWarehouse.name}`,
        performedBy: req.user?._id
      });
      await destMovement.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        message: 'Stock transfer completed successfully.',
        movements: [sourceMovement, destMovement]
      });
    }

    // Handle standard adjustments: receive, issue, adjustment, return
    let item = await InventoryItem.findOne({ product: productId, warehouse: warehouseId }).session(session);
    if (!item) {
      item = new InventoryItem({
        product: productId,
        warehouse: warehouseId,
        quantityOnHand: 0,
        quantityReserved: 0,
        batchNumber,
        expiryDate
      });
    }

    const qtyBefore = item.quantityOnHand;
    let netQtyChange = 0;

    switch (type) {
      case 'receive':
      case 'return':
        netQtyChange = qtyVal;
        break;
      case 'issue':
        netQtyChange = -qtyVal;
        break;
      case 'adjustment':
        // Signed delta from client (positive add / negative remove)
        netQtyChange = qtyNum;
        break;
      default:
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Invalid movement type.' });
    }

    item.quantityOnHand += netQtyChange;

    if (item.quantityOnHand < 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: `Insufficient inventory for operation. Current stock: ${qtyBefore}, attempted change: ${netQtyChange}`
      });
    }

    if (batchNumber) item.batchNumber = batchNumber;
    if (expiryDate) item.expiryDate = expiryDate;

    await item.save({ session });

    const movement = new StockMovement({
      product: productId,
      warehouse: warehouseId,
      type,
      quantity: netQtyChange,
      quantityBefore: qtyBefore,
      quantityAfter: item.quantityOnHand,
      reference,
      note,
      performedBy: req.user?._id
    });

    await movement.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: 'Stock movement registered successfully.',
      movement
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Create Stock Movement Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
