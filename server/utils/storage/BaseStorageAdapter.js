/**
 * Base Storage Adapter interface.
 * All storage implementations must extend this class.
 */
class BaseStorageAdapter {
  /**
   * Upload a file buffer to storage.
   * @param {string} key - Storage object key/path
   * @param {Buffer} buffer - File data buffer
   * @param {string} mimeType - MIME type of the file
   * @param {object} metadata - Optional metadata key-value pairs
   * @returns {Promise<{key: string, url: string}>}
   */
  async upload(key, buffer, mimeType, metadata = {}) {
    throw new Error('upload() must be implemented by storage adapter');
  }

  /**
   * Generate a presigned URL for secure temporary access.
   * @param {string} key - Storage object key/path
   * @param {number} expiresInSeconds - URL expiry time
   * @returns {Promise<string>} Presigned URL
   */
  async getPresignedUrl(key, expiresInSeconds = 900) {
    throw new Error('getPresignedUrl() must be implemented by storage adapter');
  }

  /**
   * Delete a file from storage.
   * @param {string} key - Storage object key/path
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error('delete() must be implemented by storage adapter');
  }

  /**
   * Check if a file exists in storage.
   * @param {string} key - Storage object key/path
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    throw new Error('exists() must be implemented by storage adapter');
  }
}

module.exports = BaseStorageAdapter;
