const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuth.controller');
const customerAuthMiddleware = require('../middleware/customerAuthMiddleware');
const { createRateLimiter } = require('../middleware/customerRateLimit');

const authLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'cust-login',
  message: 'Too many sign-in attempts. Please wait and try again.',
  skipSuccessfulRequests: true
});

// Google ID tokens are verified server-side, so brute force isn't a concern here;
// keep it in its own bucket so failed password attempts don't block Google sign-in.
const authGoogleLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: 'cust-google',
  message: 'Too many Google sign-in attempts. Please wait and try again.',
  skipSuccessfulRequests: true
});

const authRegisterLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyPrefix: 'cust-reg',
  message: 'Too many registration attempts. Please try again later.'
});

const authForgotLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyPrefix: 'cust-forgot',
  message: 'Too many password reset requests. Please try again later.'
});

const authRefreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyPrefix: 'cust-refresh',
  message: 'Too many session refresh attempts. Please wait and try again.'
});

router.get('/legal', customerAuthController.getLegal);

router.post('/register', authRegisterLimiter, customerAuthController.register);
router.get('/verify-email/:token', customerAuthController.verifyEmail);
router.post('/login', authLoginLimiter, customerAuthController.login);
router.post('/google', authGoogleLimiter, customerAuthController.loginWithGoogle);
router.post('/logout', customerAuthController.logout);
router.post('/refresh', authRefreshLimiter, customerAuthController.refresh);
router.post('/forgot-password', authForgotLimiter, customerAuthController.forgotPassword);
router.post('/reset-password', authForgotLimiter, customerAuthController.resetPassword);
router.post('/resend-verification', authForgotLimiter, customerAuthController.resendVerification);

router.get('/me', customerAuthMiddleware, customerAuthController.getMe);
router.put('/me', customerAuthMiddleware, customerAuthController.updateMe);
router.post('/change-password', customerAuthMiddleware, customerAuthController.changePassword);
router.get('/sessions', customerAuthMiddleware, customerAuthController.listSessions);
router.delete('/sessions/:id', customerAuthMiddleware, customerAuthController.revokeSession);
router.post('/logout-all', customerAuthMiddleware, customerAuthController.logoutAllSessions);
router.get('/export-data', customerAuthMiddleware, customerAuthController.exportMyData);
router.post('/delete-account', customerAuthMiddleware, customerAuthController.deleteMyAccount);

module.exports = router;
