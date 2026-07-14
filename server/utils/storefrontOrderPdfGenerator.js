/**
 * Storefront order invoice PDF — branded RIPOMA template.
 */
const { generateBrandedInvoicePdf, formatMoney } = require('./invoiceTemplatePdf');

const generateStorefrontOrderPdf = (order) => {
  const contact = order.contact || {};
  const customerName =
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Customer';
  const addr = order.shippingAddress || {};
  const currency = order.currency || 'USD';

  const billToLines = [
    customerName,
    contact.email || '',
    contact.phone || '',
    [addr.street, addr.city, addr.state, addr.postalCode, addr.country]
      .filter(Boolean)
      .join(', ')
  ].filter(Boolean);

  const lines = [];
  (order.items || []).forEach((item) => {
    const qty = item.qty != null ? item.qty : 1;
    const name = item.name || item.sku || 'Product';
    lines.push({
      description: qty > 1 ? `${qty} × ${name}` : name,
      amount: Number(item.lineTotal != null ? item.lineTotal : 0)
    });
  });

  if (Number(order.discount) > 0) {
    lines.push({
      description: order.couponCode ? `Discount (${order.couponCode})` : 'Discount',
      amount: -Number(order.discount)
    });
  }
  if (Number(order.shipping) > 0) {
    lines.push({ description: 'Shipping', amount: Number(order.shipping) });
  }
  if (Number(order.tax) > 0) {
    lines.push({ description: 'Tax', amount: Number(order.tax) });
  }

  const notes = [];
  if (order.orderStatus) notes.push(`Order status: ${String(order.orderStatus).toUpperCase()}`);
  if (order.paymentMethod) {
    notes.push(`Payment: ${String(order.paymentMethod).replace(/_/g, ' ').toUpperCase()}`);
  }
  if (order.paymentStatus) notes.push(`Payment status: ${String(order.paymentStatus).toUpperCase()}`);
  if (order.paymentReference) notes.push(`Ref: ${order.paymentReference}`);
  if (order.carrier || order.trackingNumber) {
    notes.push(
      `Ship: ${[order.carrier, order.trackingNumber].filter(Boolean).join(' · ')}`
    );
  }
  if (order.customerNote) notes.push(order.customerNote);

  return generateBrandedInvoicePdf({
    invoiceNumber: order.orderNumber || 'WEB-TEMP',
    invoiceDate: order.placedAt || order.createdAt || new Date(),
    billToLines,
    lines,
    total: Number(order.grandTotal || 0),
    currency,
    notes
  });
};

module.exports = generateStorefrontOrderPdf;
