/**
 * Generate AI thumbnails for specialty world categories
 *
 * Uses fal.ai nano-banana to create category preview images,
 * uploads to S3, and updates MongoDB with the S3 URL.
 *
 * Usage:
 *   1. Set AWS_* env vars in .env (see below)
 *   2. Run: node scripts/generate-thumbnails.js
 *
 * Required .env:
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   AWS_REGION=eu-central-1
 *   AWS_S3_BUCKET=architectural-ai-thumbnails
 *   FAL_API_KEYS=...
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { fal } = require('@fal-ai/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const http = require('http');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');

// Config
const LIMIT = 5; // Only generate 5 thumbnails per run
const MODEL = 'fal-ai/nano-banana'; // text-to-image for thumbnails

// Initialize fal.ai
const falKey = (process.env.FAL_API_KEYS || '').split(',')[0].trim();
fal.config({ credentials: falKey });

// Initialize S3
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET;

/**
 * Download image from URL as Buffer
 */
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

/**
 * Upload buffer to S3 and return public URL
 */
async function uploadToS3(buffer, key) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
  }));

  return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'eu-central-1'}.amazonaws.com/${key}`;
}

/**
 * Generate thumbnail with fal.ai
 */
async function generateThumbnail(world) {
  const prompt = `Interior design preview thumbnail, ${world.prompt}, photorealistic, high quality, professional interior photography, 4K, detailed`;

  console.log(`  🎨 Generating: "${world.name}"...`);

  const result = await fal.subscribe(MODEL, {
    input: {
      prompt,
      num_images: 1,
      image_size: 'square',
    },
    logs: false,
  });

  const data = result?.data || result;
  const images = data?.images || [];
  const imageUrl = images[0]?.url;

  if (!imageUrl) {
    throw new Error('No image URL returned from fal.ai');
  }

  return imageUrl;
}

/**
 * Main: generate thumbnails for first N worlds without custom thumbnails
 */
async function main() {
  // Check S3 config
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !BUCKET) {
    console.error('❌ AWS S3 not configured. Add these to .env:');
    console.error('   AWS_ACCESS_KEY_ID=...');
    console.error('   AWS_SECRET_ACCESS_KEY=...');
    console.error('   AWS_REGION=eu-central-1');
    console.error('   AWS_S3_BUCKET=architectural-ai-thumbnails');
    console.error('');
    console.error('Steps to set up:');
    console.error('  1. AWS Console → S3 → Create Bucket (public read)');
    console.error('  2. AWS Console → IAM → Create User with S3 access');
    console.error('  3. Create Access Key and add to .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('📦 Connected to MongoDB');

  // Find worlds that still use unsplash URLs (not custom generated)
  const worlds = await SpecialtyWorld.find({
    imageUrl: { $regex: /unsplash\.com/ },
    isActive: true,
  })
    .sort({ isFeatured: -1 })
    .limit(LIMIT)
    .lean();

  console.log(`🎯 Found ${worlds.length} worlds to generate thumbnails for\n`);

  let success = 0;
  let failed = 0;

  for (const world of worlds) {
    try {
      // Generate with fal.ai
      const falUrl = await generateThumbnail(world);

      // Download the generated image
      console.log(`  📥 Downloading generated image...`);
      const buffer = await downloadImage(falUrl);

      // Upload to S3
      const s3Key = `thumbnails/${world.id}.jpg`;
      console.log(`  ☁️  Uploading to S3: ${s3Key}`);
      const s3Url = await uploadToS3(buffer, s3Key);

      // Update MongoDB
      await SpecialtyWorld.updateOne(
        { id: world.id },
        { $set: { imageUrl: s3Url } }
      );

      console.log(`  ✅ ${world.name} → ${s3Url}\n`);
      success++;
    } catch (error) {
      console.error(`  ❌ ${world.name} failed: ${error.message}\n`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${success} success, ${failed} failed`);
  console.log(`💡 Run again to generate more (processes ${LIMIT} per run)`);

  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
