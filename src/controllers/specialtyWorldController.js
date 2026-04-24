const SpecialtyWorld = require('../models/SpecialtyWorld');
const cache = require('../services/cacheService');

const WORLDS_CACHE_TTL = 600; // 10 minutes

// @desc    Get all specialty worlds
// @route   GET /api/worlds
// @access  Public
exports.getWorlds = async (req, res, next) => {
  try {
    const { category } = req.query;

    // Optional pagination: if the caller passes page or limit, serve a paged
    // response. Otherwise keep the legacy "return everything" behavior for
    // backwards compatibility — but cap at a safe upper bound so a bloated
    // catalog never blows up the response.
    const hasPaging = req.query.page != null || req.query.limit != null;
    const pageNum = Math.max(1, parseInt(req.query.page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(req.query.limit) || (hasPaging ? 20 : 500)));
    const skip = (pageNum - 1) * limitNum;

    // Cache key dahil edilen parametreler: category, page, limit. Bu üçü
    // request response'unu etkilediği için hepsi key'e girer. Farklı page'ler
    // farklı cache slot'ları olur; TTL 10 dk ve dataset küçük olduğu için
    // splintering riski kabul edilebilir seviyede.
    const keyParts = ['worlds:all:v1'];
    if (category) keyParts.push(`cat=${category}`);
    if (hasPaging) keyParts.push(`p=${pageNum}`, `l=${limitNum}`);
    const cacheKey = keyParts.join(':');

    const payload = await cache.remember(cacheKey, WORLDS_CACHE_TTL, async () => {
      const query = { isActive: true };
      if (category) {
        query.category = category;
      }

      const sort = { isFeatured: -1, sortOrder: 1, createdAt: -1 };

      const [worlds, total] = await Promise.all([
        SpecialtyWorld.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
        SpecialtyWorld.countDocuments(query),
      ]);

      return {
        count: worlds.length,
        total,
        page: pageNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
        data: worlds,
      };
    });

    res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single specialty world
// @route   GET /api/worlds/:id
// @access  Public
exports.getWorld = async (req, res, next) => {
  try {
    // Guard against route collisions: an older frontend (or a stale deploy
    // where dedicated routes didn't exist) may call /worlds/search, etc.
    // Return a 200 with an empty payload so the client doesn't crash; the
    // explicit dedicated routes will be hit when the server is up to date.
    const RESERVED_SEGMENTS = new Set([
      'search',
      'featured',
      'categories',
      'category',
      'specialty',
    ]);
    if (RESERVED_SEGMENTS.has(req.params.id)) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        message: `Route /worlds/${req.params.id} is reserved; no world lookup performed.`,
      });
    }

    const world = await SpecialtyWorld.findOne({
      id: req.params.id,
      isActive: true,
    });

    if (!world) {
      return res.status(404).json({
        success: false,
        message: 'Specialty world not found',
      });
    }

    res.status(200).json({
      success: true,
      data: world,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured worlds
// @route   GET /api/worlds/featured
// @access  Public
exports.getFeaturedWorlds = async (req, res, next) => {
  try {
    const worlds = await cache.remember('worlds:featured:v1', WORLDS_CACHE_TTL, async () => {
      return SpecialtyWorld.find({
        isActive: true,
        isFeatured: true,
      }).sort({ sortOrder: 1 }).limit(6).lean();
    });

    res.status(200).json({
      success: true,
      data: worlds,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get worlds by category
// @route   GET /api/worlds/category/:category
// @access  Public
exports.getWorldsByCategory = async (req, res, next) => {
  try {
    const worlds = await SpecialtyWorld.find({
      isActive: true,
      category: req.params.category,
    }).sort({ sortOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      data: worlds,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search worlds with pagination
// @route   GET /api/worlds/search
// @access  Public
exports.searchWorlds = async (req, res, next) => {
  try {
    const { q = '', page = 1, limit = 20, category } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = { isActive: true };

    if (q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { id: { $regex: escaped, $options: 'i' } },
        { prompt: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    const projection = { name: 1, id: 1, description: 1, category: 1, imageUrl: 1, prompt: 1, price: 1, isProOnly: 1, isFeatured: 1, createdAt: 1 };
    const [worlds, total] = await Promise.all([
      SpecialtyWorld.find(query, projection)
        .sort({ isFeatured: -1, sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SpecialtyWorld.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: worlds.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: worlds,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get categories
// @route   GET /api/worlds/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await SpecialtyWorld.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: categories.map(c => ({ category: c._id, count: c.count })),
    });
  } catch (error) {
    next(error);
  }
};

// Admin veya /create-world akışı yeni world eklediğinde çağrılır. Tüm
// worlds:* cache key'lerini temizler. cacheService'de pattern-del yok; bu
// yüzden bilinen sabit key'leri tek tek siliyoruz. Category/pagination
// kombinasyonlarındaki türev key'ler TTL (10 dk) dolunca kendiliğinden
// temizlenir — acil invalidasyon için buraya manuel key ekleyebilirsiniz.
exports.invalidateWorldsCache = async () => {
  await cache.del(
    'worlds:all:v1',
    'worlds:all:v1:featured',
    'worlds:featured:v1',
  );
};

