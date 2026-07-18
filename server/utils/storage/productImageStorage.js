const path = require('path');
const { randomUUID } = require('crypto');

const provider = (process.env.PRODUCT_IMAGE_STORAGE_PROVIDER || 'local').toLowerCase();

if (!['local', 'r2'].includes(provider)) {
  throw new Error(`[ProductImageStorage] Unsupported provider: ${provider}`);
}

const adapter = provider === 'r2'
  ? require('./R2PublicAdapter')
  : require('./LocalAdapter');

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const getManagedUrlPrefix = () => {
  if (provider === 'r2') {
    return `${adapter.publicUrl}/`;
  }
  return `${adapter.baseUrl}/uploads/`;
};

const getKeyFromManagedUrl = (url) => {
  if (typeof url !== 'string') return null;

  const prefix = getManagedUrlPrefix();
  if (!url.startsWith(prefix)) return null;

  try {
    const key = decodeURIComponent(url.slice(prefix.length));
    const normalized = key.replace(/\\/g, '/');
    if (!normalized.startsWith('products/') || normalized.includes('../')) return null;
    return normalized;
  } catch (_) {
    return null;
  }
};

const uploadProductImage = async (file, userId) => {
  const extension = MIME_EXTENSIONS[file.mimetype];
  if (!extension) {
    throw new Error(`Unsupported product image type: ${file.mimetype}`);
  }

  const now = new Date();
  const key = path.posix.join(
    'products',
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    `${randomUUID()}.${extension}`
  );

  return adapter.upload(key, file.buffer, file.mimetype, {
    originalFilename: encodeURIComponent(file.originalname).slice(0, 900),
    ...(userId ? { uploadedBy: String(userId) } : {})
  });
};

const deleteManagedProductImage = async (url) => {
  const key = getKeyFromManagedUrl(url);
  if (!key) return false;

  await adapter.delete(key);
  return true;
};

module.exports = {
  provider,
  uploadProductImage,
  deleteManagedProductImage,
  getKeyFromManagedUrl
};
