const express = require('express');
const router = express.Router();
const storefrontController = require('../controllers/storefront.controller');
const customerAuthMiddleware = require('../middleware/customerAuthMiddleware');

// All routes are PUBLIC unless noted

router.get('/featured', storefrontController.getFeaturedProducts);
router.get('/categories', storefrontController.getCategories);
router.get('/categories/:id', storefrontController.getCategoryDetail);
router.get('/stats', storefrontController.getStats);
router.get('/promos', storefrontController.getPromos);
router.post('/cart/estimate', storefrontController.estimateCart);
router.post('/coupons/validate', storefrontController.validateCoupon);
router.post('/orders', customerAuthMiddleware, storefrontController.placeOrder);
router.get('/orders', customerAuthMiddleware, storefrontController.listMyOrders);
router.get('/orders/:id', customerAuthMiddleware, storefrontController.getMyOrder);
router.get('/products/facets', storefrontController.getProductFacets);
router.get('/products', storefrontController.getProducts);
router.get('/products/:id/reviews', storefrontController.getProductReviews);
router.post('/products/:id/reviews', customerAuthMiddleware, storefrontController.createProductReview);
router.get('/products/:id', storefrontController.getProductDetail);
router.get('/search-suggestions', storefrontController.getSearchSuggestions);

module.exports = router;
