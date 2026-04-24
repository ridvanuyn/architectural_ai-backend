/**
 * Backfill `thumbnailUrl`, `originalUrl`, `imageVersion` for pre-CDN
 * Design and SpecialtyWorld records.
 *
 * Idempotent — re-running is safe; only unset fields are written.
 *
 * Usage:
 *   node scripts/backfill-cdn-urls.js            # dry-run, counts only
 *   node scripts/backfill-cdn-urls.js --apply    # actually write
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Design = require('../src/models/Design');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');

const APPLY = process.argv.includes('--apply');

async function backfillDesigns() {
  // Every completed design with a generated URL but missing originalUrl
  // — `thumbnailUrl` defaults to the same URL until the script re-runs
  // thumbnail generation on it.
  const query = {
    'generatedImage.url': { $exists: true, $ne: null },
    $or: [
      { 'generatedImage.originalUrl': { $exists: false } },
      { 'generatedImage.thumbnailUrl': { $exists: false } },
      { 'generatedImage.imageVersion': { $exists: false } },
    ],
  };

  const total = await Design.countDocuments(query);
  console.log(`[Design] ${total} records need backfill`);

  if (!APPLY) return;

  let done = 0;
  const cursor = Design.find(query).cursor();
  for await (const design of cursor) {
    const url = design.generatedImage.url;
    design.generatedImage.originalUrl ||= url;
    design.generatedImage.thumbnailUrl ||= url;
    if (design.generatedImage.imageVersion == null) {
      design.generatedImage.imageVersion = 1;
    }
    await design.save();
    done++;
    if (done % 100 === 0) console.log(`  … ${done}/${total}`);
  }
  console.log(`[Design] Updated ${done} records`);
}

async function backfillWorlds() {
  const query = {
    imageUrl: { $exists: true, $ne: null },
    $or: [
      { thumbnailUrl: { $exists: false } },
      { imageVersion: { $exists: false } },
    ],
  };

  const total = await SpecialtyWorld.countDocuments(query);
  console.log(`[SpecialtyWorld] ${total} records need backfill`);

  if (!APPLY) return;

  const result = await SpecialtyWorld.updateMany(
    { thumbnailUrl: { $exists: false } },
    [{ $set: { thumbnailUrl: '$imageUrl' } }],
  );
  console.log(`[SpecialtyWorld] Set thumbnailUrl on ${result.modifiedCount}`);

  const versionResult = await SpecialtyWorld.updateMany(
    { imageVersion: { $exists: false } },
    { $set: { imageVersion: 1 } },
  );
  console.log(`[SpecialtyWorld] Set imageVersion on ${versionResult.modifiedCount}`);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`📦 Connected; mode: ${APPLY ? 'APPLY' : 'DRY-RUN (no writes)'}`);

  await backfillDesigns();
  await backfillWorlds();

  await mongoose.disconnect();
  console.log('✅ Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
