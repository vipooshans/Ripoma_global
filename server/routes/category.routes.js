const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.get('/', authMiddleware, categoryController.getCategories);
router.post('/', authMiddleware, requirePermission('inventory:write'), categoryController.createCategory);
router.put('/:id', authMiddleware, requirePermission('inventory:write'), categoryController.updateCategory);
router.delete('/:id', authMiddleware, requirePermission('inventory:write'), categoryController.deleteCategory);

module.exports = router;
