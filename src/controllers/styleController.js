const Design = require('../models/Design');
const SpecialtyWorld = require('../models/SpecialtyWorld');
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
// Ignores any id not in our displayed style set.
exports.incrementStyleUsage = async (styleId) => {
  if (!styleId || !DESIGN_STYLES.some((s) => s.id === styleId)) return;
  await cache.zincrby(STYLE_USAGE_KEY, styleId, 1);
};

// Resolve which displayed style a generation should count toward and bump it.
// Direct base-style picks count as-is; world/theme generations (style:'custom')
// are matched to a base style by the style name/id appearing in the prompt
// (e.g. "...Scandinavian-style kitchen..." → scandinavian), so the Most Used
// list reflects ALL generation activity, not just the style-selection screen.
exports.incrementStyleFromGeneration = async (styleId, customPrompt) => {
  let id = null;
  if (styleId && DESIGN_STYLES.some((s) => s.id === styleId)) {
    id = styleId;
  } else if (customPrompt) {
    const p = String(customPrompt).toLowerCase();
    const match = DESIGN_STYLES.find(
      (s) => p.includes(s.id.toLowerCase()) || p.includes(s.name.toLowerCase()),
    );
    if (match) id = match.id;
  }
  if (!id) return;
  await cache.zincrby(STYLE_USAGE_KEY, id, 1);
};

// ---------------------------------------------------------------------------
// App-wide "Most Used" by the ACTUAL name generated — base style name ("Modern")
// OR specialty-world name ("Gatsby"). Members are display names, scores are
// total usages across all users. Read by GET /api/styles/popular. This is what
// the home "Most Used Styles" rail shows, so it surfaces real worlds/themes by
// name instead of collapsing everything into the 16 base style categories.
// ---------------------------------------------------------------------------
const USAGE_ITEMS_KEY = 'usage:items:v1';
const POPULAR_CACHE_KEY = 'usage:items:resolved:v1';
const GENERIC_NAMES = new Set(['', 'design', 'custom', 'custom design']);

function isGenericName(name) {
  return !name || GENERIC_NAMES.has(String(name).trim().toLowerCase());
}

// Bump the app-wide usage counter for whatever the user actually generated.
// Called on each design create with the display name (req.body.title).
exports.incrementItemUsage = async (name) => {
  if (isGenericName(name)) return;
  await cache.zincrby(USAGE_ITEMS_KEY, String(name).trim(), 1);
  // Drop the resolved cache so the rail reflects the new count promptly.
  cache.del(POPULAR_CACHE_KEY).catch(() => {});
};

// Seed/fallback source: design history grouped by the stored title (the display
// name shown to the user). Used to bootstrap the counter and when Redis is down.
async function popularNamesFromDb() {
  const rows = await Design.aggregate([
    { $match: { isDeleted: false, title: { $nin: [null, ''] } } },
    { $group: { _id: '$title', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 60 },
  ]);
  return rows
    .filter((r) => !isGenericName(r._id))
    .map((r) => [String(r._id).trim(), r.count]);
}

// Resolve [name, count] pairs into display items, attaching a thumbnail by
// matching the name to a specialty world (preferred) or a base style. A stale
// "X Design" title also matches the "X" base style. Names that resolve to
// neither are dropped (so the rail never shows an imageless tile).
async function resolvePopularItems(ranked) {
  const styleByName = {};
  DESIGN_STYLES.forEach((s) => { styleByName[s.name.toLowerCase()] = s; });

  const names = ranked.map(([name]) => name);
  const worlds = await SpecialtyWorld.find({
    name: { $in: names },
    isActive: true,
  }).select('id name thumbnailUrl imageUrl prompt').lean();
  const worldByName = {};
  worlds.forEach((w) => { worldByName[w.name.toLowerCase()] = w; });

  const items = [];
  for (const [name, count] of ranked) {
    const key = name.toLowerCase();
    const altKey = key.replace(/\s+design$/, '');
    const world = worldByName[key];
    const style = styleByName[key] || styleByName[altKey];

    if (world && (world.thumbnailUrl || world.imageUrl)) {
      items.push({
        name: world.name,
        imageUrl: world.thumbnailUrl || world.imageUrl,
        count,
        kind: 'world',
        worldId: world.id,
        prompt: world.prompt,
      });
    } else if (style) {
      items.push({
        name: style.name,
        imageUrl: style.imageUrl,
        count,
        kind: 'style',
        styleId: style.id,
      });
    }
  }
  return items;
}

// @desc    App-wide most-used styles/worlds by actual name (home rail)
// @route   GET /api/styles/popular
// @access  Public
exports.getPopular = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 30);

    const cached = await cache.get(POPULAR_CACHE_KEY);
    if (cached) {
      const data = cached.slice(0, limit);
      return res.status(200).json({ success: true, data, count: data.length });
    }

    let ranked = await cache.zrevrangeWithScores(USAGE_ITEMS_KEY);
    if (ranked === null) {
      ranked = await popularNamesFromDb(); // Redis unavailable
    } else if (ranked.length === 0) {
      const seed = await popularNamesFromDb(); // first run — seed from history
      if (seed.length > 0) await cache.zadd(USAGE_ITEMS_KEY, seed);
      ranked = seed;
    }

    // Resolve extra (some names won't map to a thumbnail), then trim.
    const resolved = await resolvePopularItems(ranked.slice(0, limit * 3));
    await cache.set(POPULAR_CACHE_KEY, resolved, 60);

    const data = resolved.slice(0, limit);
    res.status(200).json({ success: true, data, count: data.length });
  } catch (error) {
    next(error);
  }
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
