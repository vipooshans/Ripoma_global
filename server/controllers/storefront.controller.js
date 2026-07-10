const Product = require('../models/Product');
const Category = require('../models/Category');
const ProductReview = require('../models/ProductReview');
const { getTotalStockForProduct } = require('../utils/stockCalculator');
const { getStorefrontPromos } = require('../config/storefrontPromos');
const {
  buildStorefrontCategoryTree,
  getDescendantCategoryIds,
  getStorefrontCategoryDetail
} = require('../utils/categoryHelpers');

const ACTIVE_QUERY = { status: 'active', deleted: false };

const formatProduct = (p, stock = null) => ({
  id: p._id,
  sku: p.sku,
  name: p.name,
  description: p.description,
  brand: p.brand || null,
  category: p.category
    ? { id: p.category._id, name: p.category.name, description: p.category.description }
    : null,
  sellingPrice: p.sellingPrice,
  currency: p.currency,
  images: p.images || [],
  tags: p.tags || [],
  unit: p.unit,
  weight: p.weight,
  dimensions: p.dimensions,
  countryOfOrigin: p.countryOfOrigin,
  hsCode: p.hsCode || null,
  faqs: (p.faqs || [])
    .filter((f) => f.question && f.answer)
    .map((f) => ({ question: f.question, answer: f.answer })),
  totalStock: stock,
  isFeatured: Boolean(p.isFeatured)
});

const getReviewSummary = async (productId) => {
  const oid =
    typeof productId === 'string'
      ? new (require('mongoose').Types.ObjectId)(productId)
      : productId;
  const rows = await ProductReview.aggregate([
    { $match: { product: oid, status: 'approved' } },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);
  if (!rows[0]) return { average: 0, count: 0 };
  return {
    average: Math.round(rows[0].average * 10) / 10,
    count: rows[0].count
  };
};

const getSortOption = (sort) => {
  if (sort === 'price_asc') return { sellingPrice: 1 };
  if (sort === 'price_desc') return { sellingPrice: -1 };
  if (sort === 'name_asc') return { name: 1 };
  if (sort === 'name_desc') return { name: -1 };
  if (sort === 'popularity') return { isFeatured: -1, createdAt: -1 };
  return { createdAt: -1 };
};

const buildProductListQuery = async (queryParams) => {
  const { search, category, minPrice, maxPrice, brand } = queryParams;
  const query = { ...ACTIVE_QUERY };

  if (search && search.trim()) {
    query.$or = [
      { name: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } },
      { tags: { $regex: search.trim(), $options: 'i' } },
      { sku: { $regex: search.trim(), $options: 'i' } },
      { brand: { $regex: search.trim(), $options: 'i' } }
    ];
  }

  if (category) {
    const categoryIds = await getDescendantCategoryIds(category);
    query.category = { $in: categoryIds };
  }

  if (minPrice !== undefined && minPrice !== '' && !Number.isNaN(Number(minPrice))) {
    query.sellingPrice = { ...query.sellingPrice, $gte: Number(minPrice) };
  }

  if (maxPrice !== undefined && maxPrice !== '' && !Number.isNaN(Number(maxPrice))) {
    query.sellingPrice = { ...query.sellingPrice, $lte: Number(maxPrice) };
  }

  if (brand && brand.trim()) {
    query.brand = { $regex: `^${brand.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
  }

  return query;
};

const enrichProductsWithStock = async (products) => {
  return Promise.all(
    products.map(async (p) => {
      const stock = await getTotalStockForProduct(p._id);
      return formatProduct(p, stock.quantityOnHand);
    })
  );
};

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
// Returns hierarchical categories with rolled-up product counts
exports.getCategories = async (req, res) => {
  try {
    const categories = await buildStorefrontCategoryTree();
    return res.status(200).json({ categories });
  } catch (error) {
    console.error('Storefront Categories Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/categories/:id ─────────────────────────────────────────
exports.getCategoryDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await getStorefrontCategoryDetail(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    return res.status(200).json({ category });
  } catch (error) {
    console.error('Storefront Category Detail Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/products/facets ──────────────────────────────────────
exports.getProductFacets = async (req, res) => {
  try {
    const query = await buildProductListQuery(req.query);

    const brands = await Product.distinct('brand', {
      ...query,
      brand: { $exists: true, $nin: [null, ''] }
    });

    const priceAgg = await Product.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          min: { $min: '$sellingPrice' },
          max: { $max: '$sellingPrice' }
        }
      }
    ]);

    const priceRange = priceAgg[0]
      ? { min: priceAgg[0].min ?? 0, max: priceAgg[0].max ?? 0 }
      : { min: 0, max: 0 };

    return res.status(200).json({
      brands: brands.filter(Boolean).sort((a, b) => a.localeCompare(b)),
      priceRange
    });
  } catch (error) {
    console.error('Storefront Product Facets Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/products ─────────────────────────────────────────────
// Public product listing with search, filter, pagination
exports.getProducts = async (req, res) => {
  try {
    const { sort, page, limit, availability } = req.query;

    const query = await buildProductListQuery(req.query);
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const sortOption = getSortOption(sort);
    const needsStockFilter = availability === 'in_stock' || availability === 'out_of_stock';

    if (needsStockFilter) {
      const products = await Product.find(query)
        .populate('category', 'name')
        .sort(sortOption);

      let enriched = await enrichProductsWithStock(products);

      if (availability === 'in_stock') {
        enriched = enriched.filter((p) => p.totalStock > 0);
      } else {
        enriched = enriched.filter((p) => p.totalStock <= 0);
      }

      const total = enriched.length;
      const skip = (pageNum - 1) * limitNum;
      const pageProducts = enriched.slice(skip, skip + limitNum);

      return res.status(200).json({
        products: pageProducts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      });
    }

    const total = await Product.countDocuments(query);
    const skip = (pageNum - 1) * limitNum;
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    const enriched = await enrichProductsWithStock(products);

    return res.status(200).json({
      products: enriched,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
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
    const reviewSummary = await getReviewSummary(product._id);

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
      related: relatedEnriched,
      reviewSummary
    });
  } catch (error) {
    console.error('Storefront Product Detail Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/products/:id/reviews ─────────────────────────────────
exports.getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({ _id: id, status: 'active', deleted: false }).select('_id');
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const reviews = await ProductReview.find({ product: id, status: 'approved' })
      .populate('customer', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    const summary = await getReviewSummary(product._id);

    return res.status(200).json({
      reviews: reviews.map((r) => ({
        id: r._id,
        rating: r.rating,
        title: r.title || null,
        comment: r.comment,
        createdAt: r.createdAt,
        customerName: r.customer
          ? `${r.customer.firstName}${r.customer.lastName ? ` ${r.customer.lastName.charAt(0)}.` : ''}`
          : 'Customer'
      })),
      summary
    });
  } catch (error) {
    console.error('Storefront Product Reviews Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── POST /api/storefront/products/:id/reviews ────────────────────────────────
exports.createProductReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment } = req.body;
    const customerId = req.customerUser._id;

    const product = await Product.findOne({ _id: id, status: 'active', deleted: false }).select('_id');
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const ratingNum = parseInt(rating, 10);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }
    if (!comment || !String(comment).trim()) {
      return res.status(400).json({ message: 'Review comment is required.' });
    }

    const existing = await ProductReview.findOne({ product: id, customer: customerId });
    if (existing) {
      return res.status(409).json({ message: 'You have already reviewed this product.' });
    }

    const review = await ProductReview.create({
      product: id,
      customer: customerId,
      rating: ratingNum,
      title: title ? String(title).trim() : undefined,
      comment: String(comment).trim(),
      status: 'approved'
    });

    await review.populate('customer', 'firstName lastName');

    return res.status(201).json({
      message: 'Review submitted successfully.',
      review: {
        id: review._id,
        rating: review.rating,
        title: review.title || null,
        comment: review.comment,
        createdAt: review.createdAt,
        customerName: `${review.customer.firstName}${review.customer.lastName ? ` ${review.customer.lastName.charAt(0)}.` : ''}`
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You have already reviewed this product.' });
    }
    console.error('Create Product Review Error:', error);
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
