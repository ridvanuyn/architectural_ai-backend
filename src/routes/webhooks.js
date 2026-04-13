const express = require('express');
const router = express.Router();
const {
  handleReplicateWebhook,
  verifyReplicateSignature,
} = require('../controllers/webhookController');

// Replicate AI webhook
router.post('/replicate', verifyReplicateSignature, handleReplicateWebhook);

module.exports = router;

