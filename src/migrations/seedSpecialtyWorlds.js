require('dotenv').config();
const mongoose = require('mongoose');
const SpecialtyWorld = require('../models/SpecialtyWorld');

const specialtyWorlds = [
  // Fantasy Category
  {
    id: 'hobbit-hole',
    name: 'Hobbit Hole',
    description: 'Middle Earth Style',
    category: 'fantasy',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
    prompt: 'Transform this room into a cozy Hobbit hole from Middle Earth, with round doorways, earth-toned walls, rustic wooden beams, circular windows with green rolling hills visible outside, warm fireplace, handcrafted wooden furniture, vintage lanterns, and lush indoor plants creating a magical Shire atmosphere',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    id: 'gryffindor-room',
    name: 'Gryffindor Room',
    description: 'Bravery & Gold',
    category: 'fantasy',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    prompt: 'Transform this room into a Gryffindor common room from Hogwarts, with deep crimson and gold colors, gothic stone walls, large fireplace with lion crest, vintage leather armchairs, floating candles, magical portraits, wooden bookshelves with ancient books, tapestries with lion emblems, and warm ambient candlelight',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 2,
  },
  {
    id: 'slytherin-dungeon',
    name: 'Slytherin Dungeon',
    description: 'Ambition & Green',
    category: 'fantasy',
    imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400',
    prompt: 'Transform this room into a Slytherin dungeon common room, with emerald green and silver colors, stone walls with serpent carvings, underwater lake view through green-tinted windows, leather furniture, silver chandeliers, snake motifs, dark wood paneling, mysterious ambiance with green ambient lighting',
    price: 0.99,
    isProOnly: true,
    sortOrder: 3,
  },

  // Cinematic Category
  {
    id: 'hollywood-glamour',
    name: 'Hollywood Glamour',
    description: 'Golden Age Luxury',
    category: 'cinematic',
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400',
    prompt: 'Transform this room into a 1940s Hollywood glamour style, with art deco furniture, velvet drapes, gold accents, crystal chandeliers, mirrored surfaces, vintage movie posters, plush carpeting, elegant bar cart, dramatic lighting, and timeless elegance of old Hollywood luxury',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 1,
  },

  // Futuristic Category
  {
    id: 'cyberpunk-2077',
    name: 'Cyberpunk 2077',
    description: 'Neon Night City',
    category: 'futuristic',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
    prompt: 'Transform this room into a Cyberpunk 2077 Night City apartment, with neon pink and cyan lighting, holographic displays, high-tech gadgets, industrial metal elements, rain-streaked windows showing neon cityscape, LED strip lights, futuristic furniture, cyber aesthetic with dark atmosphere',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    id: 'mars-colony',
    name: 'Mars Colony',
    description: 'Red Planet Base',
    category: 'futuristic',
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=400',
    prompt: 'Transform this room into a Mars colony habitat module, with curved white walls, circular windows showing red Martian landscape, minimalist futuristic furniture, hydroponic plants, ambient blue lighting, space-age technology, modular storage, life support systems visible, and sterile yet cozy atmosphere',
    price: 0.99,
    isProOnly: true,
    sortOrder: 2,
  },
  {
    id: 'cyber-tokyo',
    name: 'Cyber-Tokyo',
    description: 'Neon Metropolis',
    category: 'futuristic',
    imageUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400',
    prompt: 'Transform this room into a futuristic Tokyo apartment, with neon signs visible through windows, minimalist Japanese design meets cyberpunk, shoji screens with LED backlight, low furniture, bonsai trees, city skyline view with flying cars, holographic art, tatami meets technology aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 3,
  },
  {
    id: 'futuristic-ship',
    name: 'Futuristic Ship',
    description: 'Sci-Fi Interior',
    category: 'futuristic',
    imageUrl: 'https://images.unsplash.com/photo-1534996858221-380b92700493?w=400',
    prompt: 'Transform this room into a futuristic spaceship interior, with sleek curved walls, panoramic space view windows, integrated lighting panels, minimalist floating furniture, holographic control panels, metallic and white surfaces, zero-gravity design elements, and advanced technology aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 4,
  },

  // Historical Category
  {
    id: 'victorian-1800s',
    name: '1800s Victorian',
    description: 'Gothic Elegance',
    category: 'historical',
    imageUrl: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=400',
    prompt: 'Transform this room into a Victorian era parlor from the 1800s, with ornate wallpaper, dark wood furniture with carved details, velvet upholstery, crystal chandeliers, marble fireplace, antique mirrors, heavy drapes, Persian rugs, oil paintings in gilt frames, and elegant gothic atmosphere',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    id: 'stone-age',
    name: '8000 BC Stone Age',
    description: 'Primitive Living',
    category: 'historical',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    prompt: 'Transform this room into a Stone Age dwelling, with rough stone walls, animal fur rugs and throws, primitive wooden furniture, fire pit with smoke rising, cave paintings on walls, bone and stone tools as decoration, natural lighting through small openings, earth tones throughout',
    price: 0.99,
    isProOnly: true,
    sortOrder: 2,
  },
  {
    id: 'egyptian-palace',
    name: 'Egyptian Palace',
    description: "Pharaoh's Court",
    category: 'historical',
    imageUrl: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=400',
    prompt: 'Transform this room into an Ancient Egyptian palace, with hieroglyphic wall paintings, gold and lapis lazuli accents, lotus flower motifs, carved stone columns, pharaoh statues, palm frond decorations, linen drapes, oil lamps, throne-like seating, and royal opulence of the Nile civilization',
    price: 0.99,
    isProOnly: true,
    sortOrder: 3,
  },
  {
    id: 'medieval-castle',
    name: 'Medieval Castle',
    description: 'Stone Fortress',
    category: 'historical',
    imageUrl: 'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=400',
    prompt: 'Transform this room into a medieval castle chamber, with stone walls, iron chandeliers with candles, tapestries depicting battles and hunts, wooden beam ceiling, large fireplace, suits of armor, heraldic shields, heavy oak furniture, fur rugs, and medieval fortress atmosphere',
    price: 0.99,
    isProOnly: true,
    sortOrder: 4,
  },

  // Nature Category
  {
    id: 'prehistoric-cave',
    name: 'Prehistoric Cave',
    description: 'Natural Shelter',
    category: 'nature',
    imageUrl: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=400',
    prompt: 'Transform this room into a prehistoric cave dwelling, with natural rock walls, stalactites, warm fire glow, animal hide furnishings, primitive art on walls, natural pool, moss and fern plants, soft amber lighting, connection to nature, primal yet cozy atmosphere',
    price: 0.99,
    isProOnly: true,
    sortOrder: 1,
  },
  {
    id: 'underwater-atlantis',
    name: 'Underwater Atlantis',
    description: 'Deep Sea Kingdom',
    category: 'nature',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
    prompt: 'Transform this room into an underwater Atlantean palace, with bubble-shaped windows showing deep sea life, bioluminescent lighting, coral and pearl decorations, flowing water elements, ancient Greek columns with barnacles, seashell furniture, blue-green color palette, mystical underwater city aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 2,
  },
  {
    id: 'japanese-zen',
    name: 'Japanese Zen',
    description: 'Temple Peace',
    category: 'nature',
    imageUrl: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400',
    prompt: 'Transform this room into a Japanese Zen temple space, with tatami mats, shoji paper screens, ikebana flower arrangements, rock garden view, bamboo elements, low wooden furniture, minimalist aesthetic, natural light, bonsai trees, meditation cushions, and peaceful tranquility',
    price: 0.99,
    isProOnly: true,
    sortOrder: 3,
  },
  {
    id: 'nordic-hall',
    name: 'Nordic Hall',
    description: 'Viking Longhouse',
    category: 'nature',
    imageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400',
    prompt: 'Transform this room into a Viking longhouse great hall, with massive wooden beams, central fire pit, animal furs everywhere, carved wooden pillars with Norse runes, shields and weapons on walls, mead barrels, rustic wooden tables, candle and firelight, Nordic winter atmosphere',
    price: 0.99,
    isProOnly: true,
    sortOrder: 4,
  },

  // Luxury Category
  {
    id: 'mayan-temple',
    name: 'Mayan Temple',
    description: 'Jungle Ruins',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=400',
    prompt: 'Transform this room into a Mayan temple chamber, with carved stone walls depicting Mayan calendar and gods, jungle vines creeping through windows, jade and gold accents, torch lighting, stepped pyramid visible outside, feathered decorations, obsidian mirrors, ancient mystical atmosphere',
    price: 0.99,
    isProOnly: true,
    sortOrder: 1,
  },
  {
    id: 'tsunami-shelter',
    name: 'Tsunami Shelter',
    description: 'Disaster Proof',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    prompt: 'Transform this room into a high-tech tsunami shelter, with reinforced curved walls, waterproof porthole windows, emergency supplies storage, modular seating, survival technology displays, LED emergency lighting, communication equipment, self-sustaining life support, ultra-modern bunker aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 2,
  },
  {
    id: 'belle-epoque',
    name: 'Belle Époque',
    description: 'Parisian Charm',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400',
    prompt: 'Transform this room into a Belle Époque Parisian salon, with ornate gold moldings, crystal chandeliers, Louis XV furniture, silk damask wallpaper, Eiffel Tower view, art nouveau details, gilded mirrors, marble fireplace, fresh flowers, champagne elegance of 1900s Paris',
    price: 0.99,
    isProOnly: true,
    sortOrder: 3,
  },
  {
    id: 'post-apocalyptic',
    name: 'Post-Apocalyptic',
    description: 'Bunker Survival',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1534854638093-bada1813ca19?w=400',
    prompt: 'Transform this room into a post-apocalyptic bunker hideout, with concrete walls with cracks, makeshift furniture from salvaged materials, industrial lighting, survival gear storage, barricaded windows, generator and water filtration visible, maps and notes on walls, rugged survival aesthetic with signs of civilization rebuilding',
    price: 0.99,
    isProOnly: true,
    sortOrder: 4,
  },

  // ============== 20 NEW SPECIALTY WORLDS ==============

  // Game of Thrones
  {
    id: 'winterfell-great-hall',
    name: 'Winterfell Great Hall',
    description: 'House Stark Castle',
    category: 'fantasy',
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
    prompt: 'Transform this room into the Great Hall of Winterfell from Game of Thrones, with massive stone walls, direwolf banners, long wooden feast tables, roaring central fireplace, iron chandeliers with candles, fur-covered thrones, winter atmosphere, snow visible through gothic windows, Northern medieval fortress aesthetic',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 5,
  },
  {
    id: 'iron-throne-room',
    name: 'Iron Throne Room',
    description: 'Kings Landing Palace',
    category: 'fantasy',
    imageUrl: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=400',
    prompt: 'Transform this room into the Iron Throne room of Kings Landing, with towering stone columns, the iconic Iron Throne made of swords, red and gold Lannister banners, stained glass windows with seven-pointed star, marble floors, dramatic lighting, royal court atmosphere, Game of Thrones medieval grandeur',
    price: 0.99,
    isProOnly: true,
    sortOrder: 6,
  },

  // Stranger Things
  {
    id: 'upside-down',
    name: 'The Upside Down',
    description: 'Stranger Things Dimension',
    category: 'fantasy',
    imageUrl: 'https://images.unsplash.com/photo-1509248961895-b23aad4f24b4?w=400',
    prompt: 'Transform this room into The Upside Down from Stranger Things, with dark decaying version of the room, floating ash particles, vine-like organic tendrils covering walls, eerie blue-gray color palette, flickering lights, dense fog atmosphere, distorted furniture, otherworldly horror dimension aesthetic',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 7,
  },
  {
    id: 'hawkins-80s-basement',
    name: 'Hawkins 80s Basement',
    description: 'Retro Gaming Den',
    category: 'cinematic',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
    prompt: 'Transform this room into an 1980s Hawkins basement from Stranger Things, with wood paneling, vintage arcade machines, Dungeons & Dragons table setup, old CRT television, Atari console, movie posters, Christmas lights, walkie-talkies, vintage furniture, nostalgic 80s teenager hangout aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 2,
  },

  // Avatar
  {
    id: 'pandora-hometree',
    name: 'Pandora Hometree',
    description: 'Avatar Na\'vi Dwelling',
    category: 'nature',
    imageUrl: 'https://images.unsplash.com/photo-1518173946687-a4c036bc3e69?w=400',
    prompt: 'Transform this room into a Na\'vi Hometree dwelling from Avatar, with bioluminescent plants glowing blue and purple, organic spiral wooden structures, woven hammocks, floating seeds of Eywa, living wood walls, jungle view, ethereal glow, connection to nature, alien Pandora forest aesthetic',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 5,
  },

  // The Matrix
  {
    id: 'matrix-construct',
    name: 'Matrix Construct',
    description: 'White Loading Room',
    category: 'futuristic',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400',
    prompt: 'Transform this room into The Matrix construct loading program, with infinite white void space, green code rain visible on edges, minimalist white leather furniture materializing, weapon racks appearing, sleek modern aesthetic, digital glitches, philosophical emptiness, The Matrix red pill reality',
    price: 0.99,
    isProOnly: true,
    sortOrder: 5,
  },
  {
    id: 'nebuchadnezzar-ship',
    name: 'Nebuchadnezzar Ship',
    description: 'Matrix Hovercraft',
    category: 'futuristic',
    imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
    prompt: 'Transform this room into the Nebuchadnezzar hovercraft from The Matrix, with industrial metal walls, exposed pipes and wiring, operator station with multiple screens showing green code, worn leather chairs, dim lighting, gritty cyberpunk underground resistance base aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 6,
  },

  // Star Wars
  {
    id: 'millennium-falcon',
    name: 'Millennium Falcon',
    description: 'Star Wars Smuggler Ship',
    category: 'futuristic',
    imageUrl: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400',
    prompt: 'Transform this room into the Millennium Falcon interior from Star Wars, with curved white corridor walls, holochess table, worn leather booth seating, exposed wiring and mechanical parts, cockpit view of hyperspace, blue and orange lighting, lived-in spaceship aesthetic, smuggler vessel atmosphere',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 7,
  },
  {
    id: 'jedi-temple',
    name: 'Jedi Temple',
    description: 'Force Meditation Chamber',
    category: 'fantasy',
    imageUrl: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=400',
    prompt: 'Transform this room into a Jedi Temple meditation chamber from Star Wars, with tall arched windows overlooking Coruscant cityscape, circular meditation platforms, minimalist stone architecture, soft natural lighting, ancient Jedi artifacts, peaceful serenity, Force-aligned sacred space aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 8,
  },

  // Blade Runner
  {
    id: 'blade-runner-2049',
    name: 'Blade Runner 2049',
    description: 'Neo-Noir Future',
    category: 'futuristic',
    imageUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400',
    prompt: 'Transform this room into a Blade Runner 2049 apartment, with orange hazy light filtering through large windows, holographic AI companion, minimalist brutalist furniture, rain-soaked dystopian cityscape view, subtle neon reflections, melancholic atmosphere, neo-noir futuristic aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 8,
  },

  // Narnia
  {
    id: 'narnia-wardrobe',
    name: 'Narnia Beyond Wardrobe',
    description: 'Magical Winter Forest',
    category: 'fantasy',
    imageUrl: 'https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=400',
    prompt: 'Transform this room into Narnia just beyond the wardrobe, with snow-covered trees visible through frost-framed windows, lamppost glowing warmly, enchanted winter forest, cozy cabin interior with stone fireplace, fur throws, Mr Tumnus tea setting, magical winter wonderland aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 9,
  },

  // Roaring 20s
  {
    id: 'gatsby-mansion',
    name: 'Gatsby Mansion',
    description: 'Roaring 1920s Party',
    category: 'historical',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400',
    prompt: 'Transform this room into The Great Gatsby mansion party room, with art deco gold and black patterns, champagne towers, crystal chandeliers, jazz age furniture, flapper era decorations, Long Island view, lavish opulence, roaring twenties extravagance, prohibition era glamour aesthetic',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 5,
  },

  // Ancient Rome
  {
    id: 'roman-villa',
    name: 'Roman Villa',
    description: 'Ancient Empire Luxury',
    category: 'historical',
    imageUrl: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400',
    prompt: 'Transform this room into an Ancient Roman villa, with marble columns and floors, colorful frescoes on walls, mosaic patterns, triclinium dining couches, Roman sculptures, oil lamps, atrium with central pool, Mediterranean garden view, classical Roman Empire opulence aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 6,
  },

  // Ottoman Palace
  {
    id: 'ottoman-harem',
    name: 'Ottoman Palace',
    description: 'Topkapı Elegance',
    category: 'historical',
    imageUrl: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=400',
    prompt: 'Transform this room into an Ottoman palace chamber from Topkapı, with intricate Iznik tiles in blue and white, carved wooden ceilings with gold leaf, silk cushioned divans, ornate rugs, calligraphy art, stained glass windows, Bosphorus view, Turkish coffee set, imperial Ottoman luxury aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 7,
  },

  // Renaissance
  {
    id: 'renaissance-studio',
    name: 'Renaissance Studio',
    description: 'Da Vinci Workshop',
    category: 'historical',
    imageUrl: 'https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=400',
    prompt: 'Transform this room into a Renaissance artist studio like Leonardo da Vinci\'s workshop, with wooden easels and canvases, flying machine sketches on walls, anatomy drawings, scattered inventions, natural light from large windows, oil paints and brushes, classical sculptures for reference, genius creative chaos aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 8,
  },

  // Tron
  {
    id: 'tron-grid',
    name: 'Tron Grid',
    description: 'Digital Light World',
    category: 'futuristic',
    imageUrl: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400',
    prompt: 'Transform this room into Tron digital grid world, with black surfaces and glowing cyan circuit lines, geometric furniture with light strips, holographic displays, light cycle visible, digital realm atmosphere, minimalist high-tech aesthetic, The Grid from Tron Legacy',
    price: 0.99,
    isProOnly: true,
    sortOrder: 9,
  },

  // Interstellar
  {
    id: 'interstellar-endurance',
    name: 'Endurance Station',
    description: 'Interstellar Spacecraft',
    category: 'futuristic',
    imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400',
    prompt: 'Transform this room into the Endurance spacecraft from Interstellar, with circular modular design, cryosleep pods, TARS robot companion, window showing wormhole or Saturn rings, scientific equipment, realistic NASA-style space station interior, cosmic exploration aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 10,
  },

  // Enchanted Forest
  {
    id: 'enchanted-forest-cabin',
    name: 'Enchanted Forest',
    description: 'Fairy Tale Cottage',
    category: 'nature',
    imageUrl: 'https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=400',
    prompt: 'Transform this room into an enchanted forest fairy tale cottage, with tree trunk walls, mushroom furniture, fairy lights everywhere, magical creatures peeking through windows, flower and moss decorations, crystal and gemstone accents, mystical foggy forest view, whimsical storybook aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 6,
  },

  // Dubai Penthouse
  {
    id: 'dubai-penthouse',
    name: 'Dubai Sky Penthouse',
    description: 'Ultra Luxury Living',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400',
    prompt: 'Transform this room into an ultra-luxury Dubai penthouse, with floor-to-ceiling windows showing Burj Khalifa and Palm Jumeirah, white marble floors, gold accents everywhere, designer Italian furniture, infinity pool visible on terrace, champagne bar, extravagant modern Arabian luxury aesthetic',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 5,
  },

  // Wes Anderson
  {
    id: 'wes-anderson-hotel',
    name: 'Grand Budapest Hotel',
    description: 'Wes Anderson Aesthetic',
    category: 'cinematic',
    imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
    prompt: 'Transform this room into a Wes Anderson film set, specifically The Grand Budapest Hotel style, with perfectly symmetrical composition, pastel pink and purple walls, vintage furniture precisely arranged, quirky decorations, ornate gilded frames, bellboy aesthetic, whimsical retro European charm',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 3,
  },

  // Titanic
  {
    id: 'titanic-first-class',
    name: 'Titanic First Class',
    description: '1912 Ocean Liner',
    category: 'cinematic',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    prompt: 'Transform this room into a Titanic first-class suite, with Edwardian elegance, mahogany wood paneling, brass fixtures, velvet upholstery, grand mirrors, porthole windows showing Atlantic ocean, period-accurate luxury furniture, White Star Line details, 1912 ocean liner opulence aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 4,
  },

  // ============== ANIMATED SERIES WORLDS ==============

  // The Simpsons
  {
    id: 'simpsons-living-room',
    name: 'Simpsons Living Room',
    description: 'Springfield Home',
    category: 'animated',
    imageUrl: 'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?w=400',
    prompt: 'Transform this room into The Simpsons living room from Springfield, with iconic purple walls, orange-brown couch, tube TV, blue carpet, mismatched lamp, simple cartoon-style furniture, family photos, donut box visible, American animated sitcom aesthetic with bold flat colors',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 1,
  },

  // Family Guy
  {
    id: 'family-guy-house',
    name: 'Griffin Family Room',
    description: 'Quahog Residence',
    category: 'animated',
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
    prompt: 'Transform this room into the Griffin family living room from Family Guy, with green couch, brown armchair facing TV, New England suburban style, cream walls, simple cartoon furniture, American animated comedy aesthetic, Quahog Rhode Island home',
    price: 0.99,
    isProOnly: true,
    sortOrder: 2,
  },

  // Rick and Morty
  {
    id: 'rick-morty-garage',
    name: 'Rick\'s Garage Lab',
    description: 'Mad Scientist Workshop',
    category: 'animated',
    imageUrl: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=400',
    prompt: 'Transform this room into Rick Sanchez garage laboratory from Rick and Morty, with portal gun on workbench, green portal swirling, alien technology scattered, chemistry equipment, spaceship parts, interdimensional gadgets, chaotic genius scientist workshop, sci-fi cartoon aesthetic',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 3,
  },

  // Death Note
  {
    id: 'death-note-room',
    name: 'Light Yagami Room',
    description: 'Death Note Anime',
    category: 'animated',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
    prompt: 'Transform this room into Light Yagami bedroom from Death Note anime, with dark dramatic atmosphere, desk with hidden compartment, Death Note book, Japanese high school student room, mysterious shadows, red and black color accents, psychological thriller anime aesthetic',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 4,
  },

  // Spirited Away
  {
    id: 'spirited-away-bathhouse',
    name: 'Spirited Away Bathhouse',
    description: 'Studio Ghibli Magic',
    category: 'animated',
    imageUrl: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=400',
    prompt: 'Transform this room into the bathhouse from Spirited Away by Studio Ghibli, with traditional Japanese architecture, magical lanterns, red and gold accents, spirit world atmosphere, ornate wooden details, mystical fog, Yubaba style opulence, dreamy anime aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 5,
  },

  // Attack on Titan
  {
    id: 'attack-titan-headquarters',
    name: 'Survey Corps HQ',
    description: 'Attack on Titan',
    category: 'animated',
    imageUrl: 'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=400',
    prompt: 'Transform this room into Survey Corps headquarters from Attack on Titan, with medieval stone walls, Wings of Freedom banners, military maps and strategy boards, 3D maneuver gear storage, oil lamps, wooden furniture, military barracks aesthetic, dark anime atmosphere',
    price: 0.99,
    isProOnly: true,
    sortOrder: 6,
  },

  // Demon Slayer
  {
    id: 'demon-slayer-dojo',
    name: 'Demon Slayer Dojo',
    description: 'Kimetsu no Yaiba',
    category: 'animated',
    imageUrl: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400',
    prompt: 'Transform this room into a Demon Slayer Corps training dojo, with traditional Japanese tatami floors, katana sword racks, Hashira portraits, wisteria flower decorations, paper lanterns, sliding shoji doors, Taisho era aesthetic, anime warrior training hall',
    price: 0.99,
    isProOnly: true,
    sortOrder: 7,
  },

  // South Park
  {
    id: 'south-park-room',
    name: 'South Park Bedroom',
    description: 'Colorado Kids',
    category: 'animated',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
    prompt: 'Transform this room into a South Park kids bedroom, with simple flat cartoon style, construction paper aesthetic, snowy Colorado view from window, video game posters, bunk beds, crude simple furniture, bold primary colors, irreverent animated comedy style',
    price: 0.99,
    isProOnly: true,
    sortOrder: 8,
  },

  // Archer
  {
    id: 'archer-spy-office',
    name: 'ISIS Spy Agency',
    description: 'Archer Headquarters',
    category: 'animated',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
    prompt: 'Transform this room into the ISIS spy agency office from Archer, with mid-century modern furniture, 1960s retro spy aesthetic, wood paneling, vintage computers, bar cart with bourbon, art deco meets Cold War era design, stylish animated spy comedy',
    price: 0.99,
    isProOnly: true,
    sortOrder: 9,
  },

  // Adventure Time
  {
    id: 'adventure-time-treehouse',
    name: 'Finn & Jake Treehouse',
    description: 'Land of Ooo',
    category: 'animated',
    imageUrl: 'https://images.unsplash.com/photo-1520637836993-a071674a97c4?w=400',
    prompt: 'Transform this room into Finn and Jake treehouse from Adventure Time, with whimsical organic shapes, colorful mismatched furniture, treasure piles, BMO gaming console, post-apocalyptic fantasy aesthetic, candy colors, magical Land of Ooo cartoon style',
    price: 0.99,
    isProOnly: true,
    sortOrder: 10,
  },

  // ============== COUNTRY STYLE WORLDS ==============

  // Korean Hanok
  {
    id: 'korean-hanok',
    name: 'Korean Hanok House',
    description: 'Traditional Seoul Style',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1590912710484-739e9ad9c7d3?w=400',
    prompt: 'Transform this room into a traditional Korean Hanok house, with wooden beam ceiling, ondol heated floor, hanji paper doors and windows, low wooden furniture, celadon ceramics, silk cushions, minimalist elegance, Joseon dynasty aesthetic with modern Korean touches',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 1,
  },

  // Korean Modern
  {
    id: 'korean-modern-kdrama',
    name: 'K-Drama Penthouse',
    description: 'Seoul Luxury Style',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400',
    prompt: 'Transform this room into a modern Korean drama penthouse, with minimalist luxury furniture, floor-to-ceiling windows showing Seoul cityscape, neutral tones with bold accents, marble floors, designer Korean lighting, smart home features, chaebol lifestyle aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 2,
  },

  // Turkish Ottoman Modern
  {
    id: 'turkish-modern',
    name: 'Istanbul Chic',
    description: 'Modern Turkish Style',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    prompt: 'Transform this room into modern Turkish Istanbul style, with Ottoman-inspired patterns on textiles, Iznik blue tile accents, Turkish carpets, copper coffee set, Bosphorus view, tulip motifs, blend of Eastern opulence and contemporary minimalism, Turkish drama aesthetic',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 3,
  },

  // Turkish Traditional
  {
    id: 'turkish-konak',
    name: 'Anatolian Konak',
    description: 'Ottoman Mansion',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=400',
    prompt: 'Transform this room into a traditional Turkish konak mansion, with carved wooden ceilings, sedir seating alcoves, kilim rugs, copper mangal, Turkish tea set, lattice windows, cushioned floor seating, Ottoman calligraphy art, Anatolian heritage aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 4,
  },

  // Italian Tuscan
  {
    id: 'italian-tuscan',
    name: 'Tuscan Villa',
    description: 'Italian Countryside',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400',
    prompt: 'Transform this room into an Italian Tuscan villa, with terracotta floors, exposed wooden beam ceiling, rustic stone walls, wrought iron details, olive and wine motifs, antique furniture, vineyard view through arched windows, warm Mediterranean colors, la dolce vita aesthetic',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 5,
  },

  // Italian Modern Milan
  {
    id: 'italian-milan-modern',
    name: 'Milan Design District',
    description: 'Contemporary Italian',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400',
    prompt: 'Transform this room into a Milan design district apartment, with iconic Italian designer furniture by Cassina and B&B Italia, marble and leather, sculptural lighting, bold colors meets sleek minimalism, fashion capital sophistication, Italian contemporary design excellence',
    price: 0.99,
    isProOnly: true,
    sortOrder: 6,
  },

  // Greek Santorini
  {
    id: 'greek-santorini',
    name: 'Santorini Blue',
    description: 'Greek Island Style',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400',
    prompt: 'Transform this room into a Santorini Greek island home, with whitewashed curved walls, cobalt blue accents, arched doorways, built-in seating, Mediterranean sea view, terracotta pottery, simple white furniture, caldera sunset visible, Cycladic architecture aesthetic',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 7,
  },

  // Greek Ancient
  {
    id: 'greek-classical',
    name: 'Classical Athens',
    description: 'Ancient Greek Temple',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400',
    prompt: 'Transform this room into an Ancient Greek classical interior, with marble columns in Ionic style, mosaic floors with geometric patterns, amphorae and pottery, laurel wreaths, olive oil lamps, philosophical scrolls, Parthenon inspired architecture, Hellenistic elegance',
    price: 0.99,
    isProOnly: true,
    sortOrder: 8,
  },

  // French Parisian
  {
    id: 'french-parisian',
    name: 'Parisian Apartment',
    description: 'Haussmann Elegance',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400',
    prompt: 'Transform this room into a classic Parisian Haussmann apartment, with herringbone parquet floors, ornate crown moldings, tall French windows with Juliet balcony, marble fireplace, gilded mirrors, antique French furniture, Eiffel Tower glimpse, effortlessly chic French aesthetic',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 9,
  },

  // French Provence
  {
    id: 'french-provence',
    name: 'Provence Farmhouse',
    description: 'French Country Style',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400',
    prompt: 'Transform this room into a French Provence farmhouse, with lavender and sunflower motifs, distressed wooden furniture, exposed stone walls, toile de Jouy fabrics, copper pots, rustic wooden beams, soft pastel colors, vineyard view, romantic French countryside aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 10,
  },

  // Spanish Andalusian
  {
    id: 'spanish-andalusian',
    name: 'Andalusian Riad',
    description: 'Moorish Spanish Style',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=400',
    prompt: 'Transform this room into a Spanish Andalusian interior, with colorful Moorish tiles (azulejos), arched doorways, wrought iron details, central courtyard fountain visible, terracotta and white walls, flamenco influence, orange tree garden view, Alhambra-inspired patterns',
    price: 0.99,
    isProOnly: true,
    sortOrder: 11,
  },

  // Moroccan Riad
  {
    id: 'moroccan-riad',
    name: 'Marrakech Riad',
    description: 'Moroccan Palace',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=400',
    prompt: 'Transform this room into a Moroccan riad in Marrakech, with intricate zellige tile work, carved plaster walls, brass lanterns, colorful poufs and cushions, arched doorways, central courtyard with fountain, rich jewel tones, exotic North African palace aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 12,
  },

  // Indian Mughal
  {
    id: 'indian-mughal',
    name: 'Mughal Palace',
    description: 'Royal Indian Style',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400',
    prompt: 'Transform this room into a Mughal palace chamber, with intricate marble inlay work (pietra dura), carved jali screens, silk cushions and bolsters, gold leaf details, peacock motifs, hanging lamps, Taj Mahal architectural elements, royal Indian opulence',
    price: 0.99,
    isProOnly: true,
    sortOrder: 13,
  },

  // Scandinavian Hygge
  {
    id: 'scandinavian-hygge',
    name: 'Nordic Hygge',
    description: 'Cozy Scandinavian',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400',
    prompt: 'Transform this room into a Scandinavian hygge living space, with clean minimalist lines, light wood furniture, sheepskin throws, candles everywhere, neutral palette with soft textures, floor plants, large windows with winter view, cozy Danish-Swedish warmth aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 14,
  },

  // Mexican Hacienda
  {
    id: 'mexican-hacienda',
    name: 'Mexican Hacienda',
    description: 'Vibrant Latin Style',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
    prompt: 'Transform this room into a Mexican hacienda, with vibrant Talavera tiles, exposed wooden ceiling beams (vigas), terracotta floors, colorful textiles and papel picado, rustic furniture, cactus plants, Day of the Dead art accents, warm festive Latin aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 15,
  },

  // Brazilian Tropical
  {
    id: 'brazilian-tropical',
    name: 'Rio Tropical Modern',
    description: 'Brazilian Beach Style',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    prompt: 'Transform this room into a Brazilian tropical modern home, with Oscar Niemeyer-inspired curves, tropical plants and palms, woven natural materials, bright colors meets mid-century modern, beach view, Cristo Redentor visible, bossa nova relaxed Rio de Janeiro aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 16,
  },

  // Chinese Traditional
  {
    id: 'chinese-traditional',
    name: 'Ming Dynasty Chamber',
    description: 'Imperial Chinese',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400',
    prompt: 'Transform this room into a Ming Dynasty Chinese chamber, with rosewood furniture, silk screen paintings, blue and white porcelain, red lacquer accents, carved wooden screens, paper lanterns, calligraphy scrolls, dragon motifs, imperial Forbidden City elegance',
    price: 0.99,
    isProOnly: true,
    sortOrder: 17,
  },

  // Russian Imperial
  {
    id: 'russian-imperial',
    name: 'St. Petersburg Palace',
    description: 'Tsarist Russian Style',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400',
    prompt: 'Transform this room into a Russian Imperial palace chamber, with malachite columns, gilded baroque furniture, crystal chandeliers, Fabergé egg displays, parquet floors, rich velvet drapes, Romanov portraits, Winter Palace Hermitage inspired opulence',
    price: 0.99,
    isProOnly: true,
    sortOrder: 18,
  },

  // Dutch Golden Age
  {
    id: 'dutch-golden-age',
    name: 'Amsterdam Canal House',
    description: 'Dutch Master Style',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400',
    prompt: 'Transform this room into a Dutch Golden Age canal house, with Vermeer painting lighting, Delft blue tiles, dark wood furniture, oil paintings in gilt frames, tulips in vases, Turkish rugs, leaded glass windows, 17th century Amsterdam merchant wealth aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 19,
  },

  // Balinese Resort
  {
    id: 'balinese-resort',
    name: 'Bali Paradise Villa',
    description: 'Indonesian Tropical',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400',
    prompt: 'Transform this room into a Balinese villa resort, with carved teak wood, open-air pavilion design, tropical garden view, stone Buddha statues, batik textiles, bamboo furniture, infinity pool visible, frangipani flowers, spiritual Indonesian paradise aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 20,
  },

  // ============== MORE TV SERIES WORLDS ==============

  // Breaking Bad
  {
    id: 'breaking-bad-lab',
    name: 'Heisenberg Lab',
    description: 'Breaking Bad Meth Lab',
    category: 'cinematic',
    imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400',
    prompt: 'Transform this room into Walter White meth lab from Breaking Bad, with industrial steel tables, chemical equipment, yellow hazmat suits hanging, blue crystal product, sterile laboratory lighting, RV cramped space or superlab aesthetic, New Mexico crime drama atmosphere',
    price: 0.99,
    isProOnly: true,
    sortOrder: 5,
  },

  // Peaky Blinders
  {
    id: 'peaky-blinders-office',
    name: 'Shelby Company Office',
    description: 'Peaky Blinders',
    category: 'cinematic',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400',
    prompt: 'Transform this room into Thomas Shelby office from Peaky Blinders, with dark wood paneling, leather Chesterfield chairs, whiskey decanters, vintage telephone, industrial Birmingham atmosphere, 1920s British gangster aesthetic, moody dramatic lighting',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 6,
  },

  // Money Heist
  {
    id: 'money-heist-hideout',
    name: 'La Casa de Papel',
    description: 'Money Heist Hideout',
    category: 'cinematic',
    imageUrl: 'https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=400',
    prompt: 'Transform this room into the Professor hideout from Money Heist (La Casa de Papel), with industrial warehouse space, planning boards with heist maps, red jumpsuits and Dalí masks displayed, Spanish resistance aesthetic, dramatic red lighting accents',
    price: 0.99,
    isProOnly: true,
    sortOrder: 7,
  },

  // Squid Game
  {
    id: 'squid-game-dorm',
    name: 'Squid Game Dorm',
    description: 'Korean Survival Game',
    category: 'cinematic',
    imageUrl: 'https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=400',
    prompt: 'Transform this room into Squid Game player dormitory, with bunk beds in surreal pastel colors, numbered contestant beds, industrial warehouse ceiling, pink guard uniforms visible, unsettling childlike color palette, Korean survival drama dystopian aesthetic',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 8,
  },

  // The Crown
  {
    id: 'the-crown-palace',
    name: 'Buckingham Palace',
    description: 'The Crown Royal Style',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400',
    prompt: 'Transform this room into a Buckingham Palace state room from The Crown, with regal gold and crimson colors, royal portraits, ornate gilded furniture, chandeliers, silk drapes, British monarchy grandeur, Queen Elizabeth II era royal residence aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 6,
  },

  // Bridgerton
  {
    id: 'bridgerton-regency',
    name: 'Bridgerton Drawing Room',
    description: 'Regency Era Romance',
    category: 'historical',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    prompt: 'Transform this room into a Bridgerton Regency era drawing room, with soft pastel colors, floral wallpaper, elegant Empire furniture, pianoforte, fresh flowers, tall windows with drapes, romantic 1800s London high society aesthetic, Netflix period drama elegance',
    price: 0.99,
    isProOnly: true,
    isFeatured: true,
    sortOrder: 9,
  },

  // Friends
  {
    id: 'friends-apartment',
    name: 'Monica\'s Apartment',
    description: 'Central Perk NYC',
    category: 'cinematic',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
    prompt: 'Transform this room into Monica Geller apartment from Friends, with purple walls, eclectic furniture mix, yellow peephole frame on door, kitchen visible, cozy New York apartment vibe, 90s sitcom aesthetic, Central Perk coffee shop warmth',
    price: 0.99,
    isProOnly: true,
    sortOrder: 9,
  },

  // Succession
  {
    id: 'succession-penthouse',
    name: 'Roy Family Penthouse',
    description: 'Succession Billionaire',
    category: 'luxury',
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400',
    prompt: 'Transform this room into the Roy family penthouse from Succession, with ultra-luxury minimalist furniture, Manhattan skyline view, muted expensive materials, contemporary art on walls, cold corporate elegance, media mogul billionaire aesthetic, HBO drama power interior',
    price: 0.99,
    isProOnly: true,
    sortOrder: 7,
  },

  // Narcos
  {
    id: 'narcos-mansion',
    name: 'Escobar Hacienda',
    description: 'Narcos Drug Lord Style',
    category: 'cinematic',
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
    prompt: 'Transform this room into Pablo Escobar Hacienda Nápoles from Narcos, with 1980s Colombian luxury, gold and marble excess, exotic animal art, tropical plants, pool visible, gaudy nouveau riche narco aesthetic, Miami Vice meets cartel kingpin mansion',
    price: 0.99,
    isProOnly: true,
    sortOrder: 10,
  },

  // Sherlock BBC
  {
    id: 'sherlock-baker-street',
    name: '221B Baker Street',
    description: 'BBC Sherlock',
    category: 'cinematic',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    prompt: 'Transform this room into 221B Baker Street from BBC Sherlock, with Victorian wallpaper, cluttered detective workspace, violin on chair, skull on mantelpiece, scientific equipment, case files everywhere, London flat chaos, modern yet classic detective aesthetic',
    price: 0.99,
    isProOnly: true,
    sortOrder: 11,
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await SpecialtyWorld.deleteMany({});
    console.log('Cleared existing specialty worlds');

    // Insert new data
    await SpecialtyWorld.insertMany(specialtyWorlds);
    console.log(`Inserted ${specialtyWorlds.length} specialty worlds`);

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedDatabase();

