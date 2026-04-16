const Design = require('../models/Design');
const { DESIGN_STYLES, ROOM_TYPES } = require('../config/constants');
const cache = require('../services/cacheService');

const STYLES_CACHE_KEY = 'styles:popularity:v1';
const STYLES_CACHE_TTL = 300; // 5 minutes

async function buildPopularityStyles() {
  const usageStats = await Design.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$style', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const usageMap = {};
  usageStats.forEach((s) => { usageMap[s._id] = s.count; });

  const styles = DESIGN_STYLES.map((style) => ({
    ...style,
    usageCount: usageMap[style.id] || 0,
  }));
  styles.sort((a, b) => b.usageCount - a.usageCount);
  return styles;
}

// @desc    Get all styles sorted by popularity (most used first)
// @route   GET /api/styles
// @access  Public
exports.getStyles = async (req, res, next) => {
  try {
    const styles = await cache.remember(
      STYLES_CACHE_KEY,
      STYLES_CACHE_TTL,
      buildPopularityStyles,
    );

    res.status(200).json({
      success: true,
      data: styles,
      count: styles.length,
    });
  } catch (error) {
    next(error);
  }
};

// Invalidate when a design is created/deleted so counts stay fresh.
exports.invalidatePopularityCache = () => cache.del(STYLES_CACHE_KEY);

// @desc    Get single style by ID
// @route   GET /api/styles/:id
// @access  Public
exports.getStyle = async (req, res, next) => {
  try {
    const style = DESIGN_STYLES.find(s => s.id === req.params.id);

    if (!style) {
      return res.status(404).json({
        success: false,
        message: 'Style not found',
      });
    }

    // Get usage count
    const usage = await Design.countDocuments({ style: style.id, isDeleted: false });

    res.status(200).json({
      success: true,
      data: { ...style, usageCount: usage },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all room types
// @route   GET /api/styles/room-types
// @access  Public
exports.getRoomTypes = async (req, res, next) => {
  try {
    const roomTypes = ROOM_TYPES.map(type => ({
      id: type,
      name: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    }));

    res.status(200).json({
      success: true,
      data: roomTypes,
      count: roomTypes.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get style recommendations based on room type
// @route   GET /api/styles/recommendations/:roomType
// @access  Public
exports.getRecommendations = async (req, res, next) => {
  try {
    const { roomType } = req.params;

    const recommendations = {
      living_room: ['scandinavian', 'modern', 'minimalist', 'bohemian'],
      bedroom: ['scandinavian', 'minimalist', 'japanese', 'bohemian'],
      kitchen: ['modern', 'scandinavian', 'industrial', 'minimalist'],
      bathroom: ['minimalist', 'modern', 'japanese', 'mediterranean'],
      dining_room: ['scandinavian', 'modern', 'luxury', 'mediterranean'],
      home_office: ['modern', 'minimalist', 'scandinavian', 'industrial'],
      outdoor: ['mediterranean', 'bohemian', 'modern', 'minimalist'],
      other: ['modern', 'scandinavian', 'minimalist', 'luxury'],
    };

    const recommendedIds = recommendations[roomType] || recommendations.other;
    const recommendedStyles = recommendedIds.map(id =>
      DESIGN_STYLES.find(s => s.id === id)
    ).filter(Boolean);

    res.status(200).json({
      success: true,
      data: recommendedStyles,
      roomType,
    });
  } catch (error) {
    next(error);
  }
};
