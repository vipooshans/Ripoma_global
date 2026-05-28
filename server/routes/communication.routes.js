const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/communication.controller');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, ctrl.getLogs);
router.post('/', auth, ctrl.createLog);
router.put('/:id', auth, ctrl.updateLog);
router.delete('/:id', auth, ctrl.deleteLog);
router.patch('/:id/follow-up', auth, ctrl.markFollowUpDone);

module.exports = router;
