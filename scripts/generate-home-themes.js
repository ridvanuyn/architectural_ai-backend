/**
 * Generate "Explore Your Home" THEME thumbnails (image-to-image).
 *
 * For one house section, upserts its style themes into MongoDB and produces a
 * thumbnail for each by running the section's existing base room image through
 * fal.ai's edit model with the theme's style. Uploads 256/512/1024 to S3 and
 * serves via CloudFront. STRICTLY ADDITIVE — only touches `home-theme-*` docs
 * and `thumbnails/home-theme-*` S3 keys.
 *
 * Usage: node scripts/generate-home-themes.js --section=kitchen
 *        node scripts/generate-home-themes.js            (all sections)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { fal } = require('@fal-ai/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');
const { getThemes } = require('./worlds/home-themes');

const BUCKET = process.env.AWS_S3_BUCKET_THUMBNAILS || process.env.AWS_S3_BUCKET || 'architectural-ai-thumbnails';
const REGION = process.env.AWS_REGION || 'eu-central-1';
const CDN = process.env.CDN_BASE_URL || 'https://d31qbpz1e19hhx.cloudfront.net';
const EDIT_MODEL = 'fal-ai/nano-banana-2/edit';
const SIZES = [256, 512, 1024];

const falKey = (process.env.FAL_API_KEYS || process.env.FAL_KEY || '').split(',')[0].trim();
fal.config({ credentials: falKey });

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const sectionArg = (process.argv.find((a) => a.startsWith('--section=')) || '').split('=')[1] || null;
const SKIP_EXISTING = process.argv.includes('--skip-existing');

const cdnSize = (id, size) => `${CDN}/thumbnails/${id}/${size}.jpg`;

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`download HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function headStatus(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => { res.resume(); resolve(res.statusCode); }).on('error', () => resolve(0));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// CloudFront can briefly negative-cache a freshly uploaded key (403) before it
// propagates — retry a few times so the report reflects the real 200.
async function verify(url, tries = 6) {
  let status = 0;
  for (let i = 0; i < tries; i++) {
    status = await headStatus(url);
    if (status === 200) return 200;
    await sleep(2500);
  }
  return status;
}

async function uploadVariants(buffer, id) {
  await Promise.all(SIZES.map(async (size) => {
    const resized = await sharp(buffer)
      .rotate()
      .resize(size, size, { fit: 'cover', withoutEnlargement: false })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `thumbnails/${id}/${size}.jpg`,
      Body: resized,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
  }));
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const themes = getThemes(sectionArg);
  console.log(`[home-themes${sectionArg ? `:${sectionArg}` : ''}] ${themes.length} themes\n`);

  let ok = 0, fail = 0;
  const report = [];

  for (const t of themes) {
    try {
      // 1) Upsert the world doc first (additive). Strip generator-only fields.
      await SpecialtyWorld.updateOne(
        { id: t.id },
        {
          $set: {
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
            prompt: t.prompt,
            price: 0,
            isProOnly: false,
            isActive: true,
            sortOrder: t.sortOrder,
            isFeatured: t.sortOrder === 1,
          },
          $setOnInsert: { imageUrl: t.baseImageUrl },
        },
        { upsert: true },
      );

      // Skip themes whose thumbnail already serves 200 (idempotent re-runs).
      if (SKIP_EXISTING && (await headStatus(cdnSize(t.id, 512))) === 200) {
        await SpecialtyWorld.updateOne(
          { id: t.id },
          { $set: { imageUrl: cdnSize(t.id, 1024), thumbnailUrl: cdnSize(t.id, 512) } },
        );
        report.push({ id: t.id, url: cdnSize(t.id, 512), status: '200 (skip)' });
        console.log(`  ⏭️  ${t.id} already exists`);
        ok++;
        continue;
      }

      // 2) Image-to-image edit of the section's base room image.
      console.log(`  🎨 ${t.id} (${t.name})...`);
      const result = await fal.subscribe(EDIT_MODEL, {
        input: { prompt: t.editPrompt, image_urls: [t.baseImageUrl], num_images: 1, output_format: 'jpeg' },
        logs: false,
      });
      const genUrl = result?.data?.images?.[0]?.url || result?.images?.[0]?.url;
      if (!genUrl) throw new Error('fal returned no image');

      // 3) Download + upload 3 sizes to S3.
      const buffer = await downloadImage(genUrl);
      await uploadVariants(buffer, t.id);

      // 4) Point the world at the CloudFront URLs.
      const version = Date.now();
      await SpecialtyWorld.updateOne(
        { id: t.id },
        { $set: { imageUrl: cdnSize(t.id, 1024), thumbnailUrl: cdnSize(t.id, 512), imageVersion: version } },
      );

      const status = await verify(cdnSize(t.id, 512));
      report.push({ id: t.id, url: cdnSize(t.id, 512), status });
      console.log(`  ✅ ${t.id} → ${cdnSize(t.id, 512)} [${status}]`);
      ok++;
    } catch (e) {
      report.push({ id: t.id, url: cdnSize(t.id, 512), status: `ERR ${e.message}` });
      console.error(`  ❌ ${t.id}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n📊 done — ${ok} ok, ${fail} failed`);
  console.table(report);
  await mongoose.disconnect();
  if (fail) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
