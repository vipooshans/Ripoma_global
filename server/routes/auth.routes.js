const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/customerRateLimit');

const staffLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'staff-login',
  message: 'Too many staff login attempts. Please wait and try again.'
});

const staffRefreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyPrefix: 'staff-refresh',
  message: 'Too many staff session refresh attempts. Please wait and try again.'
});

const staffForgotLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyPrefix: 'staff-forgot',
  message: 'Too many password reset requests. Please try again later.'
});

router.post('/login', staffLoginLimiter, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', staffRefreshLimiter, authController.refresh);
router.post('/forgot-password', staffForgotLimiter, authController.forgotPassword);
router.post('/reset-password', staffForgotLimiter, authController.resetPassword);
router.post('/change-password', authMiddleware, authController.changePassword);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
