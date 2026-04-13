const mongoose = require('mongoose');
const { TRANSACTION_TYPES } = require('../config/constants');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  type: {
    type: String,
    enum: Object.values(TRANSACTION_TYPES),
    required: true,
  },

  // Token details
  tokens: {
    amount: { type: Number, required: true }, // positive for add, negative for deduct
    balanceBefore: { type: Number },
    balanceAfter: { type: Number },
  },

  // Payment details (for purchases)
  payment: {
    amount: { type: Number },
    currency: { type: String, default: 'USD' },
    method: { type: String, enum: ['apple_pay', 'google_pay', 'stripe', 'paypal'] },
    transactionId: { type: String },
    receiptData: { type: String },
  },

  // Package details
  package: {
    id: { type: String },
    name: { type: String },
  },

  // Related design (for usage transactions)
  design: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Design',
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed',
  },

  // Description
  description: {
    type: String,
  },

  // Metadata
  metadata: {
    deviceInfo: { type: String },
    appVersion: { type: String },
    ip: { type: String },
  },
}, {
  timestamps: true,
});

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ 'payment.transactionId': 1 });
transactionSchema.index({ status: 1 });

// Static method to create purchase transaction
transactionSchema.statics.createPurchase = async function(userId, packageInfo, paymentInfo, tokensAmount) {
  const User = require('./User');
  const user = await User.findById(userId);
  
  const balanceBefore = user.tokens.balance;
  user.addTokens(tokensAmount);
  await user.save();

  return this.create({
    user: userId,
    type: TRANSACTION_TYPES.PURCHASE,
    tokens: {
      amount: tokensAmount,
      balanceBefore,
      balanceAfter: user.tokens.balance,
    },
    payment: paymentInfo,
    package: packageInfo,
    description: `Purchased ${packageInfo.name}`,
  });
};

// Static method to create usage transaction
transactionSchema.statics.createUsage = async function(userId, designId, tokensUsed) {
  const User = require('./User');
  const user = await User.findById(userId);
  
  const balanceBefore = user.tokens.balance;
  const success = user.useTokens(tokensUsed);
  
  if (!success) {
    throw new Error('Insufficient tokens');
  }
  
  await user.save();

  return this.create({
    user: userId,
    type: TRANSACTION_TYPES.USAGE,
    tokens: {
      amount: -tokensUsed,
      balanceBefore,
      balanceAfter: user.tokens.balance,
    },
    design: designId,
    description: 'Design generation',
  });
};

// Static method to create bonus transaction
transactionSchema.statics.createBonus = async function(userId, tokensAmount, description) {
  const User = require('./User');
  const user = await User.findById(userId);
  
  const balanceBefore = user.tokens.balance;
  user.tokens.balance += tokensAmount;
  await user.save();

  return this.create({
    user: userId,
    type: TRANSACTION_TYPES.BONUS,
    tokens: {
      amount: tokensAmount,
      balanceBefore,
      balanceAfter: user.tokens.balance,
    },
    description: description || 'Bonus tokens',
  });
};

module.exports = mongoose.model('Transaction', transactionSchema);

