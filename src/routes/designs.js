const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadImage,
  getUploadUrl,
  createDesign,
  getDesigns,
  getDesign,
  toggleFavorite,
  deleteDesign,
  getDesignStatus,
  getDesignStats,
  retryDesign,
  downloadDesign,
} = require('../controllers/designController');

// All routes require authentication
router.use(protect);

// Image upload routes
router.post('/upload', upload.single('image'), uploadImage);
router.get('/upload-url', getUploadUrl);

// Design routes
router.route('/')
  .get(getDesigns)
  .post(createDesign);

router.get('/stats', getDesignStats);

router.route('/:id')
  .get(getDesign)
  .delete(deleteDesign);

router.get('/:id/status', getDesignStatus);
router.put('/:id/favorite', toggleFavorite);
router.post('/:id/retry', retryDesign);
router.get('/:id/download/:type', downloadDesign);

module.exports = router;
