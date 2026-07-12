const express = require('express');
const router = express.Router();
const storefrontController = require('../controllers/storefront.controller');
const customerNotificationController = require('../controllers/customerNotification.controller');
const storefrontSupportController = require('../controllers/storefrontSupport.controller');
const customerAuthMiddleware = require('../middleware/customerAuthMiddleware');
const { optionalCustomerAuth } = customerAuthMiddleware;

// All routes are PUBLIC unless noted

router.get('/featured', storefrontController.getFeaturedProducts);
router.get('/categories', storefrontController.getCategories);
router.get('/categories/:id', storefrontController.getCategoryDetail);
router.get('/stats', storefrontController.getStats);
router.get('/promos', storefrontController.getPromos);
router.get('/faqs', storefrontSupportController.getFaqs);

router.post('/support', optionalCustomerAuth, storefrontSupportController.createTicket);
router.get('/support/mine', customerAuthMiddleware, storefrontSupportController.listMyTickets);
router.get('/support/:id', optionalCustomerAuth, storefrontSupportController.getTicket);
router.post('/support/:id/messages', optionalCustomerAuth, storefrontSupportController.addMessage);

router.post('/cart/estimate', storefrontController.estimateCart);
router.post('/coupons/validate', storefrontController.validateCoupon);
router.post('/orders', customerAuthMiddleware, storefrontController.placeOrder);
router.get('/orders', customerAuthMiddleware, storefrontController.listMyOrders);
router.get('/orders/:id/invoice', customerAuthMiddleware, storefrontController.downloadOrderInvoice);
router.post('/orders/:id/cancel-request', customerAuthMiddleware, storefrontController.requestOrderCancel);
router.get('/orders/:id', customerAuthMiddleware, storefrontController.getMyOrder);

router.get('/notifications', customerAuthMiddleware, customerNotificationController.listMyNotifications);
router.get('/notifications/unread-count', customerAuthMiddleware, customerNotificationController.getUnreadCount);
router.patch('/notifications/:id/read', customerAuthMiddleware, customerNotificationController.markRead);
router.post('/notifications/read-all', customerAuthMiddleware, customerNotificationController.markAllRead);

router.get('/products/facets', storefrontController.getProductFacets);
router.get('/products', storefrontController.getProducts);
router.get('/products/:id/reviews', optionalCustomerAuth, storefrontController.getProductReviews);
router.post('/products/:id/reviews', customerAuthMiddleware, storefrontController.createProductReview);
router.put('/products/:id/reviews/mine', customerAuthMiddleware, storefrontController.updateMyProductReview);
router.delete('/products/:id/reviews/mine', customerAuthMiddleware, storefrontController.deleteMyProductReview);
router.get('/products/:id', storefrontController.getProductDetail);
router.get('/search-suggestions', storefrontController.getSearchSuggestions);

module.exports = router;
