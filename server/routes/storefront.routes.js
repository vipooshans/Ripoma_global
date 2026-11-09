const express = require('express');
const router = express.Router();
const storefrontController = require('../controllers/storefront.controller');
const customerNotificationController = require('../controllers/customerNotification.controller');
const storefrontSupportController = require('../controllers/storefrontSupport.controller');
const customerAuthMiddleware = require('../middleware/customerAuthMiddleware');
const { optionalCustomerAuth } = customerAuthMiddleware;
const {
  createRateLimiter,
  createCustomerRateLimiter
} = require('../middleware/customerRateLimit');

const orderLimiter = createCustomerRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyPrefix: 'sf-order',
  message: 'Too many checkout attempts. Please try again later.'
});

const supportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyPrefix: 'sf-support',
  message: 'Too many support requests. Please try again later.'
});

const storefrontBrowseLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: 'sf-browse',
  message: 'Browsing too quickly. Please slow down and try again.'
});

// All routes are PUBLIC unless noted

router.get('/featured', storefrontBrowseLimiter, storefrontController.getFeaturedProducts);
router.get('/categories', storefrontBrowseLimiter, storefrontController.getCategories);
router.get('/categories/:id', storefrontBrowseLimiter, storefrontController.getCategoryDetail);
router.get('/stats', storefrontBrowseLimiter, storefrontController.getStats);
router.get('/promos', storefrontBrowseLimiter, storefrontController.getPromos);
router.get('/faqs', storefrontBrowseLimiter, storefrontSupportController.getFaqs);

router.post('/support', supportLimiter, optionalCustomerAuth, storefrontSupportController.createTicket);
router.get('/support/mine', customerAuthMiddleware, storefrontSupportController.listMyTickets);
router.get('/support/:id', optionalCustomerAuth, storefrontSupportController.getTicket);
router.post('/support/:id/messages', supportLimiter, optionalCustomerAuth, storefrontSupportController.addMessage);

router.post('/cart/estimate', storefrontController.estimateCart);
router.post('/coupons/validate', storefrontController.validateCoupon);
router.post('/orders', customerAuthMiddleware, orderLimiter, storefrontController.placeOrder);
router.get('/orders', customerAuthMiddleware, storefrontController.listMyOrders);
router.get('/orders/:id/invoice', customerAuthMiddleware, storefrontController.downloadOrderInvoice);
router.post('/orders/:id/cancel-request', customerAuthMiddleware, storefrontController.requestOrderCancel);
router.get('/orders/:id', customerAuthMiddleware, storefrontController.getMyOrder);

router.get('/notifications', customerAuthMiddleware, customerNotificationController.listMyNotifications);
router.get('/notifications/unread-count', customerAuthMiddleware, customerNotificationController.getUnreadCount);
router.patch('/notifications/:id/read', customerAuthMiddleware, customerNotificationController.markRead);
router.post('/notifications/read-all', customerAuthMiddleware, customerNotificationController.markAllRead);

router.get('/products/facets', storefrontBrowseLimiter, storefrontController.getProductFacets);
router.get('/products', storefrontBrowseLimiter, storefrontController.getProducts);
router.get('/products/:id/reviews', optionalCustomerAuth, storefrontController.getProductReviews);
router.post('/products/:id/reviews', customerAuthMiddleware, storefrontController.createProductReview);
router.put('/products/:id/reviews/mine', customerAuthMiddleware, storefrontController.updateMyProductReview);
router.delete('/products/:id/reviews/mine', customerAuthMiddleware, storefrontController.deleteMyProductReview);
router.get('/products/:id', storefrontBrowseLimiter, storefrontController.getProductDetail);
router.get('/search-suggestions', storefrontBrowseLimiter, storefrontController.getSearchSuggestions);

module.exports = router;
