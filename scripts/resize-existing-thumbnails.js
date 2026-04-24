/**
 * Var olan tek-boyut thumbnail'ları (thumbnails/<id>.jpg) 3 boyuta dönüştürür:
 *   thumbnails/<id>/256.jpg
 *   thumbnails/<id>/512.jpg
 *   thumbnails/<id>/1024.jpg
 *
 * fal.ai'yi çağırmaz — yalnızca S3'ten mevcut görseli indirip sharp ile
 * resize edip yükler. Bucket'ta `thumbnails/<id>.jpg` olan her SpecialtyWorld
 * için çalışır. Idempotent — hedef key zaten varsa atlar (üzerine yazmaz).
 *
 * Ayrıca `SpecialtyWorld.thumbnailUrl` ve `imageVersion` alanlarını günceller
 * (Flutter helper'ının legacy rewrite'ını by-pass etmek için).
 *
 * Usage:
 *   node scripts/resize-existing-thumbnails.js           # dry-run
 *   node scripts/resize-existing-thumbnails.js --apply   # uygula
 *   node scripts/resize-existing-thumbnails.js --apply --force  # hedef key varsa üzerine yaz
 */
require('dotenv').config();

const mongoose = require('mongoose');
const sharp = require('sharp');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');
const { thumbnailUrl: cdnThumbnailUrl } = require('../src/utils/cdnUrl');

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

const BUCKET =
  process.env.AWS_S3_BUCKET_THUMBNAILS || 'architectural-ai-thumbnails';
const REGION = process.env.AWS_REGION || 'eu-central-1';
const SIZES = [256, 512, 1024];

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function existsOnS3(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 404 || err.name === 'NotFound') {
      return false;
    }
    throw err;
  }
}

async function processWorld(world) {
  const legacyKey = `thumbnails/${world.id}.jpg`;

  // 1. Kaynak var mı?
  if (!(await existsOnS3(legacyKey))) {
    return { id: world.id, status: 'skip', reason: 'legacy key missing' };
  }

  // 2. Hedefler zaten üretilmiş mi?
  if (!FORCE) {
    const hits = await Promise.all(
      SIZES.map((s) => existsOnS3(`thumbnails/${world.id}/${s}.jpg`)),
    );
    if (hits.every(Boolean)) {
      // Bucket hazır, DB alanını yine de güncelle (flutter hatasız olsun).
      const version = world.imageVersion || 1;
      const thumb512 = cdnThumbnailUrl(world.id, 512, version);
      if (APPLY && world.thumbnailUrl !== thumb512) {
        await SpecialtyWorld.updateOne(
          { _id: world._id },
          { $set: { thumbnailUrl: thumb512 } },
        );
      }
      return { id: world.id, status: 'exists', thumb512 };
    }
  }

  if (!APPLY) {
    return { id: world.id, status: 'would-resize' };
  }

  // 3. Kaynağı indir
  const sourceObj = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: legacyKey }),
  );
  const buffer = await streamToBuffer(sourceObj.Body);

  // 4. Paralel resize + upload
  await Promise.all(
    SIZES.map(async (size) => {
      const resized = await sharp(buffer)
        .rotate()
        .resize(size, size, { fit: 'cover', withoutEnlargement: false })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: `thumbnails/${world.id}/${size}.jpg`,
          Body: resized,
          ContentType: 'image/jpeg',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    }),
  );

  // 5. DB güncelle
  const version = Date.now();
  const thumb512 = cdnThumbnailUrl(world.id, 512, version);
  await SpecialtyWorld.updateOne(
    { _id: world._id },
    { $set: { thumbnailUrl: thumb512, imageVersion: version } },
  );

  return { id: world.id, status: 'resized', thumb512 };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(
    `→ resize-existing-thumbnails ${APPLY ? '(APPLY)' : '(DRY-RUN)'}${FORCE ? ' (FORCE)' : ''}`,
  );
  console.log(`  bucket: ${BUCKET} | region: ${REGION}\n`);

  const worlds = await SpecialtyWorld.find({
    imageUrl: { $regex: `${BUCKET}\\.s3\\.` },
    isActive: true,
  })
    .sort({ _id: 1 })
    .lean();

  console.log(`${worlds.length} world bucket'ta thumbnail'e sahip\n`);

  const results = { resized: 0, exists: 0, skip: 0, 'would-resize': 0, error: 0 };

  for (const world of worlds) {
    try {
      const r = await processWorld(world);
      results[r.status] = (results[r.status] || 0) + 1;
      const label = r.status.padEnd(13);
      console.log(`  ${label} ${world.id}${r.reason ? ` (${r.reason})` : ''}`);
    } catch (err) {
      results.error++;
      console.error(`  ERROR         ${world.id}: ${err.message}`);
    }
  }

  console.log('\n📊 Özet:');
  for (const [k, v] of Object.entries(results)) {
    if (v > 0) console.log(`   ${k}: ${v}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
