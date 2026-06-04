const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },

  // How many tokens this code grants on redemption.
  tokens: {
    type: Number,
    required: true,
  },

  // Granted tokens expire this many days after redemption.
  tokenValidityDays: {
    type: Number,
    required: true,
    default: 30,
  },

  // The code is only redeemable until this date (null = no deadline).
  expiresAt: {
    type: Date,
  },

  // Global redemption cap (null/undefined = unlimited).
  maxRedemptions: {
    type: Number,
  },

  redemptionCount: {
    type: Number,
    default: 0,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  // Admin note.
  label: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('PromoCode', promoCodeSchema);
