const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_EXPIRE, INITIAL_FREE_TOKENS } = require('../config/constants');
const cache = require('../services/cacheService');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    minlength: 6,
    select: false,
  },
  name: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
  },
  authProvider: {
    type: String,
    enum: ['email', 'google', 'apple'],
    default: 'email',
  },
  authProviderId: {
    type: String,
  },

  // Token balance
  tokens: {
    // Permanent balance — purchased packs + bonuses. Never expires.
    balance: { type: Number, default: INITIAL_FREE_TOKENS },
    totalPurchased: { type: Number, default: 0 },
    totalUsed: { type: Number, default: 0 },
    // Subscription allowance — resets every period (use-it-or-lose-it). Does
    // NOT roll over; spent before the permanent balance.
    subscriptionBalance: { type: Number, default: 0 },
    subscriptionPeriodEnd: { type: Date },
    // Promo/redeem-code grants. Each lot expires independently N days after the
    // code was redeemed. Expiring → spent before the permanent balance.
    promoLots: [
      {
        amount: { type: Number },
        expiresAt: { type: Date },
        _id: false,
      },
    ],
  },

  // Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium_weekly', 'premium_monthly', 'premium_yearly'],
      default: 'free',
    },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: false },
    transactionId: { type: String },
  },

  // Referrals
  referralCode: { type: String, unique: true, sparse: true, index: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },

  // Onboarding
  onboarding: {
    completed: { type: Boolean, default: false },
    preferredStyles: [{ type: String }],
    usageIntent: { type: String },
  },

  // Stats
  stats: {
    totalDesigns: { type: Number, default: 0 },
    favoriteStyle: { type: String },
    lastDesignAt: { type: Date },
  },

  // Settings
  settings: {
    notificationsEnabled: { type: Boolean, default: true },
    saveOriginalImages: { type: Boolean, default: true },
    preferredQuality: { type: String, default: 'high', enum: ['low', 'medium', 'high'] },
  },

  // Device info for push notifications
  devices: [{
    deviceId: { type: String },
    platform: { type: String, enum: ['ios', 'android'] },
    pushToken: { type: String },
    lastActiveAt: { type: Date },
  }],

  isActive: {
    type: Boolean,
    default: true,
  },

  lastLoginAt: {
    type: Date,
  },

  refreshToken: {
    type: String,
    select: false,
  },
}, {
  timestamps: true,
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.endDate': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function() {
  const refreshToken = jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '90d' }
  );
  this.refreshToken = refreshToken;
  return refreshToken;
};

// Subscription token allowance per plan. The allowance RESETS every period
// (use-it-or-lose-it — unused tokens expire, they do NOT roll over).
// `periodDays` = allowance refill cadence; `validityDays` = fallback
// subscription length when the store expiry isn't supplied.
const DAY_MS = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_ALLOWANCE = {
  premium_weekly:  { tokens: 20, periodDays: 7,  validityDays: 7 },
  premium_monthly: { tokens: 50, periodDays: 30, validityDays: 30 },
  premium_yearly:  { tokens: 50, periodDays: 30, validityDays: 365 }, // monthly refill within the year
};

// Whether the user currently has an active, non-expired premium subscription.
// Guards against an `isActive: true` flag that was never flipped off after the
// subscription lapsed — an expired subscription grants no allowance.
userSchema.methods.isSubscriptionActive = function() {
  const sub = this.subscription || {};
  if (!sub.isActive || sub.plan === 'free' || !sub.plan) return false;
  return !sub.endDate || sub.endDate > new Date();
};

// Lazily reset the expiring allowance when a new period begins. Overwrites
// (never adds), so any unused tokens from the previous period simply expire.
userSchema.methods.refreshSubscriptionAllowance = function() {
  if (!this.isSubscriptionActive()) {
    if (this.tokens.subscriptionBalance) this.tokens.subscriptionBalance = 0;
    this.tokens.subscriptionPeriodEnd = undefined;
    return;
  }
  const cfg = SUBSCRIPTION_ALLOWANCE[this.subscription.plan];
  if (!cfg) return;
  const now = new Date();
  if (!this.tokens.subscriptionPeriodEnd || this.tokens.subscriptionPeriodEnd <= now) {
    this.tokens.subscriptionBalance = cfg.tokens;
    this.tokens.subscriptionPeriodEnd = new Date(now.getTime() + cfg.periodDays * DAY_MS);
  }
};

// Currently spendable subscription allowance (0 when expired / not subscribed).
userSchema.methods.subscriptionTokens = function() {
  if (!this.isSubscriptionActive()) return 0;
  const end = this.tokens.subscriptionPeriodEnd;
  if (end && end <= new Date()) return 0; // expired, awaiting refill
  return this.tokens.subscriptionBalance || 0;
};

// Prune expired promo lots in place and return the remaining promo tokens.
userSchema.methods.promoTokens = function() {
  const now = new Date();
  const lots = (this.tokens.promoLots || []).filter((l) => l.amount > 0 && l.expiresAt > now);
  this.tokens.promoLots = lots;
  return lots.reduce((sum, l) => sum + l.amount, 0);
};

// Add an expiring promo grant (from a redeemed code).
userSchema.methods.addPromoTokens = function(amount, expiresAt) {
  if (!this.tokens.promoLots) this.tokens.promoLots = [];
  this.tokens.promoLots.push({ amount, expiresAt });
};

// Total spendable = permanent balance + subscription allowance + promo tokens.
userSchema.methods.availableTokens = function() {
  this.refreshSubscriptionAllowance();
  return (this.tokens.balance || 0) + this.subscriptionTokens() + this.promoTokens();
};

// Check if the user has enough tokens. No more "unlimited" — subscribers spend
// from their (expiring) allowance like everyone else.
userSchema.methods.hasTokens = function(amount = 1) {
  return this.availableTokens() >= amount;
};

// Deduct tokens — spend EXPIRING tokens first (subscription allowance, then
// promo lots by soonest expiry), then the permanent balance.
userSchema.methods.useTokens = function(amount = 1) {
  // availableTokens() refreshes the subscription allowance and prunes promo lots.
  if (this.availableTokens() < amount) return false;

  let remaining = amount;

  // 1) Subscription allowance (expires at period end).
  const fromSub = Math.min(this.subscriptionTokens(), remaining);
  if (fromSub > 0) {
    this.tokens.subscriptionBalance -= fromSub;
    remaining -= fromSub;
  }

  // 2) Promo lots, soonest expiry first (also expiring).
  if (remaining > 0 && this.tokens.promoLots && this.tokens.promoLots.length) {
    this.tokens.promoLots.sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
    for (const lot of this.tokens.promoLots) {
      if (remaining <= 0) break;
      const take = Math.min(lot.amount, remaining);
      lot.amount -= take;
      remaining -= take;
    }
    this.tokens.promoLots = this.tokens.promoLots.filter((l) => l.amount > 0);
  }

  // 3) Permanent balance (never expires).
  if (remaining > 0) {
    this.tokens.balance -= remaining;
  }

  this.tokens.totalUsed += amount;
  return true;
};

// Activate / renew / sync a subscription. Sets the plan window and refills the
// expiring allowance only on a new period or plan change (safe to call on every
// app launch). `storeExpiration` is the store's real expiry when available.
userSchema.methods.syncSubscription = function(plan, storeExpiration) {
  const cfg = SUBSCRIPTION_ALLOWANCE[plan];
  if (!cfg) return false;
  const now = new Date();
  const planChanged = this.subscription.plan !== plan;

  this.subscription.plan = plan;
  this.subscription.isActive = true;
  this.subscription.startDate = this.subscription.startDate || now;
  this.subscription.endDate = storeExpiration
    ? new Date(storeExpiration)
    : new Date(now.getTime() + cfg.validityDays * DAY_MS);

  if (planChanged || !this.tokens.subscriptionPeriodEnd || this.tokens.subscriptionPeriodEnd <= now) {
    this.tokens.subscriptionBalance = cfg.tokens;
    this.tokens.subscriptionPeriodEnd = new Date(now.getTime() + cfg.periodDays * DAY_MS);
  }
  return true;
};

// Add permanent tokens (purchased packs / bonuses) — never expire.
userSchema.methods.addTokens = function(amount) {
  this.tokens.balance += amount;
  this.tokens.totalPurchased += amount;
};

// Any user write (token spend/grant/refill, profile, ...) invalidates the
// cached balance so getBalance recomputes from the DB source of truth.
userSchema.post('save', function (doc) {
  cache.delBalance(doc._id).catch(() => {});
});

module.exports = mongoose.model('User', userSchema);

