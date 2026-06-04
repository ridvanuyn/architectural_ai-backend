const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  // The code owner who gets credited.
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // The friend who redeemed — unique so a user can only ever be referred once.
  referee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // The code that was used, uppercased.
  referrerCode: {
    type: String,
  },

  tokensEach: {
    type: Number,
  },
}, {
  timestamps: true,
});

// A user can only ever be referred once — enforced at the DB level so it holds
// even under concurrent double-redeem races.
referralSchema.index({ referee: 1 }, { unique: true });

module.exports = mongoose.model('Referral', referralSchema);
