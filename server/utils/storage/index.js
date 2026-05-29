/**
 * Storage Factory — selects the appropriate adapter based on STORAGE_PROVIDER env var.
 * STORAGE_PROVIDER=s3    → AWS S3 Adapter
 * STORAGE_PROVIDER=local → Local filesystem adapter (default for development)
 */

const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

let storageAdapter;

if (provider === 's3') {
  storageAdapter = require('./S3Adapter');
  console.log('[Storage] Using AWS S3 adapter');
} else {
  storageAdapter = require('./LocalAdapter');
  console.log('[Storage] Using Local filesystem adapter');
}

module.exports = storageAdapter;
