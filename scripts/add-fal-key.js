/**
 * Add / rotate the fal.ai API key used by the LIVE generation flow.
 *
 * The backend loads fal keys from the MongoDB `ApiKey` collection
 * (provider:'fal', isActive:true) — DB keys take priority over .env. When the
 * existing keys are exhausted/forbidden, add a fresh one here.
 *
 * Usage: FAL_NEW_KEY="id:secret" node scripts/add-fal-key.js
 *        FAL_NEW_KEY="id:secret" node scripts/add-fal-key.js --keep-old
 */
require('dotenv').config();
const mongoose = require('mongoose');
const ApiKey = require('../src/models/ApiKey');

const NEW_KEY = process.env.FAL_NEW_KEY;
const KEEP_OLD = process.argv.includes('--keep-old');
const mask = (k) => (k && k.length > 12 ? `${k.slice(0, 6)}…${k.slice(-4)}` : '***');

async function main() {
  if (!NEW_KEY) {
    console.error('Set FAL_NEW_KEY="id:secret"');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const before = await ApiKey.find({ provider: 'fal' }).lean();
  console.log(`Existing fal keys: ${before.length}`);
  before.forEach((k) => console.log(`  - ${mask(k.key)} active=${k.isActive} used=${k.usageCount} err=${k.lastError || '-'}`));

  if (!KEEP_OLD) {
    const res = await ApiKey.updateMany(
      { provider: 'fal', key: { $ne: NEW_KEY } },
      { $set: { isActive: false } },
    );
    console.log(`Deactivated ${res.modifiedCount} old fal key(s).`);
  }

  await ApiKey.updateOne(
    { provider: 'fal', key: NEW_KEY },
    { $set: { isActive: true, label: 'user-provided', lastError: null }, $setOnInsert: { usageCount: 0 } },
    { upsert: true },
  );
  console.log(`Upserted new fal key ${mask(NEW_KEY)} (active).`);

  const active = await ApiKey.find({ provider: 'fal', isActive: true }).lean();
  console.log(`\nActive fal keys now: ${active.length}`);
  active.forEach((k) => console.log(`  - ${mask(k.key)}`));

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
