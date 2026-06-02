/**
 * Generate cozy AI thumbnails for the "Explore Your Home" house-section worlds.
 *
 * Modeled on scripts/generate-thumbnails-batch.js, but:
 *  - Loads the worlds (with `thumbnailPrompt`) from scripts/worlds/home-sections.js.
 *  - For each, text-to-image via fal.ai nano-banana (square, 1 image) using the
 *    standalone `thumbnailPrompt` scene description.
 *  - Uploads 256/512/1024 variants via s3Service.generateThumbnailVariants()
 *    under thumbnails/<id>/<size>.jpg.
 *  - Updates the Mongo doc: thumbnailUrl = CloudFront 512, imageUrl = CloudFront
 *    1024, imageVersion = (existing||1)+1.
 *  - Resilient: per-world try/catch, continue on error, summary table at the end.
 *
 * SAFETY: only touches `home-*` ids and only writes S3 keys under the
 * thumbnails/home-* prefix.
 *
 * Usage: node scripts/generate-home-thumbnails.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { fal } = require('@fal-ai/client');
const https = require('https');
const http = require('http');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');
const { generateThumbnailVariants } = require('../src/services/s3Service');
const worlds = require('./worlds/home-sections');

const MODEL = 'fal-ai/nano-banana';
const SIZES = [256, 512, 1024];
const CDN_BASE = (process.env.CDN_BASE_URL || 'https://d31qbpz1e19hhx.cloudfront.net').replace(/\/+$/, '');

const falKey = (process.env.FAL_API_KEYS || process.env.FAL_KEY || '').split(',')[0].trim();
fal.config({ credentials: falKey });

// CloudFront URL for a pre-generated thumbnail variant.
const cfThumb = (id, size, version) =>
  `${CDN_BASE}/thumbnails/${id}/${size}.jpg${version != null ? `?v=${version}` : ''}`;

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`🔌 Connected. Generating thumbnails for ${worlds.length} home world(s)...\n`);

  const results = [];

  for (const world of worlds) {
    try {
      if (!world.id.startsWith('home-')) {
        throw new Error(`refusing non-home id: ${world.id}`);
      }
      console.log(`  🎨 ${world.name} (${world.id})...`);

      const result = await fal.subscribe(MODEL, {
        input: { prompt: world.thumbnailPrompt, num_images: 1, image_size: 'square' },
        logs: false,
      });

      const imageUrl = result?.data?.images?.[0]?.url || result?.images?.[0]?.url;
      if (!imageUrl) throw new Error('fal.ai returned no image URL');

      const buffer = await downloadImage(imageUrl);

      const variants = await generateThumbnailVariants(buffer, world.id, { sizes: SIZES });

      const existing = await SpecialtyWorld.findOne({ id: world.id }).select('imageVersion').lean();
      const version = (existing?.imageVersion || 1) + 1;

      const url512 = cfThumb(world.id, 512, version);
      const url1024 = cfThumb(world.id, 1024, version);

      await SpecialtyWorld.updateOne(
        { id: world.id },
        { $set: { thumbnailUrl: url512, imageUrl: url1024, imageVersion: version } },
      );

      const sizesLog = variants
        .map((v) => `${v.size}:${Math.round(v.bytes / 1024)}KB`)
        .join(' ');
      console.log(`  ✅ ${world.id} → ${sizesLog} | v${version}`);
      results.push({ id: world.id, url512, status: 'ok' });
    } catch (e) {
      console.error(`  ❌ ${world.id}: ${e.message}`);
      results.push({ id: world.id, url512: cfThumb(world.id, 512), status: `FAILED: ${e.message}` });
    }
  }

  console.log('\n📊 Summary:');
  for (const r of results) {
    console.log(`  ${r.status === 'ok' ? '✅' : '❌'} ${r.id.padEnd(20)} ${r.url512}`);
  }
  const ok = results.filter((r) => r.status === 'ok').length;
  console.log(`\n${ok}/${results.length} succeeded.`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
