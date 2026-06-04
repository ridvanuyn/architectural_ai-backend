const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMyReferral, redeemReferral } = require('../controllers/referralController');

router.use(protect);

router.get('/me', getMyReferral);
router.post('/redeem', redeemReferral);

module.exports = router;
