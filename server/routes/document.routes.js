const express = require('express');
const multer = require('multer');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const controller = require('../controllers/document.controller');

// Multer — memory storage (we pass buffer to storage adapter)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

// All document routes require authentication
router.use(authMiddleware);

// Dashboard stats
router.get('/dashboard', controller.getDashboardStats);

// Document CRUD
router.get('/', controller.getDocuments);
router.post('/', upload.single('file'), controller.uploadDocument);
router.get('/:id', controller.getDocumentById);
router.put('/:id', controller.updateDocument);
router.delete('/:id', controller.deleteDocument);
router.patch('/:id/restore', controller.restoreDocument);

// Download (presigned URL)
router.get('/:id/download', controller.downloadDocument);
router.get('/:id/thumbnail', controller.getThumbnail);

// New version upload
router.post('/:id/version', upload.single('file'), controller.uploadNewVersion);

// Bulk download
router.post('/bulk-download', controller.bulkDownload);

module.exports = router;
