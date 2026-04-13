/**
 * Generate AI thumbnails in batches
 * Usage: node scripts/generate-thumbnails-batch.js <offset> <limit>
 * Example: node scripts/generate-thumbnails-batch.js 0 10
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { fal } = require('@fal-ai/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const http = require('http');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');

const BUCKET = 'architectural-ai-thumbnails';
const REGION = process.env.AWS_REGION || 'eu-central-1';
const MODEL = 'fal-ai/nano-banana';

const falKey = (process.env.FAL_API_KEYS || '').split(',')[0].trim();
fal.config({ credentials: falKey });

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const OFFSET = parseInt(process.argv[2] || '0');
const LIMIT = parseInt(process.argv[3] || '10');

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Find worlds that still use unsplash URLs (not yet AI-generated)
  const worlds = await SpecialtyWorld.find({
    imageUrl: { $regex: /unsplash\.com/ },
    isActive: true,
  })
    .sort({ isFeatured: -1, _id: 1 })
    .skip(OFFSET)
    .limit(LIMIT)
    .lean();

  console.log(`[Batch ${OFFSET}-${OFFSET + LIMIT}] Found ${worlds.length} worlds to process\n`);

  let success = 0, failed = 0;

  for (const world of worlds) {
    try {
      // Create a thumbnail prompt from the world's prompt
      const shortPrompt = `${world.prompt}, interior design preview, photorealistic, professional photography, high quality, 4K`;

      console.log(`  🎨 ${world.name}...`);

      const result = await fal.subscribe(MODEL, {
        input: { prompt: shortPrompt, num_images: 1, image_size: 'square' },
        logs: false,
      });

      const imageUrl = result?.data?.images?.[0]?.url || result?.images?.[0]?.url;
      if (!imageUrl) throw new Error('No image URL');

      const buffer = await downloadImage(imageUrl);
      const key = `thumbnails/${world.id}.jpg`;

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: key, Body: buffer, ContentType: 'image/jpeg',
      }));

      const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
      await SpecialtyWorld.updateOne({ id: world.id }, { $set: { imageUrl: s3Url } });

      console.log(`  ✅ → ${s3Url}`);
      success++;
    } catch (e) {
      console.error(`  ❌ ${world.name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n📊 [Batch ${OFFSET}-${OFFSET + LIMIT}] ${success} success, ${failed} failed`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
