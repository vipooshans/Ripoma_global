const express = require('express');
const router = express.Router();
const storefrontController = require('../controllers/storefront.controller');

// All routes are PUBLIC — no auth middleware

router.get('/featured', storefrontController.getFeaturedProducts);
router.get('/categories', storefrontController.getCategories);
router.get('/categories/:id', storefrontController.getCategoryDetail);
router.get('/stats', storefrontController.getStats);
router.get('/promos', storefrontController.getPromos);
router.get('/products/facets', storefrontController.getProductFacets);
router.get('/products', storefrontController.getProducts);
router.get('/products/:id', storefrontController.getProductDetail);
router.get('/search-suggestions', storefrontController.getSearchSuggestions);

module.exports = router;
