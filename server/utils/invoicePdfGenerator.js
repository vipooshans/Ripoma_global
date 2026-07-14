/**
 * Commercial / proforma invoice PDF — branded RIPOMA template.
 */
const { generateBrandedInvoicePdf, formatMoney } = require('./invoiceTemplatePdf');

const generateInvoicePdf = (invoice) => {
  const customer = invoice.customer || {};
  const primary =
    (customer.contacts || []).find((c) => c.isPrimary) || (customer.contacts || [])[0] || {};
  const addr = customer.address || {};

  const billToLines = [
    customer.companyName || 'Walk-in Customer',
    primary.email || primary.phone || '',
    [addr.street, addr.city, addr.country].filter(Boolean).join(', ')
  ].filter(Boolean);

  const currency = invoice.currency || 'LKR';
  const lines = [];

  (invoice.items || []).forEach((item) => {
    const qty = item.quantity != null ? item.quantity : 1;
    const name = item.description || 'Product Item';
    lines.push({
      description: qty > 1 ? `${qty} × ${name}` : name,
      amount: Number(item.lineTotal != null ? item.lineTotal : item.unitPrice || 0)
    });
  });

  if (Number(invoice.discountTotal) > 0) {
    lines.push({ description: 'Discount', amount: -Number(invoice.discountTotal) });
  }
  if (Number(invoice.shippingCharge) > 0) {
    lines.push({ description: 'Shipping', amount: Number(invoice.shippingCharge) });
  }
  if (Number(invoice.taxTotal) > 0) {
    lines.push({ description: 'Tax', amount: Number(invoice.taxTotal) });
  }

  const notes = [];
  if (invoice.type) notes.push(`Type: ${String(invoice.type).toUpperCase()}`);
  if (invoice.status) notes.push(`Status: ${String(invoice.status).toUpperCase()}`);
  if (invoice.dueDate) {
    const d = new Date(invoice.dueDate);
    notes.push(
      `Due: ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    );
  }
  if (invoice.amountPaid > 0) {
    notes.push(`Paid: ${formatMoney(invoice.amountPaid, currency)}`);
  }
  if (invoice.notes) notes.push(invoice.notes);
  if (invoice.paymentInstructions) notes.push(invoice.paymentInstructions);

  return generateBrandedInvoicePdf({
    invoiceNumber: invoice.invoiceNumber || 'INV-TEMP',
    invoiceDate: invoice.issueDate || new Date(),
    billToLines,
    lines,
    total: Number(invoice.grandTotal || 0),
    currency,
    notes
  });
};

module.exports = generateInvoicePdf;
