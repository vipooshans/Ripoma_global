const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatch.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', dispatchController.listDispatches);
router.post('/', requireRole('admin', 'manager'), dispatchController.createDispatch);

router.get('/:id', dispatchController.getDispatch);
router.patch('/:id/status', requireRole('admin', 'manager'), dispatchController.updateDispatchStatus);

module.exports = router;
