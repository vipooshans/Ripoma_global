const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');
const BaseStorageAdapter = require('./BaseStorageAdapter');

class R2PublicAdapter extends BaseStorageAdapter {
  constructor() {
    super();

    const {
      R2_ACCOUNT_ID: accountId,
      R2_ACCESS_KEY_ID: accessKeyId,
      R2_SECRET_ACCESS_KEY: secretAccessKey,
      R2_PRODUCT_BUCKET: bucket,
      R2_PUBLIC_URL: publicUrl
    } = process.env;

    const missing = Object.entries({
      R2_ACCOUNT_ID: accountId,
      R2_ACCESS_KEY_ID: accessKeyId,
      R2_SECRET_ACCESS_KEY: secretAccessKey,
      R2_PRODUCT_BUCKET: bucket,
      R2_PUBLIC_URL: publicUrl
    })
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new Error(`[ProductImageStorage] Missing R2 configuration: ${missing.join(', ')}`);
    }

    this.bucket = bucket;
    this.publicUrl = publicUrl.replace(/\/+$/, '');
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
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: metadata
    }));

    return {
      key,
      url: `${this.publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`
    };
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
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404) return false;
      throw error;
    }
  }

  async getPresignedUrl() {
    throw new Error('Product images use public URLs and do not require presigned URLs');
  }
}

module.exports = new R2PublicAdapter();
