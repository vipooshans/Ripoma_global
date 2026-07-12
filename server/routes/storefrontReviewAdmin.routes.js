const express = require('express');
const router = express.Router();
const storefrontReviewAdminController = require('../controllers/storefrontReviewAdmin.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(requireRole('admin', 'manager'));

router.get('/', storefrontReviewAdminController.listReviews);
router.post('/:id/approve', storefrontReviewAdminController.approveReview);
router.post('/:id/reject', storefrontReviewAdminController.rejectReview);

module.exports = router;
