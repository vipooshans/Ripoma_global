const Product = require('../models/Product');
const Category = require('../models/Category');
const { getTotalStockForProduct } = require('../utils/stockCalculator');
const { getStorefrontPromos } = require('../config/storefrontPromos');

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatProduct = (p, stock = null) => ({
  id: p._id,
  sku: p.sku,
  name: p.name,
  description: p.description,
  category: p.category
    ? { id: p.category._id, name: p.category.name }
    : null,
  sellingPrice: p.sellingPrice,
  currency: p.currency,
  images: p.images || [],
  tags: p.tags || [],
  unit: p.unit,
  weight: p.weight,
  dimensions: p.dimensions,
  countryOfOrigin: p.countryOfOrigin,
  totalStock: stock,
  isFeatured: Boolean(p.isFeatured)
});

// ─── GET /api/storefront/featured ─────────────────────────────────────────────
// Returns active products marked isFeatured; falls back to newest if none featured
exports.getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const baseQuery = { status: 'active', deleted: false };

    let products = await Product.find({ ...baseQuery, isFeatured: true })
      .populate('category', 'name')
      .sort({ updatedAt: -1 })
      .limit(limit);

    if (products.length === 0) {
      products = await Product.find(baseQuery)
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(limit);
    }

    const enriched = await Promise.all(
      products.map(async (p) => {
        const stock = await getTotalStockForProduct(p._id);
        return formatProduct(p, stock.quantityOnHand);
      })
    );

    return res.status(200).json({ products: enriched });
  } catch (error) {
    console.error('Storefront Featured Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/categories ───────────────────────────────────────────
// Returns all categories (with product counts)
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    const enriched = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({
          category: cat._id,
          status: 'active',
          deleted: false
        });
        return {
          id: cat._id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          productCount: count
        };
      })
    );

    // Only return categories that have at least one product
    const filtered = enriched.filter((c) => c.productCount > 0);

    return res.status(200).json({ categories: filtered });
  } catch (error) {
    console.error('Storefront Categories Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/products ─────────────────────────────────────────────
// Public product listing with search, filter, pagination
exports.getProducts = async (req, res) => {
  try {
    const { search, category, sort, page, limit } = req.query;

    const query = { status: 'active', deleted: false };

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { tags: { $regex: search.trim(), $options: 'i' } },
        { sku: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { sellingPrice: 1 };
    else if (sort === 'price_desc') sortOption = { sellingPrice: -1 };
    else if (sort === 'name_asc') sortOption = { name: 1 };
    else if (sort === 'name_desc') sortOption = { name: -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    const enriched = await Promise.all(
      products.map(async (p) => {
        const stock = await getTotalStockForProduct(p._id);
        return formatProduct(p, stock.quantityOnHand);
      })
    );

    return res.status(200).json({
      products: enriched,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Storefront Products Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/products/:id ─────────────────────────────────────────
exports.getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({ _id: id, status: 'active', deleted: false })
      .populate('category', 'name description');

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const stock = await getTotalStockForProduct(product._id);

    // Related products in same category
    const related = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      status: 'active',
      deleted: false
    })
      .populate('category', 'name')
      .limit(4);

    const relatedEnriched = await Promise.all(
      related.map(async (p) => {
        const s = await getTotalStockForProduct(p._id);
        return formatProduct(p, s.quantityOnHand);
      })
    );

    return res.status(200).json({
      product: formatProduct(product, stock.quantityOnHand),
      related: relatedEnriched
    });
  } catch (error) {
    console.error('Storefront Product Detail Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/search-suggestions ────────────────────────────────────
// Quick search suggestions (name only, up to 6 results)
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ suggestions: [] });
    }

    const products = await Product.find({
      status: 'active',
      deleted: false,
      name: { $regex: q.trim(), $options: 'i' }
    })
      .select('name sku images sellingPrice currency')
      .limit(6);

    const suggestions = products.map((p) => ({
      id: p._id,
      name: p.name,
      sku: p.sku,
      image: p.images?.[0] || null,
      sellingPrice: p.sellingPrice,
      currency: p.currency
    }));

    return res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Search Suggestions Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/stats ────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const productCount = await Product.countDocuments({ status: 'active', deleted: false });
    const categories = await Category.find().select('_id');
    let categoryCount = 0;

    for (const cat of categories) {
      const count = await Product.countDocuments({
        category: cat._id,
        status: 'active',
        deleted: false
      });
      if (count > 0) categoryCount += 1;
    }

    return res.status(200).json({
      stats: {
        productCount,
        categoryCount
      }
    });
  } catch (error) {
    console.error('Storefront Stats Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/promos ───────────────────────────────────────────────
exports.getPromos = async (req, res) => {
  try {
    const promos = getStorefrontPromos();
    return res.status(200).json({ promos });
  } catch (error) {
    console.error('Storefront Promos Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
