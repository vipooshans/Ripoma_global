const crypto = require('crypto');

const hashToken = (raw) =>
  crypto.createHash('sha256').update(String(raw || '')).digest('hex');

const createRawToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

module.exports = { hashToken, createRawToken };
