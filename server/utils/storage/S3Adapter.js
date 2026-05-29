const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const BaseStorageAdapter = require('./BaseStorageAdapter');

class S3Adapter extends BaseStorageAdapter {
  constructor() {
    super();
    this.bucket = process.env.AWS_S3_BUCKET || 'ripoma-documents';
    this.client = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }

  async upload(key, buffer, mimeType, metadata = {}) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: metadata,
      // Private bucket — no public ACL
    });
    await this.client.send(command);
    // Return key only — URL is generated on-demand via presigned URL
    return { key, url: null };
  }

  async getPresignedUrl(key, expiresInSeconds = 900) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    return url;
  }

  async delete(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
    await this.client.send(command);
  }

  async exists(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      if (err.$metadata?.httpStatusCode === 404) return false;
      throw err;
    }
  }
}

module.exports = new S3Adapter();
