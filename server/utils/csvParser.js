const Papa = require('papaparse');

/**
 * Parses a CSV text string into a JSON array of objects.
 * @param {string} csvText
 * @returns {Promise<Array<Object>>}
 */
const parseCSV = (csvText) => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

/**
 * Unparses a JSON array of objects into a CSV string.
 * @param {Array<Object>} data
 * @returns {string}
 */
const unparseCSV = (data) => {
  return Papa.unparse(data);
};

module.exports = {
  parseCSV,
  unparseCSV
};
