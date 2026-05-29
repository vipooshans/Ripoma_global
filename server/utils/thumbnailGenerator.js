/**
 * Thumbnail generator.
 * Generates a small JPEG thumbnail for image files.
 * For non-image/PDF files, returns null (frontend uses FileTypeIcon instead).
 */
const sharp = require('sharp');

/**
 * @param {Buffer} buffer - Raw file buffer
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Buffer|null>} JPEG thumbnail buffer or null
 */
const generateThumbnail = async (buffer, mimeType) => {
  try {
    if (mimeType.startsWith('image/')) {
      const thumb = await sharp(buffer)
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      return thumb;
    }
    // PDF thumbnails require Ghostscript or other binary tools — skip gracefully
    return null;
  } catch (err) {
    console.warn('[ThumbnailGenerator] Failed to generate thumbnail:', err.message);
    return null;
  }
};

module.exports = { generateThumbnail };
