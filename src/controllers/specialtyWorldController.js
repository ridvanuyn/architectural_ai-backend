const SpecialtyWorld = require('../models/SpecialtyWorld');

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

