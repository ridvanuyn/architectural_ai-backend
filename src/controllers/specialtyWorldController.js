const SpecialtyWorld = require('../models/SpecialtyWorld');
const es = require('../services/elasticsearchService');

// @desc    Get all specialty worlds
// @route   GET /api/worlds
// @access  Public
exports.getWorlds = async (req, res, next) => {
  try {
    const { category } = req.query;
    
    const query = { isActive: true };
    if (category) {
      query.category = category;
    }

    const worlds = await SpecialtyWorld.find(query)
      .sort({ isFeatured: -1, sortOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: worlds.length,
      data: worlds,
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
    const worlds = await SpecialtyWorld.find({ 
      isActive: true,
      isFeatured: true,
    }).sort({ sortOrder: 1 }).limit(6);

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

// @desc    Search worlds with pagination (Elasticsearch-first, MongoDB fallback)
// @route   GET /api/worlds/search
// @access  Public
exports.searchWorlds = async (req, res, next) => {
  try {
    const { q = '', page = 1, limit = 20, category } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    // Try Elasticsearch first
    if (es.isReady()) {
      try {
        const result = await es.search({
          query: q,
          page: pageNum,
          limit: limitNum,
          category: category || null,
        });

        return res.status(200).json({
          success: true,
          count: result.hits.length,
          total: result.total,
          page: pageNum,
          totalPages: Math.ceil(result.total / limitNum),
          data: result.hits,
          engine: 'elasticsearch',
        });
      } catch (esErr) {
        console.warn('ES search failed, falling back to MongoDB:', esErr.message);
      }
    }

    // MongoDB fallback
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
        .sort({ isFeatured: -1, sortOrder: 1, name: 1 })
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
      engine: 'mongodb',
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

