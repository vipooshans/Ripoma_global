const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuth.controller');
const customerAuthMiddleware = require('../middleware/customerAuthMiddleware');

// Public routes
router.post('/register', customerAuthController.register);
router.get('/verify-email/:token', customerAuthController.verifyEmail);
router.post('/login', customerAuthController.login);
router.post('/logout', customerAuthController.logout);
router.post('/refresh', customerAuthController.refresh);
router.post('/forgot-password', customerAuthController.forgotPassword);
router.post('/reset-password', customerAuthController.resetPassword);
router.post('/resend-verification', customerAuthController.resendVerification);

// Protected routes (require customer JWT)
router.get('/me', customerAuthMiddleware, customerAuthController.getMe);
router.put('/me', customerAuthMiddleware, customerAuthController.updateMe);
router.post('/change-password', customerAuthMiddleware, customerAuthController.changePassword);

module.exports = router;
