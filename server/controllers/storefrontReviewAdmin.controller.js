const ProductReview = require('../models/ProductReview');
const { notifyCustomer } = require('../utils/customerNotifyService');

const formatAdminReview = (r) => ({
  id: r._id,
  rating: r.rating,
  title: r.title || null,
  comment: r.comment,
  status: r.status,
  verifiedPurchase: Boolean(r.verifiedPurchase),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  product: r.product
    ? {
        id: r.product._id || r.product,
        name: r.product.name,
        sku: r.product.sku
      }
    : null,
  customer: r.customer
    ? {
        id: r.customer._id || r.customer,
        firstName: r.customer.firstName,
        lastName: r.customer.lastName,
        email: r.customer.email
      }
    : null
});

exports.listReviews = async (req, res) => {
  try {
    const { status = '', search = '', page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    let reviewsQuery = ProductReview.find(query)
      .populate('product', 'name sku')
      .populate('customer', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    let reviews = await reviewsQuery;
    let total = await ProductReview.countDocuments(query);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const all = await ProductReview.find(query)
        .populate('product', 'name sku')
        .populate('customer', 'firstName lastName email')
        .sort({ createdAt: -1 });
      const filtered = all.filter((r) => {
        const hay = [
          r.comment,
          r.title,
          r.product?.name,
          r.product?.sku,
          r.customer?.email,
          r.customer?.firstName,
          r.customer?.lastName
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
      total = filtered.length;
      reviews = filtered.slice(skip, skip + limitNum);
    }

    return res.status(200).json({
      reviews: reviews.map(formatAdminReview),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('Admin List Reviews Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const setReviewStatus = async (req, res, nextStatus) => {
  try {
    const review = await ProductReview.findById(req.params.id)
      .populate('product', 'name sku')
      .populate('customer', 'firstName lastName email phone notificationPrefs status');
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    review.status = nextStatus;
    await review.save();

    if (review.customer) {
      const approved = nextStatus === 'approved';
      await notifyCustomer({
        customer: review.customer,
        type: 'review_update',
        title: approved
          ? 'Your product review was approved'
          : 'Your product review was not approved',
        body: approved
          ? `Your review for "${review.product?.name || 'a product'}" is now live.`
          : `Your review for "${review.product?.name || 'a product'}" was rejected by our team.`,
        severity: approved ? 'success' : 'warning',
        actionUrl: review.product?._id
          ? `/customer/products/${review.product._id}`
          : '/customer/products',
        actionLabel: 'View product',
        entityType: 'ProductReview',
        entityId: review._id,
        entityRef: review.product?.sku || undefined
      });
    }

    return res.status(200).json({
      message: `Review ${nextStatus}.`,
      review: formatAdminReview(review)
    });
  } catch (error) {
    console.error('Admin Set Review Status Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.approveReview = (req, res) => setReviewStatus(req, res, 'approved');
exports.rejectReview = (req, res) => setReviewStatus(req, res, 'rejected');
