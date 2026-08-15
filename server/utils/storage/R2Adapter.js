const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const BaseStorageAdapter = require('./BaseStorageAdapter');

/**
 * Private Cloudflare R2 adapter for documents and report exports.
 * Uses R2's S3-compatible API; objects stay private and are served
 * through short-lived presigned URLs, mirroring S3Adapter behavior.
 */
class R2Adapter extends BaseStorageAdapter {
  constructor() {
    super();

    const {
      R2_ACCOUNT_ID: accountId,
      R2_ACCESS_KEY_ID: accessKeyId,
      R2_SECRET_ACCESS_KEY: secretAccessKey
    } = process.env;

    const missing = Object.entries({
      R2_ACCOUNT_ID: accountId,
      R2_ACCESS_KEY_ID: accessKeyId,
      R2_SECRET_ACCESS_KEY: secretAccessKey
    })
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new Error(`[Storage] Missing R2 configuration: ${missing.join(', ')}`);
    }

    this.bucket = process.env.R2_DOCUMENTS_BUCKET || 'ripoma-documents';
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }

  async upload(key, buffer, mimeType, metadata = {}) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: metadata
    }));
    // Private bucket — URL is generated on demand via presigned URL
    return { key, url: null };
  }

  async getPresignedUrl(key, expiresInSeconds = 900) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async delete(key) {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    }));
  }

  async exists(key) {
    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));
      return true;
    } catch (err) {
      if (err.$metadata?.httpStatusCode === 404) return false;
      throw err;
    }
  }
}

module.exports = new R2Adapter();
