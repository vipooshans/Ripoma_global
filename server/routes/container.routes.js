const express = require('express');
const router = express.Router();
const containerController = require('../controllers/container.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/available', containerController.getAvailableContainers);
router.get('/', containerController.getContainers);
router.post('/', requireRole('admin', 'manager'), containerController.createContainer);

router.get('/:id', containerController.getContainerById);
router.patch('/:id', requireRole('admin', 'manager'), containerController.updateContainer);
router.delete('/:id', requireRole('admin', 'manager'), containerController.deleteContainer);

module.exports = router;
