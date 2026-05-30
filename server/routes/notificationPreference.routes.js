const express = require('express');
const router = express.Router();
const preferenceController = require('../controllers/notificationPreference.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, preferenceController.getPreferences);
router.put('/', authMiddleware, preferenceController.updatePreferences);

module.exports = router;
