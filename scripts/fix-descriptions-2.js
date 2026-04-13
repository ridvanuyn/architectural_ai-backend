require('dotenv').config();
const mongoose = require('mongoose');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');

// Fix remaining worlds that still have prompt text as descriptions
const descriptionFixes = {
  'minecraft-castle': 'Blocky Pixel Castle',
  'wednesday-nevermore': 'Gothic Academy Macabre',
  'breaking-bad-lab': 'Meth Superlab',
  'money-heist-hideout': 'Heist Planning Room',
  'resident-evil-mansion': 'Gothic Horror Mansion',
  'interstellar-endurance': 'Deep Space Explorer',
  'dune-arrakis': 'Desert Spice Chamber',
  'alien-nostromo': 'Claustrophobic Space Ship',
  'peaky-blinders-pub': '1920s Birmingham Pub',
  'bauhaus-studio': '1920s Design Studio',
  'frank-lloyd-wright': 'Organic Architecture',
  'spirited-away': 'Magical Bathhouse',
  'evangelion-nerv': 'Underground Mecha HQ',
  'japanese-ryokan': 'Traditional Japanese Inn',
};

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  let fixed = 0;
  for (const [id, desc] of Object.entries(descriptionFixes)) {
    const result = await SpecialtyWorld.updateOne(
      { id },
      { $set: { description: desc } }
    );
    if (result.modifiedCount > 0) {
      fixed++;
      console.log(`  Fixed: ${id} -> "${desc}"`);
    }
  }

  console.log(`\nFixed ${fixed} more descriptions`);

  // Verify no long descriptions remain
  const longAfter = await SpecialtyWorld.find(
    { $expr: { $gt: [{ $strLenCP: '$description' }, 30] } },
    'id description'
  ).lean();
  if (longAfter.length > 0) {
    console.log('\nStill have long descriptions:');
    longAfter.forEach(w => console.log(`  ${w.id}: "${w.description}"`));
  } else {
    console.log('\nAll descriptions are now short (<=30 chars)!');
  }

  await mongoose.disconnect();
  console.log('Done');
}

fix().catch(e => {
  console.error(e);
  process.exit(1);
});
