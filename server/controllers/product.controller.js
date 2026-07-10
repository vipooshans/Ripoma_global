const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const InventoryItem = require('../models/InventoryItem');
const { generateSKU } = require('../utils/skuGenerator');
const { parseCSV, unparseCSV } = require('../utils/csvParser');
const { getTotalStockForProduct } = require('../utils/stockCalculator');

// GET /api/products
exports.getProducts = async (req, res) => {
  try {
    const { page, limit, search, category, status, supplier, sort } = req.query;

    const query = { deleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (supplier) {
      query.supplier = supplier;
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    // Sorting
    let sortOption = { createdAt: -1 }; // default
    if (sort) {
      const parts = sort.split(':');
      sortOption = { [parts[0]]: parts[1] === 'desc' ? -1 : 1 };
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('supplier', 'name')
      .sort(sortOption)
      .skip(skipNum)
      .limit(limitNum);

    // Enrich products with total stock across all warehouses
    const enrichedProducts = await Promise.all(
      products.map(async (p) => {
        const stockStats = await getTotalStockForProduct(p._id);
        return {
          ...p.toObject(),
          totalStock: stockStats.quantityOnHand,
          quantityAvailable: stockStats.quantityAvailable,
          quantityReserved: stockStats.quantityReserved
        };
      })
    );

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      products: enrichedProducts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get Products Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, deleted: false })
      .populate('category', 'name description')
      .populate('supplier', 'name contactPerson email phone');

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Fetch stock levels in warehouses
    const stockItems = await InventoryItem.find({ product: id })
      .populate('warehouse', 'name code');

    const totalStock = stockItems.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);

    return res.status(200).json({
      product: {
        ...product.toObject(),
        totalStock
      },
      stockLevels: stockItems
    });
  } catch (error) {
    console.error('Get Product Detail Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/products
exports.createProduct = async (req, res) => {
  try {
    const {
      sku,
      name,
      description,
      category,
      unit,
      unitCost,
      sellingPrice,
      currency,
      images,
      barcode,
      hsCode,
      countryOfOrigin,
      weight,
      dimensions,
      tags,
      brand,
      status,
      isFeatured,
      supplier,
      lowStockThreshold,
      reorderQuantity
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: 'Name and Category are required.' });
    }

    // Fetch category name for SKU generation
    const catRecord = await Category.findById(category);
    if (!catRecord) {
      return res.status(400).json({ message: 'Valid category is required.' });
    }

    // SKU generation
    let finalSku = sku;
    if (!finalSku) {
      finalSku = await generateSKU(catRecord.name);
    } else {
      finalSku = finalSku.toUpperCase().trim();
      const existing = await Product.findOne({ sku: finalSku, deleted: false });
      if (existing) {
        return res.status(400).json({ message: `SKU '${finalSku}' is already assigned to a product.` });
      }
    }

    // Fallback barcode to SKU if not provided
    const finalBarcode = barcode || finalSku;

    const product = new Product({
      sku: finalSku,
      name: name.trim(),
      description,
      category,
      unit: unit || 'pcs',
      unitCost: parseFloat(unitCost) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      currency: currency || 'USD',
      images: images || [],
      barcode: finalBarcode,
      hsCode,
      countryOfOrigin,
      weight: parseFloat(weight) || 0,
      dimensions: dimensions || { length: 0, width: 0, height: 0 },
      tags: tags || [],
      brand: brand || undefined,
      status: status || 'active',
      isFeatured: Boolean(isFeatured),
      supplier: supplier || null,
      lowStockThreshold: parseInt(lowStockThreshold) || 10,
      reorderQuantity: parseInt(reorderQuantity) || 50,
      createdBy: req.user?._id
    });

    await product.save();
    return res.status(201).json({ message: 'Product catalogued successfully.', product });
  } catch (error) {
    console.error('Create Product Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findOne({ _id: id, deleted: false });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // If Category is being updated, verify it exists
    if (updates.category && updates.category !== product.category.toString()) {
      const catRecord = await Category.findById(updates.category);
      if (!catRecord) {
        return res.status(400).json({ message: 'Valid category is required.' });
      }
    }

    // Prevent changing SKU to an existing one
    if (updates.sku && updates.sku.toUpperCase().trim() !== product.sku) {
      const cleanSku = updates.sku.toUpperCase().trim();
      const existing = await Product.findOne({ sku: cleanSku, deleted: false });
      if (existing) {
        return res.status(400).json({ message: `SKU '${cleanSku}' is already assigned to another product.` });
      }
      product.sku = cleanSku;
    }

    // Direct mappings
    const fieldsToUpdate = [
      'name', 'description', 'category', 'unit', 'unitCost', 'sellingPrice',
      'currency', 'images', 'barcode', 'hsCode', 'countryOfOrigin', 'weight',
      'dimensions', 'tags', 'brand', 'status', 'isFeatured', 'supplier',
      'lowStockThreshold', 'reorderQuantity'
    ];

    const objectIdFields = new Set(['supplier', 'category']);

    fieldsToUpdate.forEach((field) => {
      if (updates[field] === undefined) return;
      let value = updates[field];
      if (objectIdFields.has(field) && (value === '' || value === null)) {
        value = null;
      }
      if (field === 'isFeatured') {
        value = Boolean(value);
      }
      product[field] = value;
    });

    await product.save();
    return res.status(200).json({ message: 'Product updated successfully.', product });
  } catch (error) {
    console.error('Update Product Error:', error);
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/products/:id (Soft delete)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if there is active stock left in warehouses
    const stockItems = await InventoryItem.find({ product: id });
    const totalStock = stockItems.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);
    
    if (totalStock > 0) {
      return res.status(400).json({
        message: 'Cannot delete product. Active inventory exists in one or more warehouses.'
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    product.deleted = true;
    await product.save();

    return res.status(200).json({ message: 'Product soft-deleted successfully.' });
  } catch (error) {
    console.error('Delete Product Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/products/:id/status
exports.changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'discontinued'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const product = await Product.findOne({ _id: id, deleted: false });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    product.status = status;
    await product.save();

    return res.status(200).json({ message: 'Product status changed successfully.', product });
  } catch (error) {
    console.error('Change Product Status Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/products/import
exports.importProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file was uploaded.' });
    }

    const csvText = req.file.buffer.toString('utf8');
    const parsedData = await parseCSV(csvText);

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      const rowNum = i + 2; // header is row 1

      const {
        sku,
        name,
        category: categoryName,
        unit,
        unitCost,
        sellingPrice,
        supplier: supplierName,
        lowStockThreshold,
        reorderQuantity
      } = row;

      // Basic validations
      if (!name) {
        errors.push({ row: rowNum, reason: 'Product name is missing.' });
        skipped++;
        continue;
      }

      if (!categoryName) {
        errors.push({ row: rowNum, reason: 'Category name is missing.' });
        skipped++;
        continue;
      }

      try {
        // Resolve Category
        let categoryRecord = await Category.findOne({ name: categoryName.trim() });
        if (!categoryRecord) {
          categoryRecord = new Category({
            name: categoryName.trim(),
            description: `Auto-generated category from bulk import.`
          });
          await categoryRecord.save();
        }

        // Resolve Supplier if provided
        let supplierRecord = null;
        if (supplierName) {
          supplierRecord = await Supplier.findOne({ name: supplierName.trim() });
          if (!supplierRecord) {
            const supplierCode = supplierName.trim().substring(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);
            supplierRecord = new Supplier({
              name: supplierName.trim(),
              code: supplierCode,
              contactPerson: 'Default Import Contact'
            });
            await supplierRecord.save();
          }
        }

        // SKU Resolution
        let finalSku = sku ? sku.toString().toUpperCase().trim() : '';
        if (finalSku) {
          const existing = await Product.findOne({ sku: finalSku, deleted: false });
          if (existing) {
            errors.push({ row: rowNum, reason: `SKU '${finalSku}' is already assigned to a product.` });
            skipped++;
            continue;
          }
        } else {
          finalSku = await generateSKU(categoryRecord.name);
        }

        const product = new Product({
          sku: finalSku,
          name: name.toString().trim(),
          category: categoryRecord._id,
          unit: unit || 'pcs',
          unitCost: parseFloat(unitCost) || 0,
          sellingPrice: parseFloat(sellingPrice) || 0,
          supplier: supplierRecord ? supplierRecord._id : null,
          lowStockThreshold: parseInt(lowStockThreshold) || 10,
          reorderQuantity: parseInt(reorderQuantity) || 50,
          createdBy: req.user?._id
        });

        await product.save();
        imported++;
      } catch (err) {
        errors.push({ row: rowNum, reason: err.message || 'Error occurred during save.' });
        skipped++;
      }
    }

    return res.status(200).json({
      message: `Import processed. ${imported} products imported, ${skipped} skipped.`,
      imported,
      skipped,
      errors
    });
  } catch (error) {
    console.error('Import Products Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/products/export
exports.exportProducts = async (req, res) => {
  try {
    const products = await Product.find({ deleted: false })
      .populate('category', 'name')
      .populate('supplier', 'name');

    // Structure data for CSV unparse
    const csvRows = await Promise.all(
      products.map(async (p) => {
        const stockStats = await getTotalStockForProduct(p._id);
        return {
          sku: p.sku,
          name: p.name,
          category: p.category?.name || '',
          unit: p.unit,
          unitCost: p.unitCost,
          sellingPrice: p.sellingPrice,
          currency: p.currency,
          supplier: p.supplier?.name || '',
          lowStockThreshold: p.lowStockThreshold,
          reorderQuantity: p.reorderQuantity,
          totalStock: stockStats.quantityOnHand,
          status: p.status
        };
      })
    );

    const csvText = unparseCSV(csvRows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products_export.csv');
    return res.status(200).send(csvText);
  } catch (error) {
    console.error('Export Products Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
