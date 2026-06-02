const Request = require('../models/Request');

// @desc    Create a new theme request
// @route   POST /api/requests
// @access  Public (optional auth — associates user when a token is present)
exports.createRequest = async (req, res, next) => {
  try {
    const { themeName, description, visualStyle, referenceImageUrl } = req.body;

    // Validate required fields
    if (!themeName || !themeName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Theme name is required',
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Description is required',
      });
    }

    const request = await Request.create({
      themeName,
      description,
      visualStyle,
      referenceImageUrl,
      // Only set when the requester is authenticated (optional auth).
      ...(req.user ? { user: req.user.id } : {}),
      metadata: {
        platform: req.body.platform,
        appVersion: req.headers['x-app-version'],
        deviceInfo: req.headers['user-agent'],
      },
    });

    res.status(201).json({
      success: true,
      data: request,
      message: 'Theme request submitted. Thank you for your suggestion!',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent theme requests
// @route   GET /api/requests
// @access  Private
exports.getRequests = async (req, res, next) => {
  try {
    const requests = await Request.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};
