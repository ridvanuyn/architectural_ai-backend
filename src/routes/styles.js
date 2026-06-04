const express = require('express');
const router = express.Router();
const publicCache = require('../middleware/publicCache');
const {
  getStyles,
  getStyle,
  getPopular,
  getRoomTypes,
  getRecommendations,
} = require('../controllers/styleController');

// All routes are public. Short edge cache so "Most Used Styles" reflects the
// live Redis usage counter promptly.
router.get('/', publicCache(60), getStyles);
// App-wide most-used by actual name (styles + worlds). Must precede '/:id'.
router.get('/popular', publicCache(30), getPopular);
router.get('/room-types', getRoomTypes);
router.get('/recommendations/:roomType', getRecommendations);
router.get('/:id', getStyle);

module.exports = router;

