const express = require('express');
const router = express.Router();
const profitAnalysisController = require('../controllers/profitAnalysis.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.use(authMiddleware);

// All P&L reports require finance:read
router.get('/summary', requirePermission('finance:read'), profitAnalysisController.getPLSummary);
router.get('/by-period', requirePermission('finance:read'), profitAnalysisController.getPLByPeriod);
router.get('/by-order/:type/:id', requirePermission('finance:read'), profitAnalysisController.getPLByOrder);
router.get('/by-customer', requirePermission('finance:read'), profitAnalysisController.getPLByCustomer);
router.get('/by-product', requirePermission('finance:read'), profitAnalysisController.getPLByProduct);

module.exports = router;
