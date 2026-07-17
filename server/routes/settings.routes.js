const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const settingsController = require('../controllers/settings.controller');

router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/', settingsController.getAllSettings);
router.get('/company', settingsController.getCompanySettings);
router.put('/company', settingsController.updateCompanySettings);
router.get('/email', settingsController.getEmailSettings);
router.put('/email', settingsController.updateEmailSettings);
router.get('/backup', settingsController.createBackup);

module.exports = router;
