const multer = require('multer');
const { IMAGE_SETTINGS } = require('../config/constants');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter — accept common image types + HEIC from iPhones
const ACCEPTED_TYPES = [
  ...IMAGE_SETTINGS.ALLOWED_FORMATS,
  'image/heic',
  'image/heif',
  'application/octet-stream', // fallback when mime is unknown
];

const fileFilter = (req, file, cb) => {
  if (ACCEPTED_TYPES.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${ACCEPTED_TYPES.join(', ')}`), false);
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: IMAGE_SETTINGS.MAX_SIZE_MB * 1024 * 1024, // Convert MB to bytes
  },
});

module.exports = upload;

