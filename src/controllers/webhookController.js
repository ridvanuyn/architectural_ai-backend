const pLimit = require('p-limit');
const Design = require('../models/Design');
const s3Service = require('../services/s3Service');
const { DESIGN_STATUS } = require('../config/constants');

// Webhook'a iş geldiğinde ağır kısım sharp(4x)+S3(4x) upload'dur. fal aynı
// anda birçok webhook gönderebilir; tek vCPU'da eşzamanlı sharp patlamasını
// (OOM riski) sınırlamak için ayrı, küçük bir semafor. fal'ın bağlantısını
// bekletmiyoruz — webhook hemen 200 döner, işleme arkada bu limit altında akar.
const webhookLimit = pLimit(parseInt(process.env.WEBHOOK_CONCURRENCY, 10) || 3);

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
 * @desc    Verify the fal webhook shared secret.
 * @middleware
 *
 * fal calls the exact URL we hand it at submit time, so we append a secret
 * query param (?secret=...) and reject any callback that doesn't carry it.
 * Combined with the unguessable request_id lookup this keeps the public
 * endpoint from being driven by random POSTs. If FAL_WEBHOOK_SECRET is unset
 * we skip the check (eases rollout) but log a warning.
 * Future hardening: fal also ED25519-signs webhooks — verify via their JWKS.
 */
exports.verifyFalWebhook = (req, res, next) => {
  const secret = process.env.FAL_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('⚠️ fal webhook: FAL_WEBHOOK_SECRET not set — skipping verification');
    return next();
  }
  if (req.query.secret !== secret) {
    console.warn('⚠️ fal webhook: bad/missing secret — rejected');
    return res.status(401).json({ received: false });
  }
  next();
};

/**
 * @desc    Handle fal.ai async queue webhook
 * @route   POST /api/webhooks/fal
 * @access  Public (verified by shared secret)
 *
 * Responds 200 immediately, then does the S3/sharp upload off the request
 * path under webhookLimit. Idempotent: a design already COMPLETED is ignored,
 * and on S3 failure we fall back to fal's (temporary) URL so the design never
 * gets stuck in PROCESSING.
 */
exports.handleFalWebhook = async (req, res, next) => {
  // Ack fast — never hold fal's connection during sharp/S3.
  res.status(200).json({ received: true });

  const body = req.body || {};
  const requestId = body.request_id || body.requestId;
  const status = body.status; // 'OK' | 'ERROR'
  const payload = body.payload;
  const errMsg = body.error || body.payload_error;

  if (!requestId) {
    console.warn('⚠️ fal webhook: missing request_id');
    return;
  }

  try {
    const design = await Design.findOne({ 'aiParams.predictionId': requestId });
    if (!design) {
      console.log(`⚠️ fal webhook: design not found for request ${requestId}`);
      return;
    }
    if (design.status === DESIGN_STATUS.COMPLETED) {
      return; // already handled — idempotent
    }

    const generatedUrl =
      status === 'OK' &&
      (payload?.images?.[0]?.url || payload?.image?.url || null);

    if (!generatedUrl) {
      design.failProcessing(errMsg || 'fal generation failed');
      await design.save();
      console.log(`❌ [design:${design._id}] failed via fal webhook: ${errMsg || 'no image'}`);
      return;
    }

    await webhookLimit(async () => {
      let finalUrl = generatedUrl;
      let finalKey = null;
      let width = null;
      let height = null;
      let thumbnailUrlVariant = null;

      // Try S3; on failure keep fal's URL so the design still completes.
      try {
        const s3Result = await s3Service.uploadFromUrl(generatedUrl, {
          folder: 'generated',
          userId: design.user.toString(),
          thumbnailId: design._id.toString(),
        });
        if (s3Result && s3Result.url) {
          finalUrl = s3Result.url;
          finalKey = s3Result.key;
          width = s3Result.width;
          height = s3Result.height;
          thumbnailUrlVariant = s3Result.thumbnailUrl || null;
        }
      } catch (s3Error) {
        console.warn(`⚠️ [design:${design._id}] webhook S3 upload failed, keeping fal URL: ${s3Error.message}`);
        if (s3Error.stack) console.warn(s3Error.stack);
      }

      design.generatedImage = {
        url: finalUrl,
        key: finalKey,
        width,
        height,
        fallbackUrl: generatedUrl,
        originalUrl: finalUrl,
        thumbnailUrl: thumbnailUrlVariant || finalUrl,
        imageVersion: 1,
      };
      design.completeProcessing(finalUrl, finalKey);
      await design.save();
      console.log(`✅ [design:${design._id}] completed via fal webhook (${finalUrl})`);
    });
  } catch (err) {
    console.error('fal webhook processing error:', err.message);
    if (err.stack) console.error(err.stack);
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

