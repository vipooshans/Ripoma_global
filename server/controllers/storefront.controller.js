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
      currency: p.currency,
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

const couponLabel = (coupon) => {
  if (coupon.type === 'percent') return `${coupon.value}% off`;
  if (coupon.type === 'fixed') return `$${coupon.value} off`;
  if (coupon.type === 'free_shipping') return 'Free shipping';
  return coupon.code;
};

const findValidCoupon = async (rawCode, subtotal) => {
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
      messages.push(`Add $${remaining.toFixed(2)} more for free shipping`);
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
      const result = await findValidCoupon(couponCode, subtotal);
      if (result.error) {
        return res.status(400).json({ message: result.error });
      }
      coupon = result.coupon;
    }

    const estimate = computeCartEstimate(estimateItems, coupon);
    const { paymentStatus, paymentReference } = resolvePaymentFields(paymentMethod);
    const orderNumber = await generateExportNumber('storefrontOrder');

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
