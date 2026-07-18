const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/product.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

// Set up memory storage for CSV uploads
const storage = multer.memoryStorage();
const csvUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed.'));
    }
  }
});

const PRODUCT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const productImageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5
  },
  fileFilter: (req, file, cb) => {
    if (PRODUCT_IMAGE_TYPES.has(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Only JPEG, PNG, and WebP product images are allowed.'));
  }
});

const acceptProductImages = (req, res, next) => {
  productImageUpload.array('images', 5)(req, res, (error) => {
    if (!error) return next();

    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Each product image must be 5 MB or smaller.'
      : error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'A product can have at most 5 images.'
        : error.message;

    return res.status(400).json({ message });
  });
};

router.get('/', authMiddleware, productController.getProducts);
router.get('/export', authMiddleware, productController.exportProducts);
router.get('/:id', authMiddleware, productController.getProductById);
router.post('/', authMiddleware, requirePermission('inventory:write'), acceptProductImages, productController.createProduct);
router.put('/:id', authMiddleware, requirePermission('inventory:write'), acceptProductImages, productController.updateProduct);
router.delete('/:id', authMiddleware, requirePermission('inventory:write'), productController.deleteProduct);
router.patch('/:id/status', authMiddleware, requirePermission('inventory:write'), productController.changeStatus);
router.post('/import', authMiddleware, requirePermission('inventory:write'), csvUpload.single('file'), productController.importProducts);

module.exports = router;
