/**
 * Pure JavaScript PDF Generator for Invoices.
 * Outputs a valid, basic PDF document using Courier font.
 * Avoids any heavy native/C++ binary dependencies in local Windows environments.
 * 
 * @param {Object} invoice - Invoice database document with populated customer/items
 * @returns {Buffer} - PDF File Buffer
 */
const generateInvoicePdf = (invoice) => {
  const invoiceNum = invoice.invoiceNumber || 'INV-TEMP';
  const customerName = (invoice.customer && invoice.customer.companyName) || 'Walk-in Customer';
  const dateStr = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : new Date().toLocaleDateString();
  const dueStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : new Date().toLocaleDateString();
  const status = (invoice.status || 'draft').toUpperCase();
  const invType = (invoice.type || 'commercial').toUpperCase();
  const currency = invoice.currency || 'USD';

  // Construct text lines
  const textLines = [
    `RIPOMA GLOBAL - ${invType} INVOICE`,
    `========================================`,
    `Invoice Number : ${invoiceNum}`,
    `Invoice Status : ${status}`,
    `Issue Date     : ${dateStr}`,
    `Due Date       : ${dueStr}`,
    `Currency       : ${currency}`,
    ``,
    `BILL TO:`,
    `----------------------------------------`,
    `Company Name   : ${customerName}`,
    `Email/Contact  : ${invoice.customer?.contacts?.find(c => c.isPrimary)?.email || 'N/A'}`,
    `Address        : ${invoice.customer?.address?.street || ''}, ${invoice.customer?.address?.city || ''}, ${invoice.customer?.address?.country || ''}`,
    ``,
    `ITEMS:`,
    `--------------------------------------------------------------------------------`,
    `Qty       Description                        Price       Discount    Line Total`,
    `--------------------------------------------------------------------------------`,
  ];

  // Add line items
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach(item => {
      const qty = String(item.quantity).padEnd(9);
      const desc = String(item.description || 'Product Item').slice(0, 32).padEnd(34);
      const price = String(item.unitPrice.toFixed(2)).padEnd(11);
      const disc = String((item.discount || 0) + '%').padEnd(11);
      const total = String(item.lineTotal.toFixed(2));
      textLines.push(`${qty}${desc}${price}${disc}${total}`);
    });
  } else {
    textLines.push(`No items listed.`);
  }

  textLines.push(
    `--------------------------------------------------------------------------------`,
    `Subtotal        : ${currency} ${invoice.subtotal ? invoice.subtotal.toFixed(2) : '0.00'}`,
    `Tax Total       : ${currency} ${invoice.taxTotal ? invoice.taxTotal.toFixed(2) : '0.00'}`,
    `Discount Total  : ${currency} -${invoice.discountTotal ? invoice.discountTotal.toFixed(2) : '0.00'}`,
    `Shipping Charge : ${currency} ${invoice.shippingCharge ? invoice.shippingCharge.toFixed(2) : '0.00'}`,
    `Grand Total     : ${currency} ${invoice.grandTotal ? invoice.grandTotal.toFixed(2) : '0.00'}`,
    `Amount Paid     : ${currency} ${invoice.amountPaid ? invoice.amountPaid.toFixed(2) : '0.00'}`,
    `Amount Due      : ${currency} ${((invoice.grandTotal || 0) - (invoice.amountPaid || 0)).toFixed(2)}`,
    ``,
    `Notes:`,
    `----------------------------------------`,
    `${invoice.notes || 'Thank you for your business.'}`,
    ``,
    `Payment Instructions:`,
    `${invoice.paymentInstructions || 'Please pay per agreed terms.'}`
  );

  // Construct PDF structure
  // Courier is built into PDF readers. /F1 is defined as Courier.
  const contentStreamLines = [
    'BT',
    '/F1 10 Tf',
    '12 TL',
    '50 730 Td',
  ];

  textLines.forEach(line => {
    // Escape parentheses and backslashes
    const escaped = line
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    contentStreamLines.push(`(${escaped}) Tj T*`);
  });
  contentStreamLines.push('ET');

  const streamContent = contentStreamLines.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'utf-8');

  // Build the raw objects list
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

  const header = '%PDF-1.4\n';
  const bodyStr = body.join('\n') + '\n';
  
  // Calculate cross-reference table offsets
  const startXref = header.length + bodyStr.length;
  
  const xref = [
    'xref',
    '0 5',
    '0000000000 65535 f',
    '0000000009 00000 n', // 1 0 obj is right after %PDF-1.4 (9 bytes)
    // 2 0 obj offset: header + (1 0 obj length + newline)
    // Let's compute offsets dynamically to be correct!
  ];

  // We can write a simpler PDF builder that computes offsets dynamically
  // or just write a standard plain PDF buffer. PDF readers are extremely lenient
  // about the exact offsets in the xref table as long as the format is mostly correct.
  // Let's make it dynamically calculated to be perfectly compliant.
  
  const objOffsets = [];
  let currentOffset = header.length;
  
  const objStrings = body.map(obj => {
    const offset = currentOffset;
    objOffsets.push(offset);
    currentOffset += Buffer.byteLength(obj + '\n', 'utf-8');
    return obj;
  });

  const finalBodyStr = objStrings.join('\n') + '\n';
  const xrefOffset = header.length + finalBodyStr.length;

  const xrefLines = [
    'xref',
    '0 5',
    '0000000000 65535 f'
  ];

  for (let i = 0; i < 4; i++) {
    const offStr = String(objOffsets[i]).padStart(10, '0');
    xrefLines.push(`${offStr} 00000 n`);
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

module.exports = generateInvoicePdf;
