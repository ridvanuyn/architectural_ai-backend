const express = require('express');
const router = express.Router();
const {
  handleReplicateWebhook,
  verifyReplicateSignature,
  handleFalWebhook,
  verifyFalWebhook,
} = require('../controllers/webhookController');

// Replicate AI webhook
router.post('/replicate', verifyReplicateSignature, handleReplicateWebhook);

// fal.ai async queue webhook
router.post('/fal', verifyFalWebhook, handleFalWebhook);

module.exports = router;

