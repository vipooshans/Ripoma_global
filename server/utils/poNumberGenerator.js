const Counter = require('../models/Counter');

const generateNumber = async (type) => {
  const currentYear = new Date().getFullYear();
  const counterKey = `${type}_${currentYear}`;

  const counter = await Counter.findOneAndUpdate(
    { name: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const prefix = type === 'importOrder' ? 'PO' : 'GRN';
  const paddedSeq = String(counter.seq).padStart(5, '0');
  return `${prefix}-${currentYear}-${paddedSeq}`;
};

module.exports = generateNumber;
