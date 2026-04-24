const express = require('express');
const router = express.Router();
const publicCache = require('../middleware/publicCache');
const {
  getWorlds,
  getWorld,
  getFeaturedWorlds,
  getWorldsByCategory,
  getCategories,
  searchWorlds,
} = require('../controllers/specialtyWorldController');

// All routes are public
router.get('/', publicCache(600), getWorlds);
router.get('/search', publicCache(60), searchWorlds);
router.get('/featured', publicCache(600), getFeaturedWorlds);
router.get('/categories', getCategories);
router.get('/category/:category', publicCache(600), getWorldsByCategory);
router.get('/:id', getWorld);

module.exports = router;

