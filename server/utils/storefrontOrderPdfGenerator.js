/**
 * Pure JS PDF for storefront order invoices/receipts (Courier, no native deps).
 * Adapted from invoicePdfGenerator.js
 */
const generateStorefrontOrderPdf = (order) => {
  const invoiceNum = order.orderNumber || 'WEB-TEMP';
  const contact = order.contact || {};
  const customerName =
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Customer';
  const addr = order.shippingAddress || {};
  const dateStr = order.placedAt
    ? new Date(order.placedAt).toLocaleDateString()
    : new Date().toLocaleDateString();
  const currency = order.currency || 'USD';
  const status = (order.orderStatus || 'placed').toUpperCase();

  const textLines = [
    `RIPOMA GLOBAL - ORDER INVOICE`,
    `========================================`,
    `Invoice / Order : ${invoiceNum}`,
    `Order Status    : ${status}`,
    `Issue Date      : ${dateStr}`,
    `Payment Method  : ${(order.paymentMethod || '').toUpperCase()}`,
    `Payment Status  : ${(order.paymentStatus || '').toUpperCase()}`,
    `Currency        : ${currency}`,
    ``,
    `BILL / SHIP TO:`,
    `----------------------------------------`,
    `Name            : ${customerName}`,
    `Email           : ${contact.email || 'N/A'}`,
    `Phone           : ${contact.phone || 'N/A'}`,
    `Address         : ${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}, ${addr.country || ''}`,
    ``,
    `ITEMS:`,
    `--------------------------------------------------------------------------------`,
    `Qty       Description                        Unit Price              Line Total`,
    `--------------------------------------------------------------------------------`
  ];

  if (order.items && order.items.length > 0) {
    order.items.forEach((item) => {
      const qty = String(item.qty).padEnd(9);
      const desc = String(item.name || item.sku || 'Product').slice(0, 32).padEnd(34);
      const price = String(Number(item.unitPrice || 0).toFixed(2)).padEnd(24);
      const total = String(Number(item.lineTotal || 0).toFixed(2));
      textLines.push(`${qty}${desc}${price}${total}`);
    });
  } else {
    textLines.push(`No items listed.`);
  }

    textLines.push(
      `--------------------------------------------------------------------------------`,
      `Subtotal        : ${currency} ${Number(order.subtotal || 0).toFixed(2)}`,
      `Discount        : ${currency} -${Number(order.discount || 0).toFixed(2)}`,
      `Shipping        : ${currency} ${Number(order.shipping || 0).toFixed(2)}`,
      `Tax             : ${currency} ${Number(order.tax || 0).toFixed(2)}`,
      `Grand Total     : ${currency} ${Number(order.grandTotal || 0).toFixed(2)}`,
      ``,
      `Notes:`,
      `----------------------------------------`,
      `${order.customerNote || 'Thank you for your order.'}`
    );
    if (order.couponCode) textLines.push(`Coupon applied: ${order.couponCode}`);
    if (order.paymentReference) textLines.push(`Payment reference: ${order.paymentReference}`);
    if (order.carrier || order.trackingNumber || order.estimatedDeliveryDate) {
      textLines.push(``, `SHIPPING:`, `----------------------------------------`);
      if (order.carrier) textLines.push(`Carrier         : ${order.carrier}`);
      if (order.trackingNumber) textLines.push(`Tracking Number : ${order.trackingNumber}`);
      if (order.estimatedDeliveryDate) {
        textLines.push(
          `Est. Delivery   : ${new Date(order.estimatedDeliveryDate).toLocaleDateString()}`
        );
      }
      if (order.trackingUrl) textLines.push(`Tracking URL    : ${order.trackingUrl}`);
    }

  const contentStreamLines = ['BT', '/F1 10 Tf', '12 TL', '50 730 Td'];

  textLines.forEach((line) => {
    const escaped = String(line)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    contentStreamLines.push(`(${escaped}) Tj T*`);
  });
  contentStreamLines.push('ET');

  const streamContent = contentStreamLines.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'utf-8');

  const header = '%PDF-1.4\n';
  const body = [
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>',
    'endobj',
    '4 0 obj',
    `<< /Length ${streamLength} >>`,
    'stream',
    streamContent,
    'endstream',
    'endobj'
  ];

  const objOffsets = [];
  let currentOffset = header.length;
  const objStrings = body.map((obj) => {
    const offset = currentOffset;
    objOffsets.push(offset);
    currentOffset += Buffer.byteLength(obj + '\n', 'utf-8');
    return obj;
  });

  const finalBodyStr = objStrings.join('\n') + '\n';
  const xrefOffset = header.length + finalBodyStr.length;
  const xrefLines = ['xref', '0 5', '0000000000 65535 f'];
  for (let i = 0; i < 4; i++) {
    xrefLines.push(`${String(objOffsets[i]).padStart(10, '0')} 00000 n`);
  }

  const trailer = [
    'trailer',
    '<< /Size 5 /Root 1 0 R >>',
    'startxref',
    `${xrefOffset}`,
    '%%EOF'
  ];

  const pdfString = header + finalBodyStr + xrefLines.join('\n') + '\n' + trailer.join('\n');
  return Buffer.from(pdfString, 'binary');
};

module.exports = generateStorefrontOrderPdf;
