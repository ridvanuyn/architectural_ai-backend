const crypto = require('crypto');
const User = require('../models/User');
const Referral = require('../models/Referral');

const REFERRAL_TOKENS = 5;
const REFERRER_DELAY_MS = 24 * 60 * 60 * 1000; // referrer reward lands 24h later
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // referral tokens expire in 1 week
const MAX_REFERRALS = 50; // a referrer earns from at most 50 people (anti-abuse)

// Grant any matured (24h-elapsed) referrer rewards for this user. Lazy — runs
// when the referrer is active (referral screen / balance fetch), so no cron is
// needed. Idempotent (marks each referral rewarded). Returns tokens granted.
async function processMaturedReferrals(userId) {
  const due = await Referral.find({
    referrer: userId,
    referrerRewarded: false,
    referrerRewardAt: { $lte: new Date() },
  });
  if (due.length === 0) return 0;

  const user = await User.findById(userId);
  if (!user) return 0;

  let granted = 0;
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  for (const ref of due) {
    user.addPromoTokens(ref.tokensEach || REFERRAL_TOKENS, expiresAt);
    user.referralCount = (user.referralCount || 0) + 1;
    granted += ref.tokensEach || REFERRAL_TOKENS;
    ref.referrerRewarded = true;
    // eslint-disable-next-line no-await-in-loop
    await ref.save();
  }
  await user.save();
  return granted;
}
exports.processMaturedReferrals = processMaturedReferrals;

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
    // Grant any matured referrer rewards before reporting stats.
    await processMaturedReferrals(req.user.id);

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.referralCode) {
      user.referralCode = await generateUniqueCode();
      await user.save();
    }

    // The friends who used this user's code (newest first).
    const referrals = await Referral.find({ referrer: user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        code: user.referralCode,
        referralCount: user.referralCount || 0,
        tokensPerReferral: REFERRAL_TOKENS,
        tokenValidityDays: 7,
        referrals: referrals.map((r) => ({
          redeemedAt: r.createdAt,
          tokens: r.tokensEach || REFERRAL_TOKENS,
          rewarded: !!r.referrerRewarded,
          rewardAt: r.referrerRewardAt,
        })),
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

    // A referrer earns from at most MAX_REFERRALS people. The code can still be
    // shared, but past the cap it grants no bonus (anti-abuse / capped liability).
    if (await Referral.countDocuments({ referrer: referrer._id }) >= MAX_REFERRALS) {
      return res.status(400).json({ success: false, message: 'This referral code has reached its limit' });
    }

    const referee = await User.findById(req.user.id);

    // Fast-path check for an already-referred user (clean error message). The
    // unique index below is the real guard against concurrent double-redeems.
    if (referee.referredBy || await Referral.findOne({ referee: referee._id })) {
      return res.status(400).json({ success: false, message: 'You have already used a referral code' });
    }

    // Claim the referral slot FIRST so the unique { referee } index atomically
    // blocks concurrent double-redeems before we grant any tokens. The
    // referrer's reward is scheduled for +24h (granted lazily later).
    try {
      await Referral.create({
        referrer: referrer._id,
        referee: referee._id,
        referrerCode: norm,
        tokensEach: REFERRAL_TOKENS,
        referrerRewardAt: new Date(Date.now() + REFERRER_DELAY_MS),
        referrerRewarded: false,
      });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(400).json({ success: false, message: 'You have already used a referral code' });
      }
      throw err;
    }

    // The REFEREE is credited immediately with expiring tokens (1-week TTL).
    // The referrer is paid 24h later via processMaturedReferrals.
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    referee.addPromoTokens(REFERRAL_TOKENS, expiresAt);
    referee.referredBy = referrer._id;
    await referee.save();

    res.status(200).json({
      success: true,
      data: {
        tokensGranted: REFERRAL_TOKENS,
        balance: referee.availableTokens(),
        expiresAt,
      },
      message: 'You earned 5 credits (valid 7 days)! Your friend gets theirs in 24h.',
    });
  } catch (error) {
    next(error);
  }
};
