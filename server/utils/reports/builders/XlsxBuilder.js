const ExcelJS = require('exceljs');

/**
 * Generates an Excel workbook buffer from columns config and records.
 * 
 * @param {string[]} columns - Column keys
 * @param {object[]} data - Tabular datasets
 * @param {string} [reportName] - Worksheet title
 * @returns {Promise<{buffer: Buffer, mimeType: string}>} XLSX export details
 */
const buildXlsx = async (columns, data, reportName = 'Report') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(reportName);

  // Set columns structures
  worksheet.columns = columns.map(col => {
    // Format header label nicely (e.g. "totalRevenue" -> "Total Revenue")
    const headerLabel = col
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();

    return {
      header: headerLabel,
      key: col,
      width: 15
    };
  });

  // Add records
  data.forEach(item => {
    const rowObj = {};
    columns.forEach(col => {
      let val = item[col];
      if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
        val = val.name || val.companyName || JSON.stringify(val);
      }
      rowObj[col] = val !== undefined ? val : '';
    });
    worksheet.addRow(rowObj);
  });

  // Freeze top row
  worksheet.views = [
    { state: 'frozen', ySplit: 1 }
  ];

  // Style header row (Navy/Teal fill, White bold text)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' } // Brand Teal #0D9488
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  // Format cells: currency for money, borders, alignment
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    row.height = 20;
    row.eachCell((cell, colNumber) => {
      const colKey = columns[colNumber - 1];
      
      const isMoney = /revenue|cogs|expense|profit|amount|total|charge|cost|price/i.test(colKey);
      if (isMoney && typeof cell.value === 'number') {
        cell.numFmt = '$#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (cell.value instanceof Date) {
        cell.value = cell.value.toISOString().split('T')[0];
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      // Add border dividers
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Dynamically set widths based on longest string cell
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      const value = cell.value ? String(cell.value) : '';
      if (value.length > maxLength) {
        maxLength = value.length;
      }
    });
    column.width = Math.max(maxLength + 4, 12);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
};

module.exports = buildXlsx;
