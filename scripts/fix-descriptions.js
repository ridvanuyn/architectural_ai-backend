require('dotenv').config();
const mongoose = require('mongoose');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');

// Map of id -> proper short description
const descriptionFixes = {
  'zelda-temple': 'Sacred Triforce Temple',
  'totoro-forest': 'Magical Forest Spirit',
  'howls-moving-castle': 'Walking Wizard Castle',
  'attack-on-titan-hq': 'Survey Corps Base',
  'death-note-room': 'Genius Detective Room',
  'demon-slayer-estate': 'Butterfly Healing Manor',
  'one-piece-sunny': 'Pirate Ship Adventure',
  'cowboy-bebop-lounge': 'Space Jazz Vibes',
  'dragon-ball-capsule': 'Capsule Corp Lab',
  'sailor-moon-crystal': 'Crystal Moon Palace',
  'ponyo-underwater': 'Magical Sea Home',
  'princess-mononoke': 'Ancient Spirit Forest',
  'elden-ring-roundtable': 'Tarnished Gathering Hall',
  'god-of-war-home': 'Norse Warrior Cabin',
  'bioshock-rapture': 'Underwater Art Deco',
  'portal-test-chamber': 'Aperture Science Lab',
  'skyrim-tavern': 'Nordic Mead Hall',
  'halo-unsc-bridge': 'Military Space Command',
  'mass-effect-normandy': 'Starship Captain Suite',
  'assassins-creed-bureau': 'Renaissance Assassin HQ',
  'animal-crossing-home': 'Cute Island Cottage',
  'hollow-knight-city': 'Ancient Bug Kingdom',
  'jurassic-park-lab': 'Dinosaur Genetics Lab',
  'shining-overlook-hotel': 'Haunted 70s Hotel',
  'back-to-future-garage': 'Time Machine Workshop',
  'mad-max-war-rig': 'Wasteland Vehicle',
  'inception-dream-room': 'Impossible Architecture',
  'grand-budapest-hotel': 'Wes Anderson Pastels',
  'john-wick-continental': 'Assassin Luxury Hotel',
  'fifth-element-apartment': 'Future NYC Flat',
  'guardians-galaxy-ship': 'Retro Space Ship',
  'black-panther-wakanda': 'African Futurism',
  'james-bond-villain-lair': 'Secret Villain Base',
  'willy-wonka-factory': 'Chocolate Factory Magic',
  'titanic-first-class': '1912 Ocean Luxury',
  'indiana-jones-temple': 'Ancient Treasure Temple',
  'tron-legacy-grid': 'Digital Light World',
  'avatar-pandora-home': 'Bioluminescent Nature',
  'blade-runner-market': 'Neon Rain Market',
  '2001-space-odyssey': 'Retro Space Station',
  'narcos-drug-lord-mansion': '80s Drug Lord Excess',
  'sherlock-holmes-study': 'Victorian Detective Den',
  'witcher-kaer-morhen': 'Medieval Wolf Fortress',
  'mandalorian-razor-crest': 'Bounty Hunter Ship',
  'squid-game-dormitory': 'Deadly Game Dorm',
  'last-of-us-shelter': 'Post-Apocalyptic Haven',
  'succession-roy-penthouse': 'Ultra-Rich Manhattan',
  'bridgerton-ballroom': 'Regency Era Elegance',
  'vikings-great-hall': 'Norse Mead Feast Hall',
  'the-crown-buckingham': 'Royal Palace Grandeur',
  'dark-netflix-bunker': 'Time Travel Bunker',
  'westworld-saloon': 'Wild West Meets AI',
  'aztec-temple-interior': 'Sacred Aztec Chamber',
  'chinese-imperial-palace': 'Forbidden City Throne',
  'samurai-castle-hall': 'Feudal Japan Castle',
  'art-nouveau-paris-salon': '1900s Parisian Art',
  'alhambra-palace-room': 'Moorish Geometric Art',
  'byzantine-hagia-sophia': 'Golden Dome Mosaics',
  'tudor-english-manor': 'Henry VIII Great Hall',
  'baroque-vienna-salon': 'Rococo Gold & Pastels',
  'colonial-american-parlor': '1770s American Home',
  'ancient-petra-chamber': 'Rose-Red Sandstone',
  'treehouse-paradise': 'Rainforest Canopy Home',
  'ice-palace': 'Frozen Aurora Palace',
  'crystal-cave-home': 'Amethyst Crystal Dwelling',
  'volcano-lair': 'Lava Glass Villain Base',
  'cloud-city': 'Floating Sky Pavilion',
  'mushroom-kingdom': 'Giant Fungal Home',
  'fairy-garden-cottage': 'Magical Miniature Home',
  'dragons-treasury': 'Gold Hoard Cave',
  'mermaid-grotto': 'Underwater Sea Cave',
  'phoenix-nest-aerie': 'Mountain Fire Aerie',
  'dubai-sky-penthouse': 'Skyscraper Luxury',
  'monaco-yacht-interior': 'Superyacht Suite',
  'tokyo-capsule-hotel': 'Ultra-Minimal Pod',
  'scandinavian-hygge-cabin': 'Cozy Nordic Retreat',
  'moroccan-riad': 'Courtyard Tile Palace',
  'bali-jungle-villa': 'Tropical Open-Air Villa',
  'swiss-alpine-chalet': 'Mountain Ski Lodge',
  'nyc-soho-loft': 'Industrial Art Loft',
  'santorini-cave-house': 'Aegean White Cave',
  'african-safari-lodge': 'Savanna Luxury Camp',
  'iss-space-station': 'Zero Gravity Living',
  'moon-base-alpha': 'Lunar Colony Habitat',
  'underwater-research-lab': 'Deep Ocean Station',
  'steampunk-airship': 'Victorian Sky Ship',
  'solarpunk-greenhouse': 'Utopian Green Home',
  'generation-ship-atrium': 'Interstellar Community',
  'dyson-sphere-habitat': 'Star-Powered Megacity',
  'terraform-mars-dome': 'Red Planet Greenhouse',
  'quantum-lab': 'Cutting-Edge Science',
  'cyberpunk-hacker-den': 'Digital Anarchist Cave',
  'dia-de-los-muertos': 'Day of the Dead',
  'bollywood-palace': 'Indian Film Grandeur',
  'kpop-studio': 'Korean Pop Studio',
  'arabian-nights-palace': 'Scheherazade Chamber',
  'polynesian-longhouse': 'Pacific Island Hall',
  'tibetan-monastery': 'Mountain Buddhist Temple',
  'celtic-druid-grove': 'Sacred Oak Circle',
  'persian-tea-house': 'Iranian Chai Lounge',
  'mexican-hacienda': 'Colonial Courtyard Home',
  'balinese-temple': 'Hindu Island Temple',
};

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // First, show worlds with long descriptions
  const longBefore = await SpecialtyWorld.find(
    { $expr: { $gt: [{ $strLenCP: '$description' }, 30] } },
    'id description'
  ).lean();
  console.log(`\nFound ${longBefore.length} worlds with description > 30 chars BEFORE fix:`);
  longBefore.forEach(w => console.log(`  ${w.id}: "${w.description.substring(0, 60)}..."`));

  let fixed = 0;
  let notFound = 0;
  for (const [id, desc] of Object.entries(descriptionFixes)) {
    const result = await SpecialtyWorld.updateOne(
      { id },
      { $set: { description: desc } }
    );
    if (result.modifiedCount > 0) {
      fixed++;
      console.log(`  Fixed: ${id} -> "${desc}"`);
    } else if (result.matchedCount === 0) {
      notFound++;
    }
  }

  console.log(`\nFixed ${fixed} descriptions`);
  if (notFound > 0) console.log(`${notFound} world IDs not found in DB`);

  // Verify no long descriptions remain
  const longAfter = await SpecialtyWorld.find(
    { $expr: { $gt: [{ $strLenCP: '$description' }, 30] } },
    'id description'
  ).lean();
  if (longAfter.length > 0) {
    console.log('\nStill have long descriptions:');
    longAfter.forEach(w => console.log(`  ${w.id}: "${w.description}"`));
  } else {
    console.log('\nAll descriptions are now short (<=30 chars)');
  }

  // Show total count
  const total = await SpecialtyWorld.countDocuments();
  console.log(`\nTotal worlds in collection: ${total}`);

  await mongoose.disconnect();
  console.log('Done');
}

fix().catch(e => {
  console.error(e);
  process.exit(1);
});
