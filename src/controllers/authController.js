const User = require('../models/User');
const jwt = require('jsonwebtoken');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      authProvider: 'email',
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password',
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    OAuth login (Google/Apple)
// @route   POST /api/auth/oauth
// @access  Public
exports.oauthLogin = async (req, res, next) => {
  try {
    const { provider, providerId, email, name, avatar } = req.body;

    if (!provider || !providerId || !email) {
      return res.status(400).json({
        success: false,
        message: 'Provider, providerId and email are required',
      });
    }

    // Find or create user
    let user = await User.findOne({
      $or: [
        { authProvider: provider, authProviderId: providerId },
        { email: email },
      ],
    });

    if (user) {
      // Update provider info if logging in with OAuth for first time
      if (!user.authProviderId) {
        user.authProvider = provider;
        user.authProviderId = providerId;
      }
      user.lastLoginAt = new Date();
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        email,
        name,
        avatar,
        authProvider: provider,
        authProviderId: providerId,
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
exports.updateMe = async (req, res, next) => {
  try {
    const { name, avatar, settings, onboarding } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (avatar) updateFields.avatar = avatar;
    if (settings) updateFields.settings = { ...req.user.settings, ...settings };
    if (onboarding) updateFields.onboarding = { ...req.user.onboarding, ...onboarding };

    const user = await User.findByIdAndUpdate(req.user.id, updateFields, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete onboarding
// @route   POST /api/auth/onboarding
// @access  Private
exports.completeOnboarding = async (req, res, next) => {
  try {
    const { preferredStyles, usageIntent } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        onboarding: {
          completed: true,
          preferredStyles,
          usageIntent,
        },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user with this refresh token
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete account
// @route   DELETE /api/auth/me
// @access  Private
exports.deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to send token response
const sendTokenResponse = async (user, statusCode, res) => {
  const token = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();
  await user.save();

  res.status(statusCode).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        tokens: user.tokens,
        subscription: user.subscription,
        onboarding: user.onboarding,
        stats: user.stats,
        settings: user.settings,
      },
      token,
      refreshToken,
    },
  });
};

