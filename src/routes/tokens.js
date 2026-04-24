const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const publicCache = require('../middleware/publicCache');
const {
  getBalance,
  getPackages,
  purchaseTokens,
  getTransactions,
  cancelSubscription,
  restorePurchases,
  applyPromoCode,
  grantTokens,
  refundTokens,
} = require('../controllers/tokenController');

// Public routes
router.get('/packages', publicCache(3600), getPackages);

// Protected routes
router.use(protect);

router.get('/balance', getBalance);
router.get('/transactions', getTransactions);
router.post('/purchase', purchaseTokens);
router.post('/subscription/cancel', cancelSubscription);
router.post('/restore', restorePurchases);
router.post('/promo', applyPromoCode);
router.post('/grant', grantTokens);
router.post('/refund', refundTokens);

module.exports = router;

