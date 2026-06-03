const express = require('express');
const router = express.Router();
const publicCache = require('../middleware/publicCache');
const {
  getStyles,
  getStyle,
  getRoomTypes,
  getRecommendations,
} = require('../controllers/styleController');

// All routes are public. Short edge cache so "Most Used Styles" reflects the
// live Redis usage counter promptly.
router.get('/', publicCache(60), getStyles);
router.get('/room-types', getRoomTypes);
router.get('/recommendations/:roomType', getRecommendations);
router.get('/:id', getStyle);

module.exports = router;

