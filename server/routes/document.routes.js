const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const controller = require('../controllers/document.controller');

const ALLOWED_EXT = new Set(['.pdf', '.docx', '.xlsx', '.jpg', '.jpeg', '.png']);
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png'
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Only PDF, DOCX, XLSX, JPG, and PNG files are allowed.'));
  }
  cb(null, true);
};

// Multer — memory storage (we pass buffer to storage adapter)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter
});

// All document routes require authentication
router.use(authMiddleware);

// Dashboard stats
router.get('/dashboard', controller.getDashboardStats);

// Document CRUD
router.get('/', controller.getDocuments);
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, controller.uploadDocument);
router.get('/:id', controller.getDocumentById);
router.put('/:id', controller.updateDocument);
router.delete('/:id', controller.deleteDocument);
router.patch('/:id/restore', controller.restoreDocument);

// Download (presigned URL)
router.get('/:id/download', controller.downloadDocument);
router.get('/:id/thumbnail', controller.getThumbnail);

// New version upload
router.post('/:id/version', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, controller.uploadNewVersion);

// Bulk download
router.post('/bulk-download', controller.bulkDownload);

module.exports = router;
