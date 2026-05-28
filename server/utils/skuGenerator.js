const Product = require('../models/Product');

/**
 * Generates a unique SKU for a given category name.
 * Format: [CATEGORY_CODE]-[RANDOM_6_ALPHANUM]
 * @param {string} categoryName
 * @returns {Promise<string>}
 */
const generateSKU = async (categoryName) => {
  const cleanCategory = (categoryName || 'GEN')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const catCode = cleanCategory.length >= 3 ? cleanCategory.substring(0, 4) : `${cleanCategory}GEN`.substring(0, 4);

  let sku;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    // Generate random 6 characters from alphanumeric base
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
    sku = `${catCode}-${randomChars}`;

    const existingProduct = await Product.findOne({ sku });
    if (!existingProduct) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique SKU after multiple attempts.');
  }

  return sku;
};

module.exports = { generateSKU };
