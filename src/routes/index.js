const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/designs', require('./designs'));
router.use('/styles', require('./styles'));
router.use('/tokens', require('./tokens'));
router.use('/referrals', require('./referrals'));
router.use('/worlds', require('./worlds'));
router.use('/requests', require('./requests'));
router.use('/webhooks', require('./webhooks'));

module.exports = router;
