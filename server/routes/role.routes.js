const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Routes
router.get('/', roleController.listRoles);
router.post('/', requireRole('admin'), roleController.createRole);
router.put('/:id', requireRole('admin'), roleController.updateRolePermissions);
router.delete('/:id', requireRole('admin'), roleController.deleteRole);

module.exports = router;
