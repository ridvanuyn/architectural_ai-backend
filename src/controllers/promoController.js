const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const PromoRedemption = require('../models/PromoRedemption');

// @desc    Redeem a promo code for expiring tokens
// @route   POST /api/tokens/redeem
// @access  Private
exports.redeemCode = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Code required' });
    }

    const norm = String(code).trim().toUpperCase();

    const promo = await PromoCode.findOne({ code: norm, isActive: true });
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Invalid code' });
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'This code has expired' });
    }

    if (promo.maxRedemptions != null && promo.redemptionCount >= promo.maxRedemptions) {
      return res.status(400).json({ success: false, message: 'This code has reached its redemption limit' });
    }

    // Fast-path check for an existing redemption (clean error message). The
    // unique index below is the real guard against concurrent double-redeems.
    const existing = await PromoRedemption.findOne({ user: req.user.id, code: norm });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already redeemed this code' });
    }

    const expiresAt = new Date(Date.now() + promo.tokenValidityDays * 86400000);

    // Claim the redemption slot FIRST so the unique { user, code } index
    // atomically blocks concurrent double-redeems before we grant any tokens.
    try {
      await PromoRedemption.create({
        user: req.user.id,
        code: norm,
        tokensGranted: promo.tokens,
        expiresAt,
      });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(400).json({ success: false, message: 'You already redeemed this code' });
      }
      throw err;
    }

    // Slot claimed — now grant the expiring tokens.
    const user = await User.findById(req.user.id);
    user.addPromoTokens(promo.tokens, expiresAt);
    await user.save();

    // Bump the global redemption counter.
    await PromoCode.updateOne({ _id: promo._id }, { $inc: { redemptionCount: 1 } });

    res.status(200).json({
      success: true,
      data: {
        tokensGranted: promo.tokens,
        expiresAt,
        balance: user.availableTokens(),
        promoBalance: user.promoTokens(),
      },
      message: `${promo.tokens} tokens added`,
    });
  } catch (error) {
    next(error);
  }
};
