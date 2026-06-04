require('dotenv').config();
const mongoose = require('mongoose');
const PromoCode = require('../src/models/PromoCode');

// Usage:
//   node scripts/create-promo-code.js --code=WELCOME --tokens=10 --validity=7 \
//     [--expires=2026-12-31] [--max=1000] [--label="launch"]

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const eq = raw.indexOf('=');
    if (eq === -1) {
      args[raw.slice(2)] = true;
    } else {
      args[raw.slice(2, eq)] = raw.slice(eq + 1);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.code || args.tokens == null || args.validity == null) {
    console.error('Required: --code, --tokens, --validity');
    console.error('Usage: node scripts/create-promo-code.js --code=WELCOME --tokens=10 --validity=7 [--expires=2026-12-31] [--max=1000] [--label="launch"]');
    process.exit(1);
  }

  const code = String(args.code).trim().toUpperCase();
  const tokens = Number(args.tokens);
  const tokenValidityDays = Number(args.validity);

  if (!Number.isFinite(tokens) || !Number.isFinite(tokenValidityDays)) {
    console.error('--tokens and --validity must be numbers');
    process.exit(1);
  }

  const set = {
    code,
    tokens,
    tokenValidityDays,
    isActive: true,
  };

  if (args.expires != null && args.expires !== true) {
    const d = new Date(args.expires);
    if (Number.isNaN(d.getTime())) {
      console.error('--expires is not a valid date');
      process.exit(1);
    }
    set.expiresAt = d;
  }

  if (args.max != null && args.max !== true) {
    const max = Number(args.max);
    if (!Number.isFinite(max)) {
      console.error('--max must be a number');
      process.exit(1);
    }
    set.maxRedemptions = max;
  }

  if (args.label != null && args.label !== true) {
    set.label = String(args.label);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  await PromoCode.updateOne(
    { code },
    { $set: set, $setOnInsert: { redemptionCount: 0 } },
    { upsert: true },
  );

  const promo = await PromoCode.findOne({ code });
  console.log('\nPromo code upserted:');
  console.log(`  code:              ${promo.code}`);
  console.log(`  tokens:            ${promo.tokens}`);
  console.log(`  tokenValidityDays: ${promo.tokenValidityDays}`);
  console.log(`  expiresAt:         ${promo.expiresAt || '(none)'}`);
  console.log(`  maxRedemptions:    ${promo.maxRedemptions != null ? promo.maxRedemptions : '(unlimited)'}`);
  console.log(`  redemptionCount:   ${promo.redemptionCount}`);
  console.log(`  isActive:          ${promo.isActive}`);
  console.log(`  label:             ${promo.label || '(none)'}`);

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
