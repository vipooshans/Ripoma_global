const ReportDefinition = require('../models/ReportDefinition');
const ScheduledReport = require('../models/ScheduledReport');
const ReportExport = require('../models/ReportExport');
const { aggregateKPIs } = require('../utils/reports/kpiAggregator');
const { aggregateSales } = require('../utils/reports/salesAggregator');
const { aggregateFinancials } = require('../utils/reports/financialAggregator');
const { aggregateAnalytics } = require('../utils/reports/businessAnalyticsAggregator');
const { aggregateInventory } = require('../utils/reports/inventoryAggregator');
const { generateInsights } = require('../utils/reports/insightGenerator');
const { generateExport } = require('../utils/reports/exportBuilder');
const { calculateNextRun, runScheduledReport } = require('../jobs/scheduledReportRunner');
const generateReportNumber = require('../utils/reportNumberGenerator');
const storageAdapter = require('../utils/storage');
const mongoose = require('mongoose');

const parseAndValidateDateRange = (dateFrom, dateTo, { allowDefault = true } = {}) => {
  const defaults = resolvePresetDates('last_30d');
  const start = dateFrom ? new Date(dateFrom) : (allowDefault ? defaults.start : null);
  const end = dateTo ? new Date(dateTo) : (allowDefault ? defaults.end : null);

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Valid dateFrom and dateTo are required.' };
  }
  if (start > end) {
    return { error: 'dateFrom must be on or before dateTo.' };
  }
  return { start, end };
};

// Helper to resolve preset dates dynamically
const resolvePresetDates = (preset, customStart, customEnd) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  switch (preset) {
    case 'last_7d':
      start.setDate(now.getDate() - 7);
      break;
    case 'last_30d':
      start.setDate(now.getDate() - 30);
      break;
    case 'last_90d':
      start.setDate(now.getDate() - 90);
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'this_quarter':
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qStartMonth, 1);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
    default:
      start = customStart ? new Date(customStart) : new Date(now.setDate(now.getDate() - 30));
      end = customEnd ? new Date(customEnd) : new Date();
      break;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Helper to resolve report table contents (for custom saved runs)
const getReportData = async (definition, dateRange = null) => {
  const config = definition.config || {};
  const dates = dateRange || resolvePresetDates(config.dateRangePreset, config.dateFrom, config.dateTo);
  
  let columns = config.columns || [];
  let data = [];

  switch (definition.type) {
    case 'sales': {
      const res = await aggregateSales({ 
        dateFrom: dates.start, 
        dateTo: dates.end, 
        groupBy: config.groupBy || 'month' 
      });
      data = res.tableData || [];
      if (columns.length === 0) {
        columns = data.length > 0 ? Object.keys(data[0]) : ['month', 'orders', 'revenue', 'avgOrderValue'];
      }
      break;
    }
    case 'financial': {
      const res = await aggregateFinancials({ 
        dateFrom: dates.start, 
        dateTo: dates.end 
      });
      data = res.receivablesAgeing?.details || [];
      if (columns.length === 0) {
        columns = ['customerName', 'invoiceNumber', 'amount', 'dueDate', 'daysOverdue', 'bucket'];
      }
      break;
    }
    case 'inventory': {
      const res = await aggregateInventory({});
      data = res.rows || [];
      if (columns.length === 0) {
        columns = ['sku', 'name', 'warehouse', 'quantityOnHand', 'quantityAvailable', 'stockValue', 'isLowStock'];
      }
      break;
    }
    default: {
      const res = await aggregateInventory({});
      data = res.rows || [];
      if (columns.length === 0) {
        columns = ['sku', 'name', 'warehouse', 'quantityOnHand', 'stockValue'];
      }
      break;
    }
  }

  return { columns, data, dates };
};

// GET /api/reports/dashboard
exports.getDashboardKPIs = async (req, res) => {
  try {
    const kpis = await aggregateKPIs();
    return res.status(200).json(kpis);
  } catch (error) {
    console.error('KPI Dashboard Aggregation Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/reports/sales
exports.getSalesReport = async (req, res) => {
  try {
    const { dateFrom, dateTo, groupBy } = req.query;
    const range = parseAndValidateDateRange(dateFrom, dateTo);
    if (range.error) return res.status(400).json({ message: range.error });

    const data = await aggregateSales({ 
      dateFrom: range.start, 
      dateTo: range.end, 
      groupBy: groupBy || 'month' 
    });

    return res.status(200).json(data);
  } catch (error) {
    console.error('Sales Aggregation Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/reports/financial
exports.getFinancialReport = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const range = parseAndValidateDateRange(dateFrom, dateTo);
    if (range.error) return res.status(400).json({ message: range.error });

    const data = await aggregateFinancials({ 
      dateFrom: range.start, 
      dateTo: range.end 
    });

    return res.status(200).json(data);
  } catch (error) {
    console.error('Financial Aggregation Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/reports/inventory
exports.getInventoryReport = async (req, res) => {
  try {
    const { warehouse, lowStockOnly } = req.query;
    const data = await aggregateInventory({
      warehouse: warehouse || undefined,
      lowStockOnly: lowStockOnly === 'true' || lowStockOnly === true
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error('Inventory Aggregation Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/reports/business-analytics
exports.getBusinessAnalytics = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const range = parseAndValidateDateRange(dateFrom, dateTo);
    if (range.error) return res.status(400).json({ message: range.error });

    const stats = await aggregateAnalytics({ dateFrom: range.start, dateTo: range.end });
    const insights = generateInsights(stats);

    return res.status(200).json({ ...stats, insights });
  } catch (error) {
    console.error('Analytics Aggregation Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/reports/definitions
exports.getReportDefinitions = async (req, res) => {
  try {
    const { type, isShared, createdBy } = req.query;
    const query = {};

    if (type) query.type = type;
    
    // Filter definitions
    const conditions = [];
    if (isShared === 'true') {
      conditions.push({ isShared: true });
    }
    if (createdBy) {
      conditions.push({ createdBy });
    }
    // Include user's own reports + shared reports by default
    if (conditions.length === 0) {
      query.$or = [
        { createdBy: req.user.id },
        { isShared: true }
      ];
    } else {
      query.$or = conditions;
    }

    const list = await ReportDefinition.find(query).sort({ updatedAt: -1 });
    return res.status(200).json(list);
  } catch (error) {
    console.error('Get Definitions Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/reports/definitions
exports.createReportDefinition = async (req, res) => {
  try {
    const { name, description, type, config, isShared } = req.body;
    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required.' });
    }

    const reportId = await generateReportNumber();

    const doc = await ReportDefinition.create({
      reportId,
      name,
      description,
      type,
      config,
      isShared,
      createdBy: req.user.id
    });

    return res.status(201).json(doc);
  } catch (error) {
    console.error('Create Definition Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/reports/definitions/:id
exports.updateReportDefinition = async (req, res) => {
  try {
    const { name, description, config, isShared } = req.body;
    const doc = await ReportDefinition.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: 'Report definition not found.' });
    }

    // Verify ownership
    if (doc.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this definition.' });
    }

    if (name) doc.name = name;
    if (description) doc.description = description;
    if (config) doc.config = config;
    if (isShared !== undefined) doc.isShared = isShared;

    await doc.save();
    return res.status(200).json(doc);
  } catch (error) {
    console.error('Update Definition Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/reports/definitions/:id
exports.deleteReportDefinition = async (req, res) => {
  try {
    const doc = await ReportDefinition.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Report definition not found.' });
    }

    // Verify ownership
    if (doc.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this definition.' });
    }

    // Clean up linked Scheduled Reports first
    await ScheduledReport.deleteMany({ reportDefinition: doc._id });

    await doc.deleteOne();
    return res.status(200).json({ message: 'Report definition successfully deleted.' });
  } catch (error) {
    console.error('Delete Definition Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/reports/definitions/:id/run
exports.runReportDefinition = async (req, res) => {
  try {
    const definition = await ReportDefinition.findById(req.params.id);
    if (!definition) {
      return res.status(404).json({ message: 'Report definition not found.' });
    }

    const { dateFrom, dateTo } = req.body;
    let dates = null;
    if (dateFrom && dateTo) {
      dates = { start: new Date(dateFrom), end: new Date(dateTo) };
    }

    // 1. Fetch data
    const { columns, data, dates: resolvedDates } = await getReportData(definition, dates);

    // Update definition lastRun timestamps
    definition.lastRunAt = new Date();
    definition.lastRunBy = req.user.id;
    await definition.save();

    // 2. Automatically launch file compilation in background for history records
    const exportPlaceholder = await ReportExport.create({
      reportDefinition: definition._id,
      name: `${definition.name} (Ad-hoc run)`,
      type: definition.type,
      format: 'xlsx', // default downloadable sheet
      status: 'generating',
      generatedBy: req.user.id
    });

    // Run async build
    generateExport({
      exportRecordId: exportPlaceholder._id,
      reportDefinitionId: definition._id,
      name: definition.name,
      type: definition.type,
      format: 'xlsx',
      columns,
      data,
      generatedBy: req.user.id
    }).catch(err => console.error('Background ad-hoc export compile failed:', err));

    return res.status(200).json({
      columns,
      data,
      dates: resolvedDates,
      exportId: exportPlaceholder._id,
      exportStatus: 'generating'
    });
  } catch (error) {
    console.error('Run Definition Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/reports/definitions/:id/favourite
exports.toggleFavouriteReport = async (req, res) => {
  try {
    const doc = await ReportDefinition.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Report definition not found.' });
    }

    doc.isFavourite = !doc.isFavourite;
    await doc.save();

    return res.status(200).json(doc);
  } catch (error) {
    console.error('Toggle Favourite Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/reports/scheduled
exports.getScheduledReports = async (req, res) => {
  try {
    const list = await ScheduledReport.find({})
      .populate('reportDefinition')
      .sort({ createdAt: -1 });
    return res.status(200).json(list);
  } catch (error) {
    console.error('Get Scheduled Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/reports/scheduled
exports.createScheduledReport = async (req, res) => {
  try {
    const { reportDefinitionId, name, frequency, dayOfWeek, dayOfMonth, time, format, recipients } = req.body;
    if (!reportDefinitionId || !name || !frequency) {
      return res.status(400).json({ message: 'reportDefinitionId, name, and frequency are required.' });
    }

    // Calculate next run date
    const nextRun = calculateNextRun(frequency, time, dayOfWeek, dayOfMonth);

    const doc = await ScheduledReport.create({
      reportDefinition: reportDefinitionId,
      name,
      frequency,
      dayOfWeek,
      dayOfMonth,
      time,
      format,
      recipients,
      nextRunAt: nextRun,
      createdBy: req.user.id
    });

    return res.status(201).json(doc);
  } catch (error) {
    console.error('Create Scheduled Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/reports/scheduled/:id
exports.updateScheduledReport = async (req, res) => {
  try {
    const { name, frequency, dayOfWeek, dayOfMonth, time, format, recipients } = req.body;
    const doc = await ScheduledReport.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: 'Scheduled report not found.' });
    }

    if (name) doc.name = name;
    if (frequency) doc.frequency = frequency;
    if (dayOfWeek !== undefined) doc.dayOfWeek = dayOfWeek;
    if (dayOfMonth !== undefined) doc.dayOfMonth = dayOfMonth;
    if (time) doc.time = time;
    if (format) doc.format = format;
    if (recipients) doc.recipients = recipients;

    // Recalculate next run date
    doc.nextRunAt = calculateNextRun(doc.frequency, doc.time, doc.dayOfWeek, doc.dayOfMonth);

    await doc.save();
    return res.status(200).json(doc);
  } catch (error) {
    console.error('Update Scheduled Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/reports/scheduled/:id
exports.deleteScheduledReport = async (req, res) => {
  try {
    const doc = await ScheduledReport.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Scheduled report not found.' });
    }

    await doc.deleteOne();
    return res.status(200).json({ message: 'Scheduled report schedule deleted.' });
  } catch (error) {
    console.error('Delete Scheduled Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/reports/scheduled/:id/toggle
exports.toggleScheduledReport = async (req, res) => {
  try {
    const doc = await ScheduledReport.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Scheduled report not found.' });
    }

    doc.isActive = !doc.isActive;
    if (doc.isActive) {
      doc.nextRunAt = calculateNextRun(doc.frequency, doc.time, doc.dayOfWeek, doc.dayOfMonth);
    } else {
      doc.nextRunAt = null;
    }

    await doc.save();
    return res.status(200).json(doc);
  } catch (error) {
    console.error('Toggle Scheduled Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/reports/scheduled/:id/run-now
exports.runScheduledReportNow = async (req, res) => {
  try {
    const doc = await ScheduledReport.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Scheduled report not found.' });
    }

    // Run report asynchronously to avoid blocking API
    runScheduledReport(doc).catch(err => console.error('Manual execution of schedule failed:', err));

    return res.status(200).json({ message: 'Scheduled report triggered successfully. Running in background.' });
  } catch (error) {
    console.error('Run Scheduled Now Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/reports/exports
exports.getReportExports = async (req, res) => {
  try {
    const { type, format, status, dateFrom, dateTo } = req.query;
    const query = {};

    if (type) query.type = type;
    if (format) query.format = format;
    if (status) query.status = status;
    
    if (dateFrom || dateTo) {
      query.generatedAt = {};
      if (dateFrom) query.generatedAt.$gte = new Date(dateFrom);
      if (dateTo) query.generatedAt.$lte = new Date(dateTo);
    }

    const list = await ReportExport.find(query)
      .populate('reportDefinition')
      .populate('generatedBy', 'name email')
      .sort({ generatedAt: -1 });

    return res.status(200).json(list);
  } catch (error) {
    console.error('Get Exports Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/reports/exports
exports.createReportExport = async (req, res) => {
  try {
    const { name, type, format, columns, data } = req.body;
    if (!name || !type || !format || !columns || !data) {
      return res.status(400).json({ message: 'name, type, format, columns, and data are required.' });
    }

    // Create generating log
    const doc = await ReportExport.create({
      name,
      type,
      format,
      status: 'generating',
      generatedBy: req.user.id
    });

    // Run generation in the background
    generateExport({
      exportRecordId: doc._id,
      name,
      type,
      format,
      columns,
      data,
      generatedBy: req.user.id
    }).catch(err => console.error('Async manual build failed:', err));

    return res.status(201).json(doc);
  } catch (error) {
    console.error('Create Export Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/reports/exports/:id/download
exports.downloadReportExport = async (req, res) => {
  try {
    const doc = await ReportExport.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Report export log not found.' });
    }

    if (doc.status !== 'ready') {
      return res.status(400).json({ message: 'Report file is not ready or has failed generation.' });
    }

    // Generate fresh presigned download URL
    const freshUrl = await storageAdapter.getPresignedUrl(doc.storageKey, 900); // 15 mins expiry for link
    doc.fileUrl = freshUrl;
    await doc.save();

    return res.status(200).json({ url: freshUrl });
  } catch (error) {
    console.error('Download Export Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/reports/exports/:id
exports.deleteReportExport = async (req, res) => {
  try {
    const doc = await ReportExport.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Report export log not found.' });
    }

    // Delete file from storage key (gracefully skip if it fails/doesn't exist)
    if (doc.storageKey) {
      try {
        await storageAdapter.delete(doc.storageKey);
      } catch (err) {
        console.warn(`Could not delete storage key file: ${doc.storageKey}`, err);
      }
    }

    await doc.deleteOne();
    return res.status(200).json({ message: 'Report file and export registry logs deleted.' });
  } catch (error) {
    console.error('Delete Export Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
