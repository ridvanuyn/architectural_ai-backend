const crypto = require('crypto');
const User = require('../models/User');
const Referral = require('../models/Referral');

const REFERRAL_TOKENS = 5;

// Unambiguous uppercase alphanumeric alphabet (no 0/O/1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function generateCandidate() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

// Generate a referral code that is not already in use. Retries on collision.
async function generateUniqueCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateCandidate();
    // eslint-disable-next-line no-await-in-loop
    const taken = await User.exists({ referralCode: candidate });
    if (!taken) {
      return candidate;
    }
  }
  throw new Error('Failed to generate a unique referral code');
}

// @desc    Get the current user's referral code + stats (lazily generating one)
// @route   GET /api/referrals/me
// @access  Private
exports.getMyReferral = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.referralCode) {
      user.referralCode = await generateUniqueCode();
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: {
        code: user.referralCode,
        referralCount: user.referralCount || 0,
        tokensPerReferral: REFERRAL_TOKENS,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Redeem a friend's referral code (both users get tokens)
// @route   POST /api/referrals/redeem
// @access  Private
exports.redeemReferral = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Code required' });
    }

    const norm = String(code).trim().toUpperCase();

    const referrer = await User.findOne({ referralCode: norm });
    if (!referrer) {
      return res.status(400).json({ success: false, message: 'Invalid referral code' });
    }

    if (referrer._id.equals(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You cannot use your own code' });
    }

    const referee = await User.findById(req.user.id);

    // Fast-path check for an already-referred user (clean error message). The
    // unique index below is the real guard against concurrent double-redeems.
    if (referee.referredBy || await Referral.findOne({ referee: referee._id })) {
      return res.status(400).json({ success: false, message: 'You have already used a referral code' });
    }

    // Claim the referral slot FIRST so the unique { referee } index atomically
    // blocks concurrent double-redeems before we grant any tokens.
    try {
      await Referral.create({
        referrer: referrer._id,
        referee: referee._id,
        referrerCode: norm,
        tokensEach: REFERRAL_TOKENS,
      });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(400).json({ success: false, message: 'You have already used a referral code' });
      }
      throw err;
    }

    // Slot claimed — grant tokens to BOTH users and update counters.
    referee.addTokens(REFERRAL_TOKENS);
    referee.referredBy = referrer._id;
    await referee.save();

    referrer.addTokens(REFERRAL_TOKENS);
    referrer.referralCount = (referrer.referralCount || 0) + 1;
    await referrer.save();

    res.status(200).json({
      success: true,
      data: {
        tokensGranted: REFERRAL_TOKENS,
        balance: referee.availableTokens(),
      },
      message: 'You and your friend each earned 5 credits!',
    });
  } catch (error) {
    next(error);
  }
};
