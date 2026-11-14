const Product = require('../models/Product');
const Category = require('../models/Category');
const ProductReview = require('../models/ProductReview');
const Coupon = require('../models/Coupon');
const StorefrontOrder = require('../models/StorefrontOrder');
const CustomerAccount = require('../models/CustomerAccount');
const User = require('../models/User');
const { getTotalStockForProduct } = require('../utils/stockCalculator');
const { getStorefrontPromos } = require('../config/storefrontPromos');
const { getStorefrontCartRules, round2 } = require('../config/storefrontCartRules');
const generateExportNumber = require('../utils/soNumberGenerator');
const generateStorefrontOrderPdf = require('../utils/storefrontOrderPdfGenerator');
const { sendNotification } = require('../utils/notifyService');
const { notifyCustomer } = require('../utils/customerNotifyService');
const { formatStorefrontOrder } = require('../utils/storefrontOrderFormat');
const {
  buildStorefrontCategoryTree,
  getDescendantCategoryIds,
  getStorefrontCategoryDetail
} = require('../utils/categoryHelpers');

const ACTIVE_QUERY = { status: 'active', deleted: false };

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const flattenStorefrontCategories = (nodes, acc = []) => {
  for (const node of nodes || []) {
    acc.push(node);
    if (node.subcategories?.length) flattenStorefrontCategories(node.subcategories, acc);
  }
  return acc;
};

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
  currency: 'LKR',
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

const getReviewSummariesMap = async (productIds) => {
  const ids = productIds
    .map((id) => {
      try {
        return typeof id === 'string' ? new (require('mongoose').Types.ObjectId)(id) : id;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (!ids.length) return new Map();

  const rows = await ProductReview.aggregate([
    { $match: { product: { $in: ids }, status: 'approved' } },
    {
      $group: {
        _id: '$product',
        average: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  const map = new Map();
  rows.forEach((r) => {
    map.set(String(r._id), {
      average: Math.round(r.average * 10) / 10,
      count: r.count
    });
  });
  return map;
};

const getRatingDistribution = async (productId) => {
  const oid =
    typeof productId === 'string'
      ? new (require('mongoose').Types.ObjectId)(productId)
      : productId;
  const rows = await ProductReview.aggregate([
    { $match: { product: oid, status: 'approved' } },
    { $group: { _id: '$rating', count: { $sum: 1 } } }
  ]);
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rows.forEach((r) => {
    if (dist[r._id] !== undefined) dist[r._id] = r.count;
  });
  return dist;
};

const hasVerifiedPurchase = async (customerId, productId) => {
  const found = await StorefrontOrder.exists({
    customerAccount: customerId,
    orderStatus: 'delivered',
    'items.product': productId
  });
  return Boolean(found);
};

const formatPublicReview = (r) => ({
  id: r._id,
  rating: r.rating,
  title: r.title || null,
  comment: r.comment,
  verifiedPurchase: Boolean(r.verifiedPurchase),
  createdAt: r.createdAt,
  customerName: r.customer
    ? `${r.customer.firstName}${r.customer.lastName ? ` ${r.customer.lastName.charAt(0)}.` : ''}`
    : 'Customer'
});

const formatOwnReview = (r) => ({
  id: r._id,
  rating: r.rating,
  title: r.title || null,
  comment: r.comment,
  status: r.status,
  verifiedPurchase: Boolean(r.verifiedPurchase),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt
});

const validateReviewPayload = ({ rating, title, comment }) => {
  const ratingNum = parseInt(rating, 10);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    return { error: 'Rating must be between 1 and 5.' };
  }
  const commentText = String(comment || '').trim();
  if (commentText.length < 20) {
    return { error: 'Review comment must be at least 20 characters.' };
  }
  if (commentText.length > 2000) {
    return { error: 'Review comment must be at most 2000 characters.' };
  }
  const titleText = title ? String(title).trim() : '';
  if (titleText.length > 120) {
    return { error: 'Review title must be at most 120 characters.' };
  }
  return {
    ratingNum,
    titleText: titleText || undefined,
    commentText
  };
};

const getSortOption = (sort) => {
  if (sort === 'price_asc') return { sellingPrice: 1 };
  if (sort === 'price_desc') return { sellingPrice: -1 };
  if (sort === 'name_asc') return { name: 1 };
  if (sort === 'name_desc') return { name: -1 };
  if (sort === 'popularity') return { isFeatured: -1, createdAt: -1 };
  if (sort === 'rating') return null; // handled separately
  return { createdAt: -1 };
};

const buildProductListQuery = async (queryParams) => {
  const { search, category, minPrice, maxPrice, brand } = queryParams;
  const query = { ...ACTIVE_QUERY };

  if (search && search.trim()) {
    const tokens = search.trim().split(/\s+/).filter(Boolean);
    if (tokens.length) {
      query.$and = tokens.map((token) => {
        const rx = { $regex: escapeRegex(token), $options: 'i' };
        return {
          $or: [
            { name: rx },
            { description: rx },
            { tags: rx },
            { sku: rx },
            { brand: rx }
          ]
        };
      });
    }
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
  const enriched = await Promise.all(
    products.map(async (p) => {
      const stock = await getTotalStockForProduct(p._id);
      return formatProduct(p, stock.quantityOnHand);
    })
  );
  const summaryMap = await getReviewSummariesMap(enriched.map((p) => p.id));
  return enriched.map((p) => ({
    ...p,
    reviewSummary: summaryMap.get(String(p.id)) || { average: 0, count: 0 }
  }));
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
    const sortByRating = sort === 'rating';

    if (needsStockFilter || sortByRating) {
      const products = await Product.find(query)
        .populate('category', 'name')
        .sort(sortOption || { createdAt: -1 });

      let enriched = await enrichProductsWithStock(products);

      if (availability === 'in_stock') {
        enriched = enriched.filter((p) => p.totalStock > 0);
      } else if (availability === 'out_of_stock') {
        enriched = enriched.filter((p) => p.totalStock <= 0);
      }

      if (sortByRating) {
        enriched.sort((a, b) => {
          const diff = (b.reviewSummary?.average || 0) - (a.reviewSummary?.average || 0);
          if (diff !== 0) return diff;
          return (b.reviewSummary?.count || 0) - (a.reviewSummary?.count || 0);
        });
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
    const relatedWithReviews = await (async () => {
      const map = await getReviewSummariesMap(relatedEnriched.map((p) => p.id));
      return relatedEnriched.map((p) => ({
        ...p,
        reviewSummary: map.get(String(p.id)) || { average: 0, count: 0 }
      }));
    })();

    return res.status(200).json({
      product: {
        ...formatProduct(product, stock.quantityOnHand),
        reviewSummary
      },
      related: relatedWithReviews,
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
    const distribution = await getRatingDistribution(product._id);

    let myReview = null;
    if (req.customerUser) {
      const own = await ProductReview.findOne({
        product: id,
        customer: req.customerUser._id
      });
      if (own) myReview = formatOwnReview(own);
    }

    return res.status(200).json({
      reviews: reviews.map(formatPublicReview),
      summary,
      distribution,
      myReview
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
    const customerId = req.customerUser._id;
    const validated = validateReviewPayload(req.body || {});
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const product = await Product.findOne({ _id: id, status: 'active', deleted: false }).select(
      '_id name'
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const existing = await ProductReview.findOne({ product: id, customer: customerId });
    if (existing) {
      return res.status(409).json({ message: 'You have already reviewed this product.' });
    }

    const verifiedPurchase = await hasVerifiedPurchase(customerId, id);

    const review = await ProductReview.create({
      product: id,
      customer: customerId,
      rating: validated.ratingNum,
      title: validated.titleText,
      comment: validated.commentText,
      status: 'pending',
      verifiedPurchase
    });

    return res.status(201).json({
      message: 'Thanks — your review will appear after approval.',
      review: formatOwnReview(review)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You have already reviewed this product.' });
    }
    console.error('Create Product Review Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── PUT /api/storefront/products/:id/reviews/mine ────────────────────────────
exports.updateMyProductReview = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customerUser._id;
    const validated = validateReviewPayload(req.body || {});
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const review = await ProductReview.findOne({ product: id, customer: customerId });
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }
    if (review.status === 'rejected') {
      return res.status(400).json({ message: 'Rejected reviews cannot be edited. Submit a new one after staff resets, or contact support.' });
    }

    review.rating = validated.ratingNum;
    review.title = validated.titleText;
    review.comment = validated.commentText;
    review.status = 'pending';
    review.verifiedPurchase = await hasVerifiedPurchase(customerId, id);
    await review.save();

    return res.status(200).json({
      message: 'Review updated. It will appear after approval.',
      review: formatOwnReview(review)
    });
  } catch (error) {
    console.error('Update Product Review Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── DELETE /api/storefront/products/:id/reviews/mine ─────────────────────────
exports.deleteMyProductReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await ProductReview.findOneAndDelete({
      product: id,
      customer: req.customerUser._id
    });
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }
    return res.status(200).json({ message: 'Review deleted.' });
  } catch (error) {
    console.error('Delete Product Review Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/search-suggestions ────────────────────────────────────
// Product (name/sku/brand) + category name suggestions
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    const trimmed = (q || '').trim();
    if (trimmed.length < 2) {
      return res.status(200).json({ suggestions: [], categories: [] });
    }

    const rx = { $regex: escapeRegex(trimmed), $options: 'i' };
    const prefixRx = new RegExp(`^${escapeRegex(trimmed)}`, 'i');

    const products = await Product.find({
      ...ACTIVE_QUERY,
      $or: [{ name: rx }, { sku: rx }, { brand: rx }]
    })
      .select('name sku images sellingPrice currency brand')
      .limit(24)
      .lean();

    const sorted = [...products].sort((a, b) => {
      const aPrefix = prefixRx.test(a.name) ? 0 : 1;
      const bPrefix = prefixRx.test(b.name) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return String(a.name).localeCompare(String(b.name));
    }).slice(0, 6);

    const suggestions = sorted.map((p) => ({
      type: 'product',
      id: p._id,
      name: p.name,
      sku: p.sku,
      image: p.images?.[0] || null,
      sellingPrice: p.sellingPrice,
      currency: 'LKR',
      brand: p.brand || null
    }));

    const tree = await buildStorefrontCategoryTree();
    const flat = flattenStorefrontCategories(tree);
    const qLower = trimmed.toLowerCase();
    const categories = flat
      .filter((c) => c.name && String(c.name).toLowerCase().includes(qLower) && c.productCount > 0)
      .sort((a, b) => {
        const aPrefix = String(a.name).toLowerCase().startsWith(qLower) ? 0 : 1;
        const bPrefix = String(b.name).toLowerCase().startsWith(qLower) ? 0 : 1;
        if (aPrefix !== bPrefix) return aPrefix - bPrefix;
        return String(a.name).localeCompare(String(b.name));
      })
      .slice(0, 4)
      .map((c) => ({
        type: 'category',
        id: c.id,
        name: c.name,
        productCount: c.productCount
      }));

    return res.status(200).json({ suggestions, categories });
  } catch (error) {
    console.error('Search Suggestions Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/stats ────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const activeFilter = { status: 'active', deleted: false };
    // 3 queries total instead of 1 + one per category
    const [productCount, activeCategoryIds] = await Promise.all([
      Product.countDocuments(activeFilter),
      Product.distinct('category', activeFilter)
    ]);
    const categoryCount = activeCategoryIds.length
      ? await Category.countDocuments({ _id: { $in: activeCategoryIds } })
      : 0;

    // Public, cosmetic numbers — let browsers / edge cache them briefly
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
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

const couponLabel = (coupon) => {
  if (coupon.type === 'percent') return `${coupon.value}% off`;
  if (coupon.type === 'fixed') return `$${coupon.value} off`;
  if (coupon.type === 'free_shipping') return 'Free shipping';
  return coupon.code;
};

const findValidCoupon = async (rawCode, subtotal, customerId = null) => {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { error: 'Coupon code is required' };

  const coupon = await Coupon.findOne({ code });
  if (!coupon || !coupon.active) {
    return { error: 'Invalid or inactive coupon code' };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { error: 'This coupon has expired' };
  }
  if (subtotal < (coupon.minSubtotal || 0)) {
    return {
      error: `Minimum subtotal of $${coupon.minSubtotal} required for this coupon`
    };
  }
  if (coupon.maxUses != null && coupon.redemptionCount >= coupon.maxUses) {
    return { error: 'This coupon has reached its usage limit' };
  }
  if (customerId && coupon.maxUsesPerCustomer != null) {
    const used = await StorefrontOrder.countDocuments({
      customerAccount: customerId,
      couponCode: coupon.code,
      orderStatus: { $nin: ['cancelled'] }
    });
    if (used >= coupon.maxUsesPerCustomer) {
      return { error: 'You have already used this coupon the maximum number of times' };
    }
  }
  return { coupon };
};

const computeCartEstimate = (items, coupon) => {
  const rules = getStorefrontCartRules();
  const subtotal = round2(
    (items || []).reduce(
      (sum, item) => sum + (Number(item.sellingPrice) || 0) * (Number(item.qty) || 0),
      0
    )
  );

  let discount = 0;
  let freeShippingCoupon = false;
  let couponSummary = null;

  if (coupon) {
    if (coupon.type === 'percent') {
      discount = round2(subtotal * (Number(coupon.value) || 0) / 100);
    } else if (coupon.type === 'fixed') {
      discount = round2(Math.min(subtotal, Number(coupon.value) || 0));
    } else if (coupon.type === 'free_shipping') {
      freeShippingCoupon = true;
    }
    couponSummary = {
      code: coupon.code,
      type: coupon.type,
      label: couponLabel(coupon)
    };
  }

  discount = Math.min(discount, subtotal);
  const merchandise = round2(subtotal - discount);
  const shipping =
    freeShippingCoupon || merchandise >= rules.freeShippingMin
      ? 0
      : round2(rules.flatShipping);
  const tax = round2(merchandise * rules.taxRate);
  const total = round2(merchandise + shipping + tax);

  const messages = [];
  if (shipping > 0) {
    const remaining = round2(rules.freeShippingMin - merchandise);
    if (remaining > 0) {
      messages.push(`Add LKR ${remaining.toFixed(2)} more for free shipping`);
    }
  } else if (freeShippingCoupon) {
    messages.push('Free shipping applied via coupon');
  } else if (merchandise >= rules.freeShippingMin) {
    messages.push('You qualify for free shipping');
  }

  return {
    subtotal,
    discount,
    shipping,
    tax,
    total,
    currency: rules.currency,
    freeShippingMin: rules.freeShippingMin,
    coupon: couponSummary,
    messages
  };
};

// ─── POST /api/storefront/coupons/validate ────────────────────────────────────
exports.validateCoupon = async (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body || {};
    const result = await findValidCoupon(code, Number(subtotal) || 0);
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }
    const { coupon } = result;
    return res.status(200).json({
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        label: couponLabel(coupon),
        minSubtotal: coupon.minSubtotal || 0
      }
    });
  } catch (error) {
    console.error('Validate Coupon Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── POST /api/storefront/cart/estimate ───────────────────────────────────────
exports.estimateCart = async (req, res) => {
  try {
    const { items = [], couponCode } = req.body || {};
    const subtotal = round2(
      items.reduce(
        (sum, item) => sum + (Number(item.sellingPrice) || 0) * (Number(item.qty) || 0),
        0
      )
    );

    let coupon = null;
    if (couponCode && String(couponCode).trim()) {
      const result = await findValidCoupon(couponCode, subtotal);
      if (result.error) {
        return res.status(400).json({ message: result.error });
      }
      coupon = result.coupon;
    }

    const estimate = computeCartEstimate(items, coupon);
    return res.status(200).json(estimate);
  } catch (error) {
    console.error('Cart Estimate Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const resolvePaymentFields = (paymentMethod) => {
  if (paymentMethod === 'card_mock') {
    return {
      paymentStatus: 'paid',
      paymentReference: `MOCK-${Date.now().toString(36).toUpperCase()}`
    };
  }
  if (paymentMethod === 'bank_transfer') {
    return { paymentStatus: 'awaiting_transfer', paymentReference: null };
  }
  return { paymentStatus: 'pending', paymentReference: null };
};

// ─── POST /api/storefront/orders ──────────────────────────────────────────────
exports.placeOrder = async (req, res) => {
  try {
    const customer = req.customerUser;
    const {
      items = [],
      couponCode,
      shippingAddress,
      paymentMethod,
      customerNote,
      saveAddressToProfile
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty. Add products before checkout.' });
    }

    const allowedMethods = ['cod', 'bank_transfer', 'card_mock'];
    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method.' });
    }

    const street = shippingAddress?.street?.trim();
    const city = shippingAddress?.city?.trim();
    const country = shippingAddress?.country?.trim();
    if (!street || !city || !country) {
      return res.status(400).json({
        message: 'Shipping address requires street, city, and country.'
      });
    }

    const productIds = items.map((i) => i.id).filter(Boolean);
    if (productIds.length !== items.length) {
      return res.status(400).json({ message: 'Each cart item must include a product id.' });
    }

    const products = await Product.find({
      _id: { $in: productIds },
      ...ACTIVE_QUERY
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        message: 'One or more products are unavailable. Please refresh your cart.'
      });
    }

    const productMap = new Map(products.map((p) => [String(p._id), p]));
    const orderItems = [];
    const estimateItems = [];

    for (const line of items) {
      const product = productMap.get(String(line.id));
      if (!product) {
        return res.status(400).json({ message: 'One or more products are unavailable.' });
      }
      const qty = Math.max(1, parseInt(line.qty, 10) || 1);
      const stock = await getTotalStockForProduct(product._id);
      if (!stock || stock.quantityOnHand <= 0) {
        return res.status(400).json({
          message: `"${product.name}" is out of stock and cannot be ordered.`
        });
      }

      const unitPrice = Number(product.sellingPrice) || 0;
      const lineTotal = round2(unitPrice * qty);
      orderItems.push({
        product: product._id,
        sku: product.sku,
        name: product.name,
        qty,
        unitPrice,
        lineTotal,
        image: product.images?.[0] || null
      });
      estimateItems.push({ id: product._id, qty, sellingPrice: unitPrice });
    }

    const subtotal = round2(
      estimateItems.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0)
    );

    let coupon = null;
    if (couponCode && String(couponCode).trim()) {
      const result = await findValidCoupon(couponCode, subtotal, customer._id);
      if (result.error) {
        return res.status(400).json({ message: result.error });
      }
      coupon = result.coupon;
    }

    // Fraud: order velocity (max 8 orders / hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await StorefrontOrder.countDocuments({
      customerAccount: customer._id,
      placedAt: { $gte: oneHourAgo }
    });
    if (recentCount >= 8) {
      return res.status(429).json({
        message: 'Too many orders placed recently. Please wait before ordering again.'
      });
    }

    const estimate = computeCartEstimate(estimateItems, coupon);
    const { paymentStatus, paymentReference } = resolvePaymentFields(paymentMethod);
    const orderNumber = await generateExportNumber('storefrontOrder');

    const riskFlags = [];
    if (recentCount >= 4) riskFlags.push('high_velocity');
    if (estimate.grandTotal >= 5000) riskFlags.push('high_value');
    if (paymentMethod === 'card_mock') riskFlags.push('demo_card');
    if (!customer.emailVerified) riskFlags.push('unverified_email');

    const order = await StorefrontOrder.create({
      orderNumber,
      customerAccount: customer._id,
      items: orderItems,
      subtotal: estimate.subtotal,
      discount: estimate.discount,
      shipping: estimate.shipping,
      tax: estimate.tax,
      grandTotal: estimate.total,
      currency: estimate.currency,
      couponCode: estimate.coupon?.code || null,
      couponSnapshot: estimate.coupon || null,
      shippingAddress: {
        street,
        city,
        state: shippingAddress?.state?.trim() || '',
        postalCode: shippingAddress?.postalCode?.trim() || '',
        country
      },
      contact: {
        email: customer.email,
        phone: customer.phone || '',
        firstName: customer.firstName,
        lastName: customer.lastName
      },
      paymentMethod,
      paymentStatus,
      orderStatus: 'placed',
      customerNote: (customerNote || '').trim().slice(0, 1000),
      paymentReference,
      riskFlags,
      placedAt: new Date(),
      statusHistory: [
        {
          status: 'placed',
          note: 'Order placed by customer',
          at: new Date(),
          byRole: 'customer'
        }
      ]
    });

    if (coupon) {
      await Coupon.findByIdAndUpdate(coupon._id, { $inc: { redemptionCount: 1 } });
    }

    if (saveAddressToProfile) {
      await CustomerAccount.findByIdAndUpdate(customer._id, {
        shippingAddress: {
          street,
          city,
          state: shippingAddress?.state?.trim() || '',
          postalCode: shippingAddress?.postalCode?.trim() || '',
          country
        }
      });
    }

    await notifyCustomer({
      customer,
      type: 'order_placed',
      title: `Order ${order.orderNumber} placed`,
      body: `Thanks for your order. Total LKR ${Number(order.grandTotal).toFixed(2)}. We'll update you as it progresses.`,
      severity: 'success',
      actionUrl: `/customer/orders/${order._id}`,
      actionLabel: 'View order',
      entityType: 'StorefrontOrder',
      entityId: order._id,
      entityRef: order.orderNumber
    });

    return res.status(201).json({ order: formatStorefrontOrder(order) });
  } catch (error) {
    console.error('Place Storefront Order Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/orders ───────────────────────────────────────────────
exports.listMyOrders = async (req, res) => {
  try {
    const orders = await StorefrontOrder.find({ customerAccount: req.customerUser._id })
      .sort({ placedAt: -1 })
      .limit(50);

    return res.status(200).json({
      orders: orders.map(formatStorefrontOrder)
    });
  } catch (error) {
    console.error('List Storefront Orders Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/orders/:id ───────────────────────────────────────────
exports.getMyOrder = async (req, res) => {
  try {
    const order = await StorefrontOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    if (String(order.customerAccount) !== String(req.customerUser._id)) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    return res.status(200).json({ order: formatStorefrontOrder(order) });
  } catch (error) {
    console.error('Get Storefront Order Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/storefront/orders/:id/invoice.pdf ───────────────────────────────
exports.downloadOrderInvoice = async (req, res) => {
  try {
    const order = await StorefrontOrder.findById(req.params.id);
    if (!order || String(order.customerAccount) !== String(req.customerUser._id)) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    const pdf = generateStorefrontOrderPdf(order);
    const filename = `invoice-${order.orderNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdf);
  } catch (error) {
    console.error('Storefront Invoice PDF Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── POST /api/storefront/orders/:id/cancel-request ───────────────────────────
exports.requestOrderCancel = async (req, res) => {
  try {
    const order = await StorefrontOrder.findById(req.params.id);
    if (!order || String(order.customerAccount) !== String(req.customerUser._id)) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (!['placed', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({
        message: `Cannot request cancellation while order is ${order.orderStatus}.`
      });
    }

    const reason = String(req.body?.reason || '').trim().slice(0, 500);
    order.previousStatusBeforeCancelRequest = order.orderStatus;
    order.orderStatus = 'cancellation_requested';
    order.cancelReason = reason;
    order.cancellationRequestedAt = new Date();
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'cancellation_requested',
      note: reason || 'Customer requested cancellation',
      at: new Date(),
      byRole: 'customer'
    });
    await order.save();

    try {
      const staff = await User.find({
        role: { $in: ['admin', 'manager'] },
        deleted: { $ne: true },
        status: 'active'
      }).select('_id');

      for (const user of staff) {
        await sendNotification({
          recipientId: user._id,
          type: 'storefront_cancel_requested',
          severity: 'warning',
          title: `Cancel request: ${order.orderNumber}`,
          body: reason || 'Customer requested cancellation of a storefront order.',
          actionUrl: '/inventory/storefront-orders',
          actionLabel: 'Review orders',
          entityType: 'StorefrontOrder',
          entityId: order._id,
          entityRef: order.orderNumber
        });
      }
    } catch (notifyErr) {
      console.error('Cancel request notify error:', notifyErr);
    }

    return res.status(200).json({ order: formatStorefrontOrder(order) });
  } catch (error) {
    console.error('Request Order Cancel Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
