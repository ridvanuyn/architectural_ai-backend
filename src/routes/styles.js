const express = require('express');
const router = express.Router();
const {
  getStyles,
  getStyle,
  getRoomTypes,
  getRecommendations,
} = require('../controllers/styleController');

// All routes are public
router.get('/', getStyles);
router.get('/room-types', getRoomTypes);
router.get('/recommendations/:roomType', getRecommendations);
router.get('/:id', getStyle);

module.exports = router;

