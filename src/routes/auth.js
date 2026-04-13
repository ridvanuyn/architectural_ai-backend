const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  oauthLogin,
  getMe,
  updateMe,
  completeOnboarding,
  refreshToken,
  logout,
  deleteAccount,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/oauth', oauthLogin);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.delete('/me', protect, deleteAccount);
router.post('/onboarding', protect, completeOnboarding);
router.post('/logout', protect, logout);

module.exports = router;

