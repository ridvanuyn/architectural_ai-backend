/**
 * Generate AI thumbnails in batches
 * Usage: node scripts/generate-thumbnails-batch.js <offset> <limit>
 * Example: node scripts/generate-thumbnails-batch.js 0 10
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { fal } = require('@fal-ai/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');
const { thumbnailUrl } = require('../src/utils/cdnUrl');

const BUCKET = process.env.AWS_S3_BUCKET_THUMBNAILS || 'architectural-ai-thumbnails';
const REGION = process.env.AWS_REGION || 'eu-central-1';
const MODEL = 'fal-ai/nano-banana';
const SIZES = [256, 512, 1024];

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

      // Pre-generate 3 sizes (256/512/1024) and write to
      // thumbnails/<id>/<size>.jpg — CloudFront serves these with long TTL.
      const variants = await Promise.all(
        SIZES.map(async (size) => {
          const resized = await sharp(buffer)
            .rotate()
            .resize(size, size, { fit: 'cover', withoutEnlargement: false })
            .jpeg({ quality: 82, mozjpeg: true })
            .toBuffer();
          const key = `thumbnails/${world.id}/${size}.jpg`;
          await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: resized,
            ContentType: 'image/jpeg',
            CacheControl: 'public, max-age=31536000, immutable',
          }));
          return { size, key, bytes: resized.length };
        }),
      );

      const version = Date.now();
      const thumb512 = thumbnailUrl(world.id, 512, version);
      const legacyKey = `thumbnails/${world.id}.jpg`;
      // Write the 512 variant to the legacy path too, so older app builds
      // that hit `thumbnails/<id>.jpg` directly keep working.
      const legacy512 = await sharp(buffer)
        .rotate()
        .resize(512, 512, { fit: 'cover', withoutEnlargement: false })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: legacyKey,
        Body: legacy512,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }));

      await SpecialtyWorld.updateOne(
        { id: world.id },
        {
          $set: {
            imageUrl: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${legacyKey}`,
            thumbnailUrl: thumb512,
            imageVersion: version,
          },
        },
      );

      const sizesLog = variants.map((v) => `${v.size}:${Math.round(v.bytes / 1024)}KB`).join(' ');
      console.log(`  ✅ ${world.name} → ${sizesLog} | ${thumb512}`);
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
