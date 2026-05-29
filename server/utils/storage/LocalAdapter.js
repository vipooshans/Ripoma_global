const fs = require('fs');
const path = require('path');
const BaseStorageAdapter = require('./BaseStorageAdapter');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

class LocalAdapter extends BaseStorageAdapter {
  constructor() {
    super();
    this.baseUrl = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.replace(':5173', ':5000')
      : 'http://localhost:5000';
  }

  _getFilePath(key) {
    // Convert storage key to local path, replacing / with OS separator
    const relativePath = key.replace(/\//g, path.sep);
    return path.join(UPLOADS_DIR, relativePath);
  }

  async upload(key, buffer, mimeType, metadata = {}) {
    const filePath = this._getFilePath(key);
    const dir = path.dirname(filePath);

    // Create directory structure
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);
    const url = `${this.baseUrl}/uploads/${key}`;
    return { key, url };
  }

  async getPresignedUrl(key, expiresInSeconds = 900) {
    // For local adapter, return a direct static URL (no expiry enforcement in dev)
    return `${this.baseUrl}/uploads/${key}`;
  }

  async delete(key) {
    const filePath = this._getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async exists(key) {
    const filePath = this._getFilePath(key);
    return fs.existsSync(filePath);
  }
}

module.exports = new LocalAdapter();
