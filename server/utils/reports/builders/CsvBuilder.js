const Papa = require('papaparse');

/**
 * Generates a CSV file buffer from tabular data.
 * 
 * @param {string[]} columns - Keys/headers to extract
 * @param {object[]} data - List of data objects
 * @returns {Promise<{buffer: Buffer, mimeType: string}>} CSV export results
 */
const buildCsv = async (columns, data) => {
  // Map data based on columns checklist config
  const rows = data.map(item => {
    const obj = {};
    columns.forEach(col => {
      let val = item[col];
      // Format object value nicely if it's a date or nested
      if (val instanceof Date) {
        val = val.toISOString().split('T')[0];
      } else if (typeof val === 'object' && val !== null) {
        val = val.name || val.companyName || JSON.stringify(val);
      }
      // Replace underscore in key names for nicer headers if needed,
      // but let's keep keys consistent with the columns config
      obj[col] = val !== undefined ? val : '';
    });
    return obj;
  });

  const csvString = Papa.unparse(rows);
  return {
    buffer: Buffer.from(csvString, 'utf-8'),
    mimeType: 'text/csv'
  };
};

module.exports = buildCsv;
