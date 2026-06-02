const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const {
  createRequest,
  getRequests,
} = require('../controllers/requestController');

// Public submit — optionalAuth associates the user when a token is present but
// never rejects when absent/invalid.
router.post('/', optionalAuth, createRequest);

// Protected listing (admin/list use).
router.get('/', protect, getRequests);

module.exports = router;
