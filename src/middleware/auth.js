const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (error) {
      // Token invalid, continue without user
    }
  }

  next();
};

const premiumOnly = async (req, res, next) => {
  if (!req.user.subscription.isActive || req.user.subscription.plan === 'free') {
    return res.status(403).json({
      success: false,
      message: 'This feature requires a premium subscription',
    });
  }
  next();
};

const hasTokens = (requiredTokens = 1) => {
  return async (req, res, next) => {
    if (!req.user.hasTokens(requiredTokens)) {
      return res.status(402).json({
        success: false,
        message: 'Insufficient tokens',
        data: {
          required: requiredTokens,
          available: req.user.tokens.balance,
        },
      });
    }
    next();
  };
};

module.exports = { protect, optionalAuth, premiumOnly, hasTokens };

