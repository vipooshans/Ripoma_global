const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Base queries require finance:read
router.get('/', requirePermission('finance:read'), expenseController.listExpenses);
router.get('/dashboard', requirePermission('finance:read'), expenseController.getCategorySummary);
router.get('/export', requirePermission('finance:read'), expenseController.exportExpensesCSV);

// Details
router.get('/:id', requirePermission('finance:read'), expenseController.getExpense);

// Writes require finance:write
router.post('/', requirePermission('finance:write'), expenseController.createExpense);
router.put('/:id', requirePermission('finance:write'), expenseController.updateExpense);
router.delete('/:id', requirePermission('finance:write'), expenseController.deleteExpense);
router.patch('/:id/submit', requirePermission('finance:write'), expenseController.submitExpense);
router.patch('/:id/mark-paid', requirePermission('finance:write'), expenseController.markPaid);

// Approvals require manager+ roles
router.patch('/:id/approve', requireRole('admin', 'manager'), expenseController.approveExpense);
router.patch('/:id/reject', requireRole('admin', 'manager'), expenseController.rejectExpense);

module.exports = router;
