/**
 * Classify every SpecialtyWorld into a `designIntent` and persist it.
 *
 *   transform → fully redesign / restyle the room into the template's theme
 *               (themed worlds, full style packs, room sections).
 *   preserve  → keep the room's existing design/furniture/layout/style and
 *               apply ONLY the single described change (quick tools like
 *               Add Plants / Sunset, and the functional home tweaks).
 *
 * The result feeds prompt enrichment at generation time (see
 * src/utils/promptEnrichment.js). Idempotent — safe to re-run. Run with
 * `--dry` to preview without writing.
 *
 *   node scripts/classify-design-intent.js [--dry]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');
const { classifyWorldIntent } = require('../src/utils/promptEnrichment');

async function main() {
  const dry = process.argv.includes('--dry');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);

  const worlds = await SpecialtyWorld.find({}).select('id name category prompt designIntent').lean();
  let preserve = 0, transform = 0, changed = 0;
  const ops = [];
  const flips = [];

  for (const w of worlds) {
    const intent = classifyWorldIntent(w);
    if (intent === 'preserve') preserve++; else transform++;
    if (w.designIntent !== intent) {
      changed++;
      flips.push(`  ${intent.padEnd(9)} [${w.category}] ${w.id} — ${w.name}`);
      ops.push({ updateOne: { filter: { _id: w._id }, update: { $set: { designIntent: intent } } } });
    }
  }

  console.log(`Total ${worlds.length} | preserve ${preserve} | transform ${transform} | needing update ${changed}`);
  if (flips.length) {
    console.log('\nChanges:');
    console.log(flips.slice(0, 80).join('\n'));
    if (flips.length > 80) console.log(`  …and ${flips.length - 80} more`);
  }

  if (dry) {
    console.log('\n[dry-run] no writes performed.');
  } else if (ops.length) {
    const res = await SpecialtyWorld.bulkWrite(ops);
    console.log(`\n✅ Updated ${res.modifiedCount} worlds.`);
  } else {
    console.log('\nNothing to update.');
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
