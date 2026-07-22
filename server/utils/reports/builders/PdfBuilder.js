const pdfmake = require('pdfmake');

// Built-in Helvetica (Standard 14) — no disk TTF load
pdfmake.addFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
});

/**
 * Generates a PDF file buffer from tabular data.
 * 
 * @param {string[]} columns - Keys/headers
 * @param {object[]} data - List of records
 * @param {string} [reportName] - Title
 * @param {string} [dateRangeStr] - Visual date period description
 * @returns {Promise<{buffer: Buffer, mimeType: string}>} PDF export details
 */
const buildPdf = async (columns, data, reportName = 'Operational Report', dateRangeStr = 'N/A') => {
  const tableHeaders = columns.map(col => {
    const headerLabel = col
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
    return { text: headerLabel, style: 'tableHeader' };
  });

  const tableBody = [tableHeaders];
  data.forEach(item => {
    const rowCells = columns.map(col => {
      let val = item[col];
      if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
        val = val.name || val.companyName || JSON.stringify(val);
      }
      
      const isMoney = /revenue|cogs|expense|profit|amount|total|charge|cost|price/i.test(col);
      let text = val !== undefined ? String(val) : '';
      if (typeof val === 'number') {
        text = isMoney 
          ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
          : val.toLocaleString();
      } else if (val instanceof Date) {
        text = val.toISOString().split('T')[0];
      }

      return {
        text,
        alignment: typeof val === 'number' ? 'right' : (val instanceof Date ? 'center' : 'left'),
        style: 'tableCell'
      };
    });
    tableBody.push(rowCells);
  });

  // Switch to landscape orientation if table has many columns to prevent text clipping
  const isLandscape = columns.length > 5;
  const pageWidth = isLandscape ? 760 : 515;

  const docDefinition = {
    content: [
      { text: 'RIPOMA GLOBAL', style: 'companyHeader' },
      { text: reportName.toUpperCase(), style: 'reportTitle' },
      { text: `Generated: ${new Date().toLocaleString()} | Period: ${dateRangeStr}`, style: 'reportSub' },
      // Horizontal Rule divider line
      { 
        canvas: [{ 
          type: 'line', 
          x1: 0, 
          y1: 4, 
          x2: pageWidth, 
          y2: 4, 
          lineWidth: 1.5, 
          strokeColor: '#0D9488' 
        }] 
      },
      { text: '', margin: [0, 8] },
      {
        table: {
          headerRows: 1,
          widths: Array(columns.length).fill('*'),
          body: tableBody
        },
        layout: {
          fillColor: (rowIndex) => {
            if (rowIndex === 0) return '#0D9488'; // Header row background
            return rowIndex % 2 === 0 ? '#F8FAFC' : null; // Zebra striping
          },
          hLineColor: () => '#E2E8F0',
          vLineColor: () => '#E2E8F0',
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5
        }
      }
    ],
    pageOrientation: isLandscape ? 'landscape' : 'portrait',
    defaultStyle: {
      font: 'Helvetica'
    },
    styles: {
      companyHeader: {
        fontSize: 14,
        bold: true,
        color: '#0F172A',
        letterSpacing: 1
      },
      reportTitle: {
        fontSize: 11,
        bold: true,
        color: '#0D9488',
        margin: [0, 4, 0, 2]
      },
      reportSub: {
        fontSize: 8,
        color: '#64748B',
        margin: [0, 0, 0, 4]
      },
      tableHeader: {
        fontSize: 8,
        bold: true,
        color: '#FFFFFF',
        alignment: 'center',
        margin: [3, 5]
      },
      tableCell: {
        fontSize: 7.5,
        margin: [3, 4],
        color: '#334155'
      }
    },
    footer: (currentPage, pageCount) => {
      return {
        text: `Page ${currentPage} of ${pageCount}`,
        alignment: 'center',
        fontSize: 8,
        color: '#94A3B8',
        margin: [0, 10]
      };
    }
  };

  const buffer = await pdfmake.createPdf(docDefinition).getBuffer();

  return {
    buffer,
    mimeType: 'application/pdf'
  };
};

module.exports = buildPdf;
