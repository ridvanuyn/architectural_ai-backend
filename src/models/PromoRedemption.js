const mongoose = require('mongoose');

const promoRedemptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Uppercased code string that was redeemed.
  code: {
    type: String,
    required: true,
  },

  tokensGranted: {
    type: Number,
  },

  // When the granted tokens expire.
  expiresAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// A user can only redeem a given code once — enforced at the DB level so it
// holds even under concurrent double-redeem races.
promoRedemptionSchema.index({ user: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('PromoRedemption', promoRedemptionSchema);
