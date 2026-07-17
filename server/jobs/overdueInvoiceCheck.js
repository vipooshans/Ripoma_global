const cron = require('node-cron');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { sendNotification } = require('../utils/notifyService');

/**
 * Audit and transition unpaid invoices past their due date to 'overdue' status.
 */
const runOverdueInvoiceCheck = async () => {
  try {
    console.log('[CRON] Executing daily overdue invoices audit...');
    const now = new Date();
    
    const overdueInvoices = await Invoice.find({
      status: { $in: ['draft', 'sent', 'viewed'] },
      dueDate: { $lt: now }
    });

    const staffToNotify = await User.find({
      role: { $in: ['admin', 'manager'] },
      deleted: { $ne: true },
      status: 'active'
    });

    let updatedCount = 0;
    for (const invoice of overdueInvoices) {
      invoice.status = 'overdue';
      await invoice.save();
      updatedCount++;

      for (const staff of staffToNotify) {
        await sendNotification({
          recipientId: staff._id,
          type: 'invoice_overdue',
          severity: 'warning',
          title: `Invoice overdue: ${invoice.invoiceNumber}`,
          body: `Invoice ${invoice.invoiceNumber} is past due (${new Date(invoice.dueDate).toLocaleDateString()}). Outstanding: ${(invoice.grandTotal || 0) - (invoice.amountPaid || 0)}.`,
          actionUrl: `/exports/invoices/${invoice._id}`,
          actionLabel: 'View Invoice',
          entityType: 'Invoice',
          entityId: invoice._id,
          entityRef: invoice.invoiceNumber
        });
      }
    }

    console.log(`[CRON] Overdue invoices check complete. Updated ${updatedCount} invoices to overdue.`);
  } catch (error) {
    console.error('[CRON ERROR] Failed to run overdue invoice audit:', error);
  }
};

const initOverdueInvoiceCron = () => {
  cron.schedule('0 0 * * *', runOverdueInvoiceCheck);
  console.log('[CRON] Overdue invoice daily monitor worker initialized.');
};

module.exports = {
  initOverdueInvoiceCron,
  runOverdueInvoiceCheck
};
