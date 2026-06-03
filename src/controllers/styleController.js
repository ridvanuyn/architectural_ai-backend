const Design = require('../models/Design');
const { DESIGN_STYLES, ROOM_TYPES } = require('../config/constants');
const cache = require('../services/cacheService');

const STYLES_CACHE_KEY = 'styles:popularity:v1';

// Live "Most Used Styles" counter. A Redis sorted set whose members are base
// style ids and scores are total usages. Incremented on every design created
// with a real base style (see incrementStyleUsage), read directly here.
const STYLE_USAGE_KEY = 'styles:usage:v1';

function mapStylesWithUsage(usageMap) {
  const styles = DESIGN_STYLES.map((style) => ({
    ...style,
    usageCount: usageMap[style.id] || 0,
  }));
  styles.sort((a, b) => b.usageCount - a.usageCount);
  return styles;
}

// Legacy source: aggregate the Design collection. Used to seed the Redis
// counter once and as a fallback when Redis is unreachable.
async function buildPopularityStylesFromDb() {
  const usageStats = await Design.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$style', count: { $sum: 1 } } },
  ]);
  const usageMap = {};
  usageStats.forEach((s) => { usageMap[s._id] = s.count; });
  return mapStylesWithUsage(usageMap);
}

// Source of truth = the live Redis counter, read directly. Falls back to the
// DB aggregate when Redis is down, and self-seeds the counter from history the
// first time it's empty (so popularity isn't all-zero on a fresh deploy).
async function buildPopularityStyles() {
  const ranked = await cache.zrevrangeWithScores(STYLE_USAGE_KEY);

  if (ranked === null) {
    return buildPopularityStylesFromDb(); // Redis unavailable
  }

  if (ranked.length === 0) {
    const seeded = await buildPopularityStylesFromDb();
    await cache.zadd(
      STYLE_USAGE_KEY,
      seeded.filter((s) => s.usageCount > 0).map((s) => [s.id, s.usageCount]),
    );
    return seeded;
  }

  const usageMap = {};
  ranked.forEach(([member, score]) => { usageMap[member] = score; });
  return mapStylesWithUsage(usageMap);
}

// @desc    Get all styles sorted by popularity (most used first)
// @route   GET /api/styles
// @access  Public
exports.getStyles = async (req, res, next) => {
  try {
    const styles = await buildPopularityStyles();

    res.status(200).json({
      success: true,
      data: styles,
      count: styles.length,
    });
  } catch (error) {
    next(error);
  }
};

// Bump the live usage counter for a base style — called on each design create.
// Ignores world/custom prompts and any id not in our displayed style set.
exports.incrementStyleUsage = async (styleId) => {
  if (!styleId || !DESIGN_STYLES.some((s) => s.id === styleId)) return;
  await cache.zincrby(STYLE_USAGE_KEY, styleId, 1);
};

// Kept for callers that bust the legacy list cache (now a harmless no-op since
// popularity is read live from the Redis counter).
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
