const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_EXPIRE, INITIAL_FREE_TOKENS } = require('../config/constants');

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
    balance: { type: Number, default: INITIAL_FREE_TOKENS },
    totalPurchased: { type: Number, default: 0 },
    totalUsed: { type: Number, default: 0 },
  },

  // Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium_monthly', 'premium_yearly'],
      default: 'free',
    },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: false },
    transactionId: { type: String },
  },

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

// Check if user has enough tokens
userSchema.methods.hasTokens = function(amount = 1) {
  // Unlimited subscription
  if (this.subscription.isActive && this.subscription.plan !== 'free') {
    return true;
  }
  return this.tokens.balance >= amount;
};

// Deduct tokens
userSchema.methods.useTokens = function(amount = 1) {
  if (this.subscription.isActive && this.subscription.plan !== 'free') {
    return true; // Unlimited usage for premium
  }
  if (this.tokens.balance >= amount) {
    this.tokens.balance -= amount;
    this.tokens.totalUsed += amount;
    return true;
  }
  return false;
};

// Add tokens
userSchema.methods.addTokens = function(amount) {
  this.tokens.balance += amount;
  this.tokens.totalPurchased += amount;
};

module.exports = mongoose.model('User', userSchema);

