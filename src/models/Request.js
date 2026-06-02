const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  themeName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },

  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },

  // Free-form chip value (e.g. "Minimalist", "Cinematic", "Rustic",
  // "Cyberpunk", "Gothic"). Intentionally NOT enum'd so new chips added on the
  // frontend don't break submissions.
  visualStyle: {
    type: String,
    trim: true,
  },

  // Optional reference image (may be null).
  referenceImageUrl: {
    type: String,
  },

  // Only set when the requester is authenticated (optional auth).
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  status: {
    type: String,
    enum: ['pending', 'in_review', 'completed', 'rejected'],
    default: 'pending',
  },

  metadata: {
    platform: { type: String },
    appVersion: { type: String },
    deviceInfo: { type: String },
  },
}, {
  timestamps: true,
  collection: 'requests',
});

// Indexes
requestSchema.index({ createdAt: -1 });
requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ user: 1, createdAt: -1 }, { sparse: true });

module.exports = mongoose.model('Request', requestSchema);
