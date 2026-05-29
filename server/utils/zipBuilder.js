const archiver = require('archiver');
const { PassThrough } = require('stream');
const storage = require('./storage');

/**
 * Build a ZIP archive of multiple documents and stream it to the response.
 * @param {Array<{key: string, filename: string}>} files
 * @param {import('express').Response} res
 */
const streamZipToResponse = (files, res) => {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="ripoma-documents.zip"');

  const archive = archiver('zip', { zlib: { level: 6 } });

  archive.on('error', (err) => {
    console.error('[ZipBuilder] Archive error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Failed to create archive' });
  });

  archive.pipe(res);

  // For local storage: read files from filesystem
  const path = require('path');
  const fs = require('fs');
  const UPLOADS_DIR = path.join(__dirname, '../uploads');

  for (const file of files) {
    const filePath = path.join(UPLOADS_DIR, file.key.replace(/\//g, path.sep));
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file.filename });
    }
  }

  archive.finalize();
};

module.exports = { streamZipToResponse };
