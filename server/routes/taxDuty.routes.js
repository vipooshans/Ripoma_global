const express = require('express');
const router = express.Router();
const taxDutyController = require('../controllers/taxDuty.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.use(authMiddleware);

// Base queries require finance:read
router.get('/', requirePermission('finance:read'), taxDutyController.listRecords);
router.get('/summary', requirePermission('finance:read'), taxDutyController.getSummary);
router.get('/upcoming', requirePermission('finance:read'), taxDutyController.getUpcomingRecords);

// Details
router.get('/:id', requirePermission('finance:read'), taxDutyController.getRecord);

// Writes require finance:write
router.post('/', requirePermission('finance:write'), taxDutyController.createRecord);
router.put('/:id', requirePermission('finance:write'), taxDutyController.updateRecord);
router.patch('/:id/status', requirePermission('finance:write'), taxDutyController.updateStatus);

module.exports = router;
