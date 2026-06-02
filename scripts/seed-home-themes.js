/**
 * Seed (additive upsert) all "Explore Your Home" THEME worlds into MongoDB.
 *
 * Inserts/updates the 40 `home-theme-*` SpecialtyWorld records independently of
 * thumbnail generation, so every theme exists in the DB even before (or if)
 * image generation runs. STRICTLY ADDITIVE — only touches `home-theme-*` docs.
 * Does NOT overwrite an already-generated imageUrl/thumbnailUrl (uses
 * $setOnInsert for the base placeholder image).
 *
 * Usage: node scripts/seed-home-themes.js [--section=kitchen]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');
const { getThemes } = require('./worlds/home-themes');

const sectionArg = (process.argv.find((a) => a.startsWith('--section=')) || '').split('=')[1] || null;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const themes = getThemes(sectionArg);
  console.log(`Seeding ${themes.length} home-theme worlds${sectionArg ? ` (${sectionArg})` : ''}...\n`);

  let inserted = 0, updated = 0;
  for (const t of themes) {
    const res = await SpecialtyWorld.updateOne(
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
        // Only set the placeholder on first insert; never clobber a real
        // generated thumbnail URL on re-runs.
        $setOnInsert: { imageUrl: t.baseImageUrl, thumbnailUrl: t.baseImageUrl },
      },
      { upsert: true },
    );
    if (res.upsertedCount) { inserted++; console.log(`  + ${t.id}`); }
    else { updated++; console.log(`  ~ ${t.id}`); }
  }

  const total = await SpecialtyWorld.countDocuments({ category: 'home' });
  console.log(`\nDone — ${inserted} inserted, ${updated} updated. Total category='home' docs: ${total}`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
