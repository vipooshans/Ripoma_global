/**
 * Shared helpers for the RIPOMA invoice PDF template (Courier, no native deps).
 * Layout matches the branded slash-header / DESCRIPTION·AMOUNT / TOTAL box design.
 */

const COMPANY_LINES = ['RIPOMA', 'GLOBAL TRADING (PVT) LTD'];

const escapePdf = (text) =>
  String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const formatDateDdMmYyyy = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatMoney = (amount, currency = 'LKR') => {
  const n = Number(amount || 0).toFixed(2);
  const code = String(currency || 'LKR').toUpperCase();
  // Storefront displays LKR (including legacy USD catalog values)
  if (code === 'LKR' || code === 'RS' || code === 'RS.' || code === 'USD') return `LKR ${n}`;
  return `${code} ${n}`;
};

const buildPdfFromStream = (streamContent) => {
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
    '<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>',
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
    currentOffset += Buffer.byteLength(`${obj}\n`, 'utf-8');
    return obj;
  });

  const finalBodyStr = `${objStrings.join('\n')}\n`;
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

  return Buffer.from(
    header + finalBodyStr + `${xrefLines.join('\n')}\n` + trailer.join('\n'),
    'binary'
  );
};

/**
 * @param {Object} opts
 * @param {string} opts.invoiceNumber
 * @param {string|Date} opts.invoiceDate
 * @param {string[]} opts.billToLines
 * @param {{ description: string, amount: number }[]} opts.lines
 * @param {number} opts.total
 * @param {string} [opts.currency]
 * @param {string[]} [opts.notes]
 */
const generateBrandedInvoicePdf = ({
  invoiceNumber,
  invoiceDate,
  billToLines = [],
  lines = [],
  total = 0,
  currency = 'LKR',
  notes = []
}) => {
  const left = 50;
  const right = 562;
  const width = right - left;
  const dateStr = formatDateDdMmYyyy(invoiceDate);
  const totalLabel = formatMoney(total, currency);

  const ops = [];

  // Decorative slash bar (light gray)
  ops.push('0.72 g');
  ops.push('BT');
  ops.push('/F1 11 Tf');
  ops.push(`${left} 750 Td`);
  ops.push(`(${escapePdf('////////////////////////////////')}) Tj`);
  ops.push('ET');
  ops.push('0 g');

  // Title "invoice"
  ops.push('BT');
  ops.push('/F1 36 Tf');
  ops.push(`${left} 700 Td`);
  ops.push(`(${escapePdf('invoice')}) Tj`);
  ops.push('ET');

  // FROM (left) + invoice meta (right)
  ops.push('BT');
  ops.push('/F1 9 Tf');
  ops.push(`${left} 660 Td`);
  ops.push(`(${escapePdf('FROM')}) Tj`);
  ops.push('0 -14 Td');
  COMPANY_LINES.forEach((line, i) => {
    ops.push(`(${escapePdf(line)}) Tj`);
    if (i < COMPANY_LINES.length - 1) ops.push('0 -12 Td');
  });
  ops.push('ET');

  ops.push('BT');
  ops.push('/F1 9 Tf');
  ops.push('380 660 Td');
  ops.push(`(${escapePdf(`INVOICE #  ${invoiceNumber || ''}`)}) Tj`);
  ops.push('0 -14 Td');
  ops.push(`(${escapePdf(`INVOICE DATE  ${dateStr}`)}) Tj`);
  ops.push('ET');

  // BILL TO
  const billLines = (billToLines || []).filter((l) => String(l || '').trim());
  ops.push('BT');
  ops.push('/F1 9 Tf');
  ops.push(`${left} 600 Td`);
  ops.push(`(${escapePdf('BILL TO')}) Tj`);
  if (billLines.length) {
    billLines.slice(0, 6).forEach((line) => {
      ops.push('0 -12 Td');
      ops.push(`(${escapePdf(String(line).slice(0, 70))}) Tj`);
    });
  } else {
    ops.push('0 -12 Td');
    ops.push('(—) Tj');
  }
  ops.push('ET');

  // DESCRIPTION / AMOUNT header box
  const headerTop = 500;
  const headerH = 28;
  ops.push('0.5 w');
  ops.push(`${left} ${headerTop - headerH} ${width} ${headerH} re S`);

  ops.push('BT');
  ops.push('/F1 10 Tf');
  ops.push(`${left + 12} ${headerTop - 18} Td`);
  ops.push('(DESCRIPTION) Tj');
  ops.push('ET');

  // Right-align AMOUNT roughly
  ops.push('BT');
  ops.push('/F1 10 Tf');
  ops.push(`${right - 70} ${headerTop - 18} Td`);
  ops.push('(AMOUNT) Tj');
  ops.push('ET');

  // Line items
  let y = headerTop - headerH - 22;
  const itemLines = lines.length
    ? lines
    : [{ description: 'No items listed.', amount: null }];

  itemLines.forEach((item) => {
    if (y < 160) return;
    const desc = String(item.description || '').slice(0, 55);
    ops.push('BT');
    ops.push('/F1 10 Tf');
    ops.push(`${left + 12} ${y} Td`);
    ops.push(`(${escapePdf(desc)}) Tj`);
    ops.push('ET');

    if (item.amount != null && item.amount !== '') {
      const amt = formatMoney(item.amount, currency);
      const approxCharW = 6;
      const amtX = right - 12 - amt.length * approxCharW;
      ops.push('BT');
      ops.push('/F1 10 Tf');
      ops.push(`${Math.max(left + 280, amtX)} ${y} Td`);
      ops.push(`(${escapePdf(amt)}) Tj`);
      ops.push('ET');
    }
    y -= 18;
  });

  // Optional notes above total
  if (notes.length) {
    y -= 10;
    notes.slice(0, 4).forEach((note) => {
      if (y < 140) return;
      ops.push('BT');
      ops.push('/F1 8 Tf');
      ops.push(`${left + 12} ${y} Td`);
      ops.push(`(${escapePdf(String(note).slice(0, 80))}) Tj`);
      ops.push('ET');
      y -= 12;
    });
  }

  // TOTAL box (thicker border)
  const totalBottom = 72;
  const totalH = 42;
  ops.push('2.5 w');
  ops.push(`${left} ${totalBottom} ${width} ${totalH} re S`);
  ops.push('0.5 w');

  ops.push('BT');
  ops.push('/F2 16 Tf');
  ops.push(`${left + 14} ${totalBottom + 14} Td`);
  ops.push('(TOTAL) Tj');
  ops.push('ET');

  const totalAmtX = right - 14 - totalLabel.length * 9.5;
  ops.push('BT');
  ops.push('/F2 16 Tf');
  ops.push(`${Math.max(left + 200, totalAmtX)} ${totalBottom + 14} Td`);
  ops.push(`(${escapePdf(totalLabel)}) Tj`);
  ops.push('ET');

  return buildPdfFromStream(ops.join('\n'));
};

module.exports = {
  COMPANY_LINES,
  formatDateDdMmYyyy,
  formatMoney,
  generateBrandedInvoicePdf
};
