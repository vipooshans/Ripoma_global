const Document = require('../models/Document');

/**
 * Generate a sequential document number: DOC-YYYY-NNNNN
 */
const generateDocNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `DOC-${year}-`;

  // Find the highest existing number for this year
  const last = await Document.findOne(
    { docNumber: new RegExp(`^${prefix}`) },
    { docNumber: 1 },
    { sort: { docNumber: -1 } }
  );

  let nextNum = 1;
  if (last && last.docNumber) {
    const parts = last.docNumber.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(5, '0')}`;
};

module.exports = { generateDocNumber };
