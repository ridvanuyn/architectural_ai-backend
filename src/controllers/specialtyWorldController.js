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
      'tags',
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

// @desc    Search worlds with pagination + related suggestions
// @route   GET /api/worlds/search
// @access  Public
exports.searchWorlds = async (req, res, next) => {
  try {
    const { q = '', page = 1, limit = 20, category } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const trimmedQ = q.trim();

    const projection = { name: 1, id: 1, description: 1, category: 1, imageUrl: 1, thumbnailUrl: 1, prompt: 1, price: 1, isProOnly: 1, isFeatured: 1, createdAt: 1 };

    const buildPayload = async () => {
      const query = { isActive: true };

      if (trimmedQ) {
        const escaped = trimmedQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

      const [worlds, total] = await Promise.all([
        SpecialtyWorld.find(query, projection)
          .sort({ isFeatured: -1, sortOrder: 1, createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        SpecialtyWorld.countDocuments(query),
      ]);

      const payload = {
        count: worlds.length,
        total,
        page: pageNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
        data: worlds,
      };

      // Related suggestions — only when caller provided a query string.
      if (trimmedQ) {
        const excludeIds = worlds.map((w) => w._id);
        // Prefer the first match's category; fall back to the query filter.
        const relatedCategory = worlds[0]?.category || category;
        const relatedQuery = { isActive: true };
        if (excludeIds.length) relatedQuery._id = { $nin: excludeIds };
        if (relatedCategory) {
          relatedQuery.category = relatedCategory;
        } else {
          // No matches AND no category hint → fall back to featured worlds so
          // the user sees *something* instead of an empty suggestions strip.
          relatedQuery.isFeatured = true;
        }

        payload.related = await SpecialtyWorld.find(relatedQuery, projection)
          .sort({ isFeatured: -1, sortOrder: 1 })
          .limit(10)
          .lean();
      }

      return payload;
    };

    // Only cache keyed searches; skip caching when q is empty (users browsing
    // the full list without a query are already served by /worlds).
    let payload;
    if (trimmedQ) {
      const cacheKey = `worlds:search:q=${trimmedQ.toLowerCase()}:cat=${category || ''}:p=${pageNum}:l=${limitNum}:v1`;
      payload = await cache.remember(cacheKey, 60, buildPayload);
    } else {
      payload = await buildPayload();
    }

    res.status(200).json({
      success: true,
      ...payload,
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

// @desc    Get aggregated tag cloud (categories + franchises)
// @route   GET /api/worlds/tags
// @access  Public
exports.getTags = async (req, res, next) => {
  try {
    const tags = await cache.remember('worlds:tags:v1', 3600, async () => {
      const all = await SpecialtyWorld.find({ isActive: true })
        .select('id category')
        .lean();

      // Category tags — directly map the enum counts.
      const byCategory = {};
      for (const w of all) {
        if (!w.category) continue;
        byCategory[w.category] = (byCategory[w.category] || 0) + 1;
      }
      const categoryTags = Object.entries(byCategory).map(([tag, count]) => ({
        tag,
        type: 'category',
        count,
        label: tag.charAt(0).toUpperCase() + tag.slice(1),
      }));

      // Franchise tags — derive from id kebab-prefix. Try both 1- and 2-segment
      // prefixes; worlds with a shared franchise (>= 3 items) become a tag.
      const franchiseCount = {};
      for (const w of all) {
        if (!w.id) continue;
        const segs = w.id.split('-');
        if (segs.length < 2) continue;
        const prefix1 = segs[0];
        const prefix2 = segs.slice(0, 2).join('-');
        franchiseCount[prefix1] = (franchiseCount[prefix1] || 0) + 1;
        if (prefix2 !== prefix1) {
          franchiseCount[prefix2] = (franchiseCount[prefix2] || 0) + 1;
        }
      }
      const franchiseTags = Object.entries(franchiseCount)
        .filter(([, count]) => count >= 3)
        .map(([tag, count]) => ({
          tag,
          type: 'franchise',
          count,
          label: tag
            .split('-')
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' '),
        }));

      return [...categoryTags, ...franchiseTags].sort((a, b) => b.count - a.count);
    });

    res.status(200).json({ success: true, data: tags });
  } catch (error) {
    next(error);
  }
};

// Admin veya /create-world akışı yeni world eklediğinde çağrılır. Tüm
// worlds:* cache key'lerini temizler. cacheService'de pattern-del yok; bu
// yüzden bilinen sabit key'leri tek tek siliyoruz. Category/pagination ve
// search kombinasyonlarındaki türev key'ler TTL dolunca kendiliğinden
// temizlenir — acil invalidasyon için buraya manuel key ekleyebilirsiniz.
exports.invalidateWorldsCache = async () => {
  await cache.del(
    'worlds:all:v1',
    'worlds:all:v1:featured',
    'worlds:featured:v1',
    'worlds:tags:v1',
  );
  // Search cache'leri query string'e göre splinterlendiği için TTL'e bırak.
};

