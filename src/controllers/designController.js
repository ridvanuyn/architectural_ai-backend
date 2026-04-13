const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Design = require('../models/Design');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { DESIGN_STATUS, TOKENS_PER_DESIGN, DESIGN_STYLES } = require('../config/constants');
const s3Service = require('../services/s3Service');
const falService = require('../services/falService');

// @desc    Upload image and get S3 URL
// @route   POST /api/designs/upload
// @access  Private
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    let result;

    // Try S3 first, fall back to local storage
    try {
      result = await s3Service.uploadImage(req.file.buffer, {
        folder: 'originals',
        userId: req.user.id,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        optimize: true,
      });
    } catch (s3Err) {
      console.warn('⚠️ S3 upload failed, saving locally:', s3Err.message);
      // Save to local uploads directory
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filename = `${uuidv4()}.jpg`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);

      const port = process.env.PORT || 3005;
      result = {
        url: `http://localhost:${port}/uploads/${filename}`,
        key: `local/${filename}`,
        width: null,
        height: null,
        size: req.file.buffer.length,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        url: result.url,
        key: result.key,
        width: result.width,
        height: result.height,
        size: result.size,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get presigned URL for direct upload
// @route   GET /api/designs/upload-url
// @access  Private
exports.getUploadUrl = async (req, res, next) => {
  try {
    const { contentType = 'image/jpeg' } = req.query;

    const result = await s3Service.getSignedUploadUrl({
      folder: 'originals',
      userId: req.user.id,
      contentType,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new design transformation
// @route   POST /api/designs
// @access  Private
exports.createDesign = async (req, res, next) => {
  try {
    const { originalImageUrl, originalImageKey, style, roomType, title, customPrompt, isPremium, tier } = req.body;

    // Validate required fields
    if (!originalImageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Original image URL is required',
      });
    }

    // Need either style or customPrompt
    if (!style && !customPrompt) {
      return res.status(400).json({
        success: false,
        message: 'Either style or customPrompt is required',
      });
    }

    // Look up style — accept any style name even if not in our predefined list
    let validStyle = null;
    if (style) {
      validStyle = DESIGN_STYLES.find(s => s.id === style);
      if (!validStyle) {
        // Accept unknown styles — use the style name as-is for fal.ai prompt
        validStyle = { id: style, name: style.charAt(0).toUpperCase() + style.slice(1) };
      }
    }

    // Check if user has enough tokens
    const user = await User.findById(req.user.id);
    if (!user.hasTokens(TOKENS_PER_DESIGN)) {
      return res.status(402).json({
        success: false,
        message: 'Insufficient tokens. Please purchase more tokens.',
        data: {
          required: TOKENS_PER_DESIGN,
          available: user.tokens.balance,
        },
      });
    }

    // Determine title
    const designTitle = title || (validStyle ? `${validStyle.name} Design` : 'Custom Design');

    // Create design record
    const design = await Design.create({
      user: req.user.id,
      originalImage: {
        url: originalImageUrl,
        key: originalImageKey,
      },
      style: style || 'custom',
      roomType: roomType || 'other',
      title: designTitle,
      status: DESIGN_STATUS.PROCESSING,
      modelTier: tier || (isPremium ? 'pro' : 'free'),
      metadata: {
        deviceInfo: req.headers['user-agent'],
        appVersion: req.headers['x-app-version'],
      },
    });

    // Deduct tokens
    await Transaction.createUsage(req.user.id, design._id, TOKENS_PER_DESIGN);

    // Start AI processing
    design.startProcessing();
    await design.save();

    // Process with fal.ai (model selected by tier)
    processDesignWithAI(design._id, originalImageUrl, {
      style,
      roomType,
      customPrompt,
      tier: tier || (isPremium ? 'pro' : 'free'),
      userId: req.user.id,
    });

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.totalDesigns': 1 },
      'stats.lastDesignAt': new Date(),
    });

    res.status(201).json({
      success: true,
      data: design,
      message: 'Design is being processed. Check status for updates.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process design with fal.ai nano-banana (background task)
 */
async function processDesignWithAI(designId, imageUrl, options) {
  const { style, roomType, customPrompt, tier, userId } = options;

  try {
    console.log(`🚀 Processing design ${designId} | style: ${style} | tier: ${tier}${customPrompt ? ` | custom: "${customPrompt}"` : ''}`);

    const result = await falService.transformImage(imageUrl, {
      style,
      roomType,
      customPrompt,
      tier,
    });

    if (!result.success || !result.url) {
      throw new Error('AI transformation returned no result');
    }

    console.log(`🎨 AI generated image URL: ${result.url}`);

    let finalUrl = result.url;
    let finalKey = null;
    let width = null;
    let height = null;

    // Try to upload to S3, but continue if it fails
    try {
      const s3Result = await s3Service.uploadFromUrl(result.url, {
        folder: 'generated',
        userId,
      });
      finalUrl = s3Result.url;
      finalKey = s3Result.key;
      width = s3Result.width;
      height = s3Result.height;
      console.log(`☁️ Uploaded to S3: ${s3Result.url}`);
    } catch (s3Error) {
      console.warn(`⚠️ S3 upload failed, using fal.ai URL directly: ${s3Error.message}`);
      // Continue with fal.ai's URL - it's temporary but works for now
    }

    // Update design with generated image
    const design = await Design.findById(designId);
    if (design) {
      design.generatedImage = {
        url: finalUrl,
        key: finalKey,
        width: width,
        height: height,
      };
      design.aiParams = {
        model: result.model,
        prompt: result.prompts.positive,
        negativePrompt: result.prompts.negative,
      };
      design.completeProcessing(finalUrl, finalKey);
      await design.save();

      console.log(`✅ Design ${designId} completed successfully`);
    }
  } catch (error) {
    console.error(`❌ Design ${designId} processing failed:`, error.message);

    // Update design as failed
    const design = await Design.findById(designId);
    if (design) {
      design.failProcessing(error.message);
      await design.save();
    }
  }
}

// @desc    Get all designs for current user
// @route   GET /api/designs
// @access  Private
exports.getDesigns = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, style, favorite } = req.query;

    const query = {
      user: req.user.id,
      isDeleted: false,
    };

    if (status) query.status = status;
    if (style) query.style = style;
    if (favorite === 'true') query.isFavorite = true;

    const designs = await Design.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Design.countDocuments(query);

    res.status(200).json({
      success: true,
      data: designs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single design
// @route   GET /api/designs/:id
// @access  Private
exports.getDesign = async (req, res, next) => {
  try {
    const design = await Design.findOne({
      _id: req.params.id,
      user: req.user.id,
      isDeleted: false,
    });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found',
      });
    }

    res.status(200).json({
      success: true,
      data: design,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle favorite status
// @route   PUT /api/designs/:id/favorite
// @access  Private
exports.toggleFavorite = async (req, res, next) => {
  try {
    const design = await Design.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found',
      });
    }

    design.isFavorite = !design.isFavorite;
    await design.save();

    res.status(200).json({
      success: true,
      data: design,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete design
// @route   DELETE /api/designs/:id
// @access  Private
exports.deleteDesign = async (req, res, next) => {
  try {
    const design = await Design.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found',
      });
    }

    // Optionally delete images from S3
    const keysToDelete = [];
    if (design.originalImage?.key) keysToDelete.push(design.originalImage.key);
    if (design.generatedImage?.key) keysToDelete.push(design.generatedImage.key);

    if (keysToDelete.length > 0) {
      try {
        await s3Service.deleteImages(keysToDelete);
      } catch (err) {
        console.error('Failed to delete S3 images:', err.message);
      }
    }

    // Soft delete
    design.isDeleted = true;
    await design.save();

    res.status(200).json({
      success: true,
      message: 'Design deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get design status (for polling)
// @route   GET /api/designs/:id/status
// @access  Private
exports.getDesignStatus = async (req, res, next) => {
  try {
    const design = await Design.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).select('status processing generatedImage originalImage style');

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: design.status,
        generatedImage: design.generatedImage,
        originalImage: design.originalImage,
        style: design.style,
        processing: design.processing,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's design stats
// @route   GET /api/designs/stats
// @access  Private
exports.getDesignStats = async (req, res, next) => {
  try {
    const [totalDesigns, completedDesigns, favoriteDesigns, styleStats] = await Promise.all([
      Design.countDocuments({ user: req.user.id, isDeleted: false }),
      Design.countDocuments({ user: req.user.id, status: DESIGN_STATUS.COMPLETED, isDeleted: false }),
      Design.countDocuments({ user: req.user.id, isFavorite: true, isDeleted: false }),
      Design.aggregate([
        { $match: { user: req.user._id, isDeleted: false } },
        { $group: { _id: '$style', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDesigns,
        completedDesigns,
        favoriteDesigns,
        styleStats,
        favoriteStyle: styleStats[0]?._id || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Retry failed design
// @route   POST /api/designs/:id/retry
// @access  Private
exports.retryDesign = async (req, res, next) => {
  try {
    const design = await Design.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: DESIGN_STATUS.FAILED,
    });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found or not in failed state',
      });
    }

    // Check retry limit
    if (design.processing.retryCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum retry limit reached. Please create a new design.',
      });
    }

    // Reset status for retry (no additional token charge for retries)
    design.status = DESIGN_STATUS.PROCESSING;
    design.processing.error = null;
    design.startProcessing();
    await design.save();

    // Retry AI processing
    processDesignWithAI(design._id, design.originalImage.url, {
      style: design.style,
      roomType: design.roomType,
      customPrompt: design.aiParams?.prompt,
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      data: design,
      message: 'Design queued for retry',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download design image
// @route   GET /api/designs/:id/download/:type
// @access  Private
exports.downloadDesign = async (req, res, next) => {
  try {
    const { type } = req.params; // 'original' or 'generated'

    const design = await Design.findOne({
      _id: req.params.id,
      user: req.user.id,
      isDeleted: false,
    });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found',
      });
    }

    let imageKey;
    if (type === 'original' && design.originalImage?.key) {
      imageKey = design.originalImage.key;
    } else if (type === 'generated' && design.generatedImage?.key) {
      imageKey = design.generatedImage.key;
    } else {
      return res.status(400).json({
        success: false,
        message: `${type} image not available`,
      });
    }

    // Get signed URL for download
    const downloadUrl = await s3Service.getSignedDownloadUrl(imageKey, 300);

    res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: 300,
      },
    });
  } catch (error) {
    next(error);
  }
};
