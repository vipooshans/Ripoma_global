const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const ctrl = require('../controllers/supplier.controller');
const auth = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/export', auth, ctrl.exportSuppliersCSV);
router.post('/import', auth, requirePermission('inventory:write'), upload.single('file'), ctrl.importSuppliersCSV);

router.get('/', auth, ctrl.getSuppliers);
router.post('/', auth, requirePermission('inventory:write'), ctrl.createSupplier);

router.get('/:id/stats', auth, ctrl.getSupplierStats);
router.get('/:id/products', auth, ctrl.getSupplierProducts);
router.get('/:id', auth, ctrl.getSupplierById);
router.put('/:id', auth, requirePermission('inventory:write'), ctrl.updateSupplier);
router.delete('/:id', auth, requireRole('admin'), ctrl.deleteSupplier);
router.patch('/:id/status', auth, requirePermission('inventory:write'), ctrl.updateSupplierStatus);

module.exports = router;
