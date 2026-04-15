const mongoose = require('mongoose');
const { DESIGN_STATUS } = require('../config/constants');

const designSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Original image
  originalImage: {
    url: { type: String, required: true },
    key: { type: String }, // S3 key
    width: { type: Number },
    height: { type: Number },
    size: { type: Number }, // in bytes
  },

  // Generated image
  generatedImage: {
    url: { type: String },
    key: { type: String },
    width: { type: Number },
    height: { type: Number },
    // Preserved raw fal.ai URL used as a fallback when S3 upload fails so the
    // frontend can still render the generated preview.
    fallbackUrl: { type: String },
  },

  // Design details
  style: {
    type: String,
    required: true,
  },

  roomType: {
    type: String,
    enum: ['living_room', 'bedroom', 'kitchen', 'bathroom', 'dining_room', 'home_office', 'outdoor', 'other'],
    default: 'other',
  },

  title: {
    type: String,
    trim: true,
  },

  // Processing status
  status: {
    type: String,
    enum: Object.values(DESIGN_STATUS),
    default: DESIGN_STATUS.PENDING,
  },

  // Processing details
  processing: {
    startedAt: { type: Date },
    completedAt: { type: Date },
    duration: { type: Number }, // in milliseconds
    error: { type: String },
    retryCount: { type: Number, default: 0 },
  },

  // AI generation parameters
  aiParams: {
    model: { type: String },
    prompt: { type: String },
    negativePrompt: { type: String },
    inferenceSteps: { type: Number },
    guidanceScale: { type: Number },
    seed: { type: Number },
  },

  // User interaction
  isFavorite: {
    type: Boolean,
    default: false,
  },

  // Token usage
  tokensUsed: {
    type: Number,
    default: 1,
  },

  // Metadata
  metadata: {
    deviceInfo: { type: String },
    appVersion: { type: String },
  },

  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes
designSchema.index({ user: 1, createdAt: -1 });
designSchema.index({ user: 1, status: 1 });
designSchema.index({ user: 1, isFavorite: 1 });
designSchema.index({ status: 1, createdAt: 1 }); // For processing queue

// Virtual for processing time
designSchema.virtual('processingTime').get(function() {
  if (this.processing.startedAt && this.processing.completedAt) {
    return this.processing.completedAt - this.processing.startedAt;
  }
  return null;
});

// Method to start processing
designSchema.methods.startProcessing = function() {
  this.status = DESIGN_STATUS.PROCESSING;
  this.processing.startedAt = new Date();
};

// Method to complete processing
designSchema.methods.completeProcessing = function(generatedImageUrl, generatedImageKey) {
  this.status = DESIGN_STATUS.COMPLETED;
  this.processing.completedAt = new Date();
  this.processing.duration = this.processing.completedAt - this.processing.startedAt;
  this.generatedImage.url = generatedImageUrl;
  this.generatedImage.key = generatedImageKey;
};

// Method to fail processing
designSchema.methods.failProcessing = function(errorMessage) {
  this.status = DESIGN_STATUS.FAILED;
  this.processing.completedAt = new Date();
  this.processing.error = errorMessage;
  this.processing.retryCount += 1;
};

module.exports = mongoose.model('Design', designSchema);

