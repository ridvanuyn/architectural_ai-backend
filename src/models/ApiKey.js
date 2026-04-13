const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    enum: ['fal', 'replicate', 'openai'],
    index: true,
  },
  key: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  label: {
    type: String,
    default: '',
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsedAt: {
    type: Date,
  },
  lastError: {
    type: String,
  },
}, {
  timestamps: true,
});

apiKeySchema.index({ provider: 1, isActive: 1 });

module.exports = mongoose.model('ApiKey', apiKeySchema);
