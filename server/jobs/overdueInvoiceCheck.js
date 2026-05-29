const cron = require('node-cron');
const Invoice = require('../models/Invoice');

/**
 * Audit and transition unpaid invoices past their due date to 'overdue' status.
 */
const runOverdueInvoiceCheck = async () => {
  try {
    console.log('[CRON] Executing daily overdue invoices audit...');
    const now = new Date();
    
    // Find invoices that are not paid, cancelled, or already overdue, and have passed their due date
    const overdueInvoices = await Invoice.find({
      status: { $in: ['draft', 'sent', 'viewed'] },
      dueDate: { $lt: now }
    });

    let updatedCount = 0;
    for (const invoice of overdueInvoices) {
      invoice.status = 'overdue';
      await invoice.save();
      
      console.warn(
        `[CRON ALERT] Invoice ${invoice.invoiceNumber} is OVERDUE. ` +
        `Due Date: ${invoice.dueDate.toLocaleDateString()}, Grand Total: ${invoice.grandTotal}, Outstanding: ${invoice.grandTotal - invoice.amountPaid}`
      );
      updatedCount++;
    }

    console.log(`[CRON] Overdue invoices check complete. Updated ${updatedCount} invoices to overdue.`);
  } catch (error) {
    console.error('[CRON ERROR] Failed to run overdue invoice audit:', error);
  }
};

/**
 * Initializes the node-cron scheduler.
 * Runs daily at midnight (0 0 * * *).
 */
const initOverdueInvoiceCron = () => {
  cron.schedule('0 0 * * *', runOverdueInvoiceCheck);
  console.log('[CRON] Overdue invoice daily monitor worker initialized.');
};

module.exports = {
  initOverdueInvoiceCron,
  runOverdueInvoiceCheck
};
