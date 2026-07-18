const cron = require('node-cron');
const ScheduledReport = require('../models/ScheduledReport');
const ReportDefinition = require('../models/ReportDefinition');
const ReportExport = require('../models/ReportExport');
const { generateExport } = require('../utils/reports/exportBuilder');
const { aggregateSales } = require('../utils/reports/salesAggregator');
const { aggregateFinancials } = require('../utils/reports/financialAggregator');
const { aggregateInventory } = require('../utils/reports/inventoryAggregator');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Product = require('../models/Product');

/**
 * Resolves date window based on saved presets
 */
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

/**
 * Resolves columns list and data rows for a report definition
 */
const getReportData = async (definition) => {
  const config = definition.config || {};
  const dates = resolvePresetDates(config.dateRangePreset, config.dateFrom, config.dateTo);
  
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
    case 'supplier': {
      data = await Supplier.find({}).lean();
      if (columns.length === 0) {
        columns = ['companyName', 'contactName', 'email', 'phone', 'country', 'status'];
      }
      break;
    }
    case 'customer': {
      data = await Customer.find({}).lean();
      if (columns.length === 0) {
        columns = ['companyName', 'contactName', 'email', 'phone', 'country', 'status'];
      }
      break;
    }
    case 'inventory': {
      const inv = await aggregateInventory({});
      data = inv.rows || [];
      if (columns.length === 0) {
        columns = ['sku', 'name', 'warehouse', 'quantityOnHand', 'quantityAvailable', 'stockValue', 'isLowStock'];
      }
      break;
    }
    case 'custom':
    default: {
      const inv = await aggregateInventory({});
      data = inv.rows || [];
      if (columns.length === 0) {
        columns = ['sku', 'name', 'warehouse', 'quantityOnHand', 'stockValue'];
      }
      break;
    }
  }

  return { columns, data };
};

/**
 * Computes next run timestamp for recurrence schedules
 */
const calculateNextRun = (frequency, timeStr, dayOfWeek, dayOfMonth) => {
  const now = new Date();
  const [hour, minute] = (timeStr || '07:00').split(':').map(Number);
  
  let next = new Date(now);
  next.setHours(hour, minute, 0, 0);

  if (frequency === 'daily') {
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else if (frequency === 'weekly') {
    const targetDay = dayOfWeek !== undefined ? dayOfWeek : 1; // Default Monday
    const currentDay = now.getDay();
    let daysToAdd = (targetDay - currentDay + 7) % 7;
    if (daysToAdd === 0 && next <= now) {
      daysToAdd = 7;
    }
    next.setDate(next.getDate() + daysToAdd);
  } else if (frequency === 'monthly') {
    const targetDay = dayOfMonth !== undefined ? dayOfMonth : 1;
    next.setDate(targetDay);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(targetDay);
    }
  } else if (frequency === 'quarterly') {
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);
    const nextQuarterMonth = (currentQuarter + 1) * 3; // Month indexes: Jan=0, Apr=3, Jul=6, Oct=9
    
    next = new Date(now.getFullYear(), nextQuarterMonth, 1);
    next.setHours(hour, minute, 0, 0);
  }

  return next;
};

/**
 * Executes a single scheduled report.
 */
const runScheduledReport = async (schedule) => {
  console.log(`[CRON REPORT] Running scheduled report: "${schedule.name}"...`);
  
  // Register a ReportExport placeholder in generating state
  const exportLog = await ReportExport.create({
    reportDefinition: schedule.reportDefinition,
    scheduledReport: schedule._id,
    name: schedule.name,
    type: 'custom',
    format: schedule.format,
    status: 'generating',
    generatedBy: schedule.createdBy
  });

  try {
    const definition = await ReportDefinition.findById(schedule.reportDefinition);
    if (!definition) {
      throw new Error(`Report definition ${schedule.reportDefinition} not found for schedule ${schedule._id}`);
    }

    // Update log type based on definition
    exportLog.type = definition.type;
    await exportLog.save();

    // 1. Resolve columns and records
    const { columns, data } = await getReportData(definition);

    // 2. Generate, save, and email report file
    await generateExport({
      exportRecordId: exportLog._id,
      reportDefinitionId: definition._id,
      scheduledReportId: schedule._id,
      name: schedule.name,
      type: definition.type,
      format: schedule.format,
      columns,
      data,
      generatedBy: schedule.createdBy,
      recipients: schedule.recipients
    });

    // 3. Update schedule status
    schedule.lastRunAt = new Date();
    schedule.lastRunStatus = 'success';
    schedule.nextRunAt = calculateNextRun(schedule.frequency, schedule.time, schedule.dayOfWeek, schedule.dayOfMonth);
    await schedule.save();

    console.log(`[CRON REPORT] Scheduled report "${schedule.name}" successfully executed.`);
  } catch (err) {
    console.error(`[CRON REPORT ERROR] Scheduled run failed for: "${schedule.name}"`, err);
    
    exportLog.status = 'failed';
    await exportLog.save();

    schedule.lastRunAt = new Date();
    schedule.lastRunStatus = 'failed';
    schedule.nextRunAt = calculateNextRun(schedule.frequency, schedule.time, schedule.dayOfWeek, schedule.dayOfMonth);
    await schedule.save();
  }
};

/**
 * Evaluates active scheduled reports and triggers due tasks.
 */
const runDueSchedules = async () => {
  try {
    const now = new Date();
    
    // Find active schedules that are due
    const dueSchedules = await ScheduledReport.find({
      isActive: true,
      $or: [
        { nextRunAt: { $lte: now } },
        { nextRunAt: { $exists: false } },
        { nextRunAt: null }
      ]
    });

    if (dueSchedules.length > 0) {
      console.log(`[CRON REPORT] Found ${dueSchedules.length} scheduled reports due.`);
      for (const schedule of dueSchedules) {
        await runScheduledReport(schedule);
      }
    }
  } catch (error) {
    console.error('[CRON REPORT ERROR] Failed to fetch due scheduled reports:', error);
  }
};

/**
 * Initializes the report scheduler. Runs every 15 minutes.
 */
const initScheduledReportCron = () => {
  cron.schedule('*/15 * * * *', async () => {
    await runDueSchedules();
  });
  console.log('[CRON] Scheduled Reports Engine (every 15 min) initialized.');
};

module.exports = {
  initScheduledReportCron,
  runDueSchedules,
  runScheduledReport,
  calculateNextRun
};
