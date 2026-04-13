const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/designs', require('./designs'));
router.use('/styles', require('./styles'));
router.use('/tokens', require('./tokens'));
router.use('/worlds', require('./worlds'));
router.use('/webhooks', require('./webhooks'));

module.exports = router;
