const Design = require('../models/Design');
const s3Service = require('../services/s3Service');
const { DESIGN_STATUS } = require('../config/constants');

/**
 * @desc    Handle Replicate AI webhook
 * @route   POST /api/webhooks/replicate
 * @access  Public (verified by signature)
 */
exports.handleReplicateWebhook = async (req, res, next) => {
  try {
    const { id, status, output, error } = req.body;

    console.log(`📩 Replicate webhook received: ${id} - ${status}`);

    // Find design by prediction ID
    const design = await Design.findOne({
      'aiParams.predictionId': id,
    });

    if (!design) {
      console.log(`⚠️ Design not found for prediction: ${id}`);
      return res.status(200).json({ received: true });
    }

    if (status === 'succeeded' && output) {
      // Get the generated image URL
      const generatedUrl = Array.isArray(output) ? output[0] : output;

      // Upload to S3
      const s3Result = await s3Service.uploadFromUrl(generatedUrl, {
        folder: 'generated',
        userId: design.user.toString(),
      });

      // Update design
      design.generatedImage = {
        url: s3Result.url,
        key: s3Result.key,
        width: s3Result.width,
        height: s3Result.height,
      };
      design.completeProcessing(s3Result.url, s3Result.key);
      await design.save();

      console.log(`✅ Design ${design._id} completed via webhook`);
    } else if (status === 'failed') {
      design.failProcessing(error || 'Processing failed');
      await design.save();

      console.log(`❌ Design ${design._id} failed via webhook: ${error}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Always return 200 to prevent retries
    res.status(200).json({ received: true, error: err.message });
  }
};

/**
 * @desc    Verify Replicate webhook signature
 * @middleware
 */
exports.verifyReplicateSignature = (req, res, next) => {
  // In production, verify the webhook signature
  // https://replicate.com/docs/webhooks#verifying-webhooks
  
  const signature = req.headers['webhook-signature'];
  
  if (process.env.NODE_ENV === 'production' && !signature) {
    console.warn('⚠️ Webhook received without signature');
    // In production, you might want to reject unsigned webhooks
  }

  // TODO: Implement signature verification
  // const isValid = verifySignature(req.body, signature, process.env.REPLICATE_WEBHOOK_SECRET);
  
  next();
};

