const express = require('express');
const router = express.Router();
const goodsReceiptController = require('../controllers/goodsReceipt.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', goodsReceiptController.listReceipts);
router.post('/', requireRole('admin', 'manager'), goodsReceiptController.createReceipt);
router.get('/:id', goodsReceiptController.getReceiptDetail);

module.exports = router;
