const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/product.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

// Set up memory storage for CSV uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed.'));
    }
  }
});

router.get('/', authMiddleware, productController.getProducts);
router.get('/export', authMiddleware, productController.exportProducts);
router.get('/:id', authMiddleware, productController.getProductById);
router.post('/', authMiddleware, requirePermission('inventory:write'), productController.createProduct);
router.put('/:id', authMiddleware, requirePermission('inventory:write'), productController.updateProduct);
router.delete('/:id', authMiddleware, requirePermission('inventory:write'), productController.deleteProduct);
router.patch('/:id/status', authMiddleware, requirePermission('inventory:write'), productController.changeStatus);
router.post('/import', authMiddleware, requirePermission('inventory:write'), upload.single('file'), productController.importProducts);

module.exports = router;
