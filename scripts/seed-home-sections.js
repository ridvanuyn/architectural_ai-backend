/**
 * Seed the "Explore Your Home" house-section worlds (ADDITIVE / upsert only).
 *
 * - Connects with MONGODB_URI.
 * - Loads the array from scripts/worlds/home-sections.js.
 * - For each, does updateOne({ id }, { $set: {...} }, { upsert: true }).
 * - Strips `thumbnailPrompt` (not in the SpecialtyWorld schema; only used by
 *   the thumbnail generator).
 *
 * SAFETY: never deletes anything; only touches `home-*` ids defined here.
 *
 * Usage: node scripts/seed-home-sections.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');
const worlds = require('./worlds/home-sections');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`🔌 Connected. Upserting ${worlds.length} home-section world(s)...\n`);

  let upserts = 0;
  for (const w of worlds) {
    // thumbnailPrompt is generator-only; keep it out of Mongo.
    const { thumbnailPrompt, ...doc } = w;

    const res = await SpecialtyWorld.updateOne(
      { id: doc.id },
      { $set: doc },
      { upsert: true },
    );

    const action = res.upsertedCount ? 'inserted' : 'updated';
    console.log(`  ✅ ${action.padEnd(8)} ${doc.id.padEnd(20)} (${doc.name})`);
    upserts++;
  }

  console.log(`\n📊 Done. ${upserts} upsert(s) processed.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
