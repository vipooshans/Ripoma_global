const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLog.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, activityLogController.getActivityLogs);

module.exports = router;
