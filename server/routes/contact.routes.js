const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/contact.controller');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, ctrl.getContacts);

module.exports = router;
