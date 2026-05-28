const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const ctrl = require('../controllers/customer.controller');
const auth = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/export', auth, ctrl.exportCustomersCSV);
router.post('/import', auth, requirePermission('inventory:write'), upload.single('file'), ctrl.importCustomersCSV);

router.get('/', auth, ctrl.getCustomers);
router.post('/', auth, requirePermission('inventory:write'), ctrl.createCustomer);

router.get('/:id/stats', auth, ctrl.getCustomerStats);
router.get('/:id', auth, ctrl.getCustomerById);
router.put('/:id', auth, requirePermission('inventory:write'), ctrl.updateCustomer);
router.delete('/:id', auth, requireRole('admin'), ctrl.deleteCustomer);
router.patch('/:id/status', auth, requirePermission('inventory:write'), ctrl.updateCustomerStatus);

module.exports = router;
