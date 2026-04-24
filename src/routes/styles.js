const express = require('express');
const router = express.Router();
const publicCache = require('../middleware/publicCache');
const {
  getStyles,
  getStyle,
  getRoomTypes,
  getRecommendations,
} = require('../controllers/styleController');

// All routes are public
router.get('/', publicCache(300), getStyles);
router.get('/room-types', getRoomTypes);
router.get('/recommendations/:roomType', getRecommendations);
router.get('/:id', getStyle);

module.exports = router;

