const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

// Custom guard to allow users to edit themselves, or users with users:write permission, or admin
const canEditUser = (req, res, next) => {
  if (
    req.user.role === 'admin' ||
    (req.user.permissions && req.user.permissions.includes('users:write')) ||
    req.user._id.toString() === req.params.id
  ) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: You do not have permission to edit this user.' });
};

router.use(authMiddleware);

// Routes
router.get('/', requirePermission('users:read'), userController.listUsers);
router.post('/', requireRole('admin'), userController.createUser);
router.get('/:id', requirePermission('users:read'), userController.getUser);
router.put('/:id', canEditUser, userController.updateUser);
router.delete('/:id', requireRole('admin'), userController.deleteUser);
router.patch('/:id/status', requirePermission('users:write'), userController.changeStatus);
router.post('/:id/reset-password', requirePermission('users:write'), userController.resetPassword);

module.exports = router;
