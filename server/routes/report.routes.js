const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const authMiddleware = require('../middleware/authMiddleware');

// Enforce auth token middleware for all reporting actions
router.use(authMiddleware);

// Dashboard KPIs & Analytics Summaries
router.get('/dashboard', reportController.getDashboardKPIs);
router.get('/sales', reportController.getSalesReport);
router.get('/shipments', reportController.getShipmentReport);
router.get('/financial', reportController.getFinancialReport);
router.get('/business-analytics', reportController.getBusinessAnalytics);

// Saved custom Report Definitions (Report Builder)
router.get('/definitions', reportController.getReportDefinitions);
router.post('/definitions', reportController.createReportDefinition);
router.put('/definitions/:id', reportController.updateReportDefinition);
router.delete('/definitions/:id', reportController.deleteReportDefinition);
router.post('/definitions/:id/run', reportController.runReportDefinition);
router.patch('/definitions/:id/favourite', reportController.toggleFavouriteReport);

// Scheduled Automation Recurrence
router.get('/scheduled', reportController.getScheduledReports);
router.post('/scheduled', reportController.createScheduledReport);
router.put('/scheduled/:id', reportController.updateScheduledReport);
router.delete('/scheduled/:id', reportController.deleteScheduledReport);
router.patch('/scheduled/:id/toggle', reportController.toggleScheduledReport);
router.post('/scheduled/:id/run-now', reportController.runScheduledReportNow);

// Export Logs & Download Registry
router.get('/exports', reportController.getReportExports);
router.post('/exports', reportController.createReportExport);
router.get('/exports/:id/download', reportController.downloadReportExport);
router.delete('/exports/:id', reportController.deleteReportExport);

module.exports = router;
