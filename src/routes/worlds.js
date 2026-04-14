const express = require('express');
const router = express.Router();
const {
  getWorlds,
  getWorld,
  getFeaturedWorlds,
  getWorldsByCategory,
  getCategories,
  searchWorlds,
} = require('../controllers/specialtyWorldController');

// All routes are public
router.get('/', getWorlds);
router.get('/search', searchWorlds);
router.get('/featured', getFeaturedWorlds);
router.get('/categories', getCategories);
router.get('/category/:category', getWorldsByCategory);
router.get('/:id', getWorld);

module.exports = router;

