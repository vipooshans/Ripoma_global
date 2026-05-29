const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const controller = require('../controllers/documentActivity.controller');

router.use(authMiddleware);

// Global activity feed
router.get('/', controller.getGlobalActivity);

// Per-document activity
router.get('/:docId', controller.getDocumentActivity);

module.exports = router;
