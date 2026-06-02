/**
 * "Explore Your Home" — house section specialty worlds (cozy interior rooms).
 *
 * STRICTLY ADDITIVE. Every id is prefixed `home-` and category is `home`.
 *
 * Each entry has TWO prompts:
 *  - `prompt`          → a "Transform this room into..." instruction used at
 *                        generation/transform time (image-to-image).
 *  - `thumbnailPrompt` → a standalone text-to-image SCENE description used by
 *                        scripts/generate-home-thumbnails.js to render a
 *                        beautiful cozy preview. NOT persisted to Mongo
 *                        (stripped by the seed script — not in the schema).
 */

module.exports = [
  {
    id: 'home-living-room',
    name: 'Cozy Living Room',
    description: 'Warm & inviting',
    category: 'home',
    imageUrl: 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=400',
    prompt:
      'Transform this room into a cozy living room with a plush sectional sofa draped in chunky knit throws, warm oak floors, a crackling fireplace, soft layered rugs, glowing table lamps, leafy potted plants, and a styled bookshelf, bathed in warm golden hour light, inviting and comfortable, photorealistic interior photography',
    thumbnailPrompt:
      'Cozy modern living room interior, plush cream sectional sofa with chunky knit throw blankets and layered cushions, warm oak hardwood floors, a crackling fireplace with a wooden mantel, soft layered area rugs, glowing brass table lamps, leafy potted plants, a styled wooden bookshelf, soft golden afternoon light streaming through large windows, photorealistic, professional interior photography, warm inviting hygge atmosphere, 4K',
    isActive: true,
    price: 0,
    isProOnly: false,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    id: 'home-modern-kitchen',
    name: 'Modern Kitchen',
    description: 'Bright & functional',
    category: 'home',
    imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    prompt:
      'Transform this room into a warm modern kitchen with honey-toned oak cabinetry, a marble waterfall island, brass pendant lights, open shelving styled with ceramics, a farmhouse sink, fresh herbs and a fruit bowl, soft morning light through large windows, photorealistic interior photography, warm and inviting',
    thumbnailPrompt:
      'Cozy modern kitchen interior, warm honey oak cabinetry, white marble waterfall island with bar stools, brass pendant lights, open shelving styled with ceramics and cookbooks, a farmhouse sink, fresh herbs and a bowl of citrus, soft diffused morning light through large windows, photorealistic, professional interior photography, warm inviting atmosphere, 4K',
    isActive: true,
    price: 0,
    isProOnly: false,
    isFeatured: true,
    sortOrder: 2,
  },
  {
    id: 'home-bedroom',
    name: 'Serene Bedroom',
    description: 'Calm & restful',
    category: 'home',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400',
    prompt:
      'Transform this room into a serene bedroom with an upholstered linen headboard, layered white and beige bedding with plush pillows, a soft wool rug, warm wood nightstands, glowing bedside lamps, sheer curtains diffusing soft daylight, a trailing plant, calm and restful, photorealistic interior photography',
    thumbnailPrompt:
      'Cozy serene bedroom interior, upholstered linen headboard, layered white and warm beige bedding with plush pillows and a knit throw, soft wool area rug, warm walnut nightstands with glowing bedside lamps, sheer curtains diffusing soft natural daylight, a trailing potted plant, neutral calming palette, photorealistic, professional interior photography, warm restful atmosphere, 4K',
    isActive: true,
    price: 0,
    isProOnly: false,
    isFeatured: false,
    sortOrder: 3,
  },
  {
    id: 'home-bathroom',
    name: 'Spa Bathroom',
    description: 'Relaxing retreat',
    category: 'home',
    imageUrl: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=400',
    prompt:
      'Transform this room into a spa-like bathroom with a freestanding soaking tub, warm travertine stone tiles, a teak bath caddy, rolled towels, a glass walk-in shower, brass fixtures, lit candles, eucalyptus and orchids, soft warm light, relaxing and luxurious, photorealistic interior photography',
    thumbnailPrompt:
      'Cozy spa bathroom interior, freestanding white soaking tub, warm travertine stone tiles, a wooden teak bath caddy, neatly rolled towels, a glass walk-in shower, brass fixtures, lit candles, eucalyptus branches and orchids in a vase, soft warm ambient light, photorealistic, professional interior photography, relaxing luxurious spa atmosphere, 4K',
    isActive: true,
    price: 0,
    isProOnly: false,
    isFeatured: false,
    sortOrder: 4,
  },
  {
    id: 'home-garden-terrace',
    name: 'Garden & Terrace',
    description: 'Outdoor oasis',
    category: 'home',
    imageUrl: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400',
    prompt:
      'Transform this space into a cozy garden terrace with rattan lounge furniture, plump outdoor cushions, a wooden coffee table, lush potted greenery and climbing vines, warm string lights overhead, a soft outdoor rug, a lantern, surrounded by greenery at golden hour, photorealistic outdoor photography, warm and inviting',
    thumbnailPrompt:
      'Cozy garden terrace at golden hour, rattan lounge furniture with plump cream outdoor cushions, a low wooden coffee table, lush potted greenery and climbing vines, warm string lights glowing overhead, a soft outdoor rug, a lit lantern, surrounded by abundant plants and a wooden pergola, photorealistic, professional outdoor interior photography, warm inviting atmosphere, 4K',
    isActive: true,
    price: 0,
    isProOnly: false,
    isFeatured: false,
    sortOrder: 5,
  },
  {
    id: 'home-home-office',
    name: 'Home Office',
    description: 'Focused & cozy',
    category: 'home',
    imageUrl: 'https://images.unsplash.com/photo-1593476550610-87baa860004a?w=400',
    prompt:
      'Transform this room into a cozy home office with a solid wood desk, an ergonomic leather chair, warm wooden shelving styled with books and plants, a brass desk lamp, a soft rug, framed art, a steaming mug of coffee, soft natural light through the window, focused and inviting, photorealistic interior photography',
    thumbnailPrompt:
      'Cozy home office interior, solid walnut wood desk, ergonomic tan leather chair, warm wooden shelving styled with books and trailing plants, a brass desk lamp, a soft textured rug, framed art on the wall, a steaming mug of coffee, soft natural daylight through a nearby window, photorealistic, professional interior photography, warm focused inviting atmosphere, 4K',
    isActive: true,
    price: 0,
    isProOnly: false,
    isFeatured: false,
    sortOrder: 6,
  },
  {
    id: 'home-dining-room',
    name: 'Dining Room',
    description: 'Gather & dine',
    category: 'home',
    imageUrl: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400',
    prompt:
      'Transform this room into a warm dining room with a solid oak dining table, upholstered linen chairs, a statement rattan pendant light, a styled table with ceramics, candles and fresh flowers, a sideboard with greenery, warm wood floors, soft evening light, inviting and elegant, photorealistic interior photography',
    thumbnailPrompt:
      'Cozy dining room interior, a solid oak dining table set for a meal, upholstered linen dining chairs, a statement woven rattan pendant light glowing above, the table styled with ceramic plates, lit candles and a vase of fresh flowers, a wooden sideboard with greenery, warm hardwood floors, soft warm evening light, photorealistic, professional interior photography, warm inviting atmosphere, 4K',
    isActive: true,
    price: 0,
    isProOnly: false,
    isFeatured: false,
    sortOrder: 7,
  },
  {
    id: 'home-kids-room',
    name: 'Kids Room',
    description: 'Playful & sweet',
    category: 'home',
    imageUrl: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=400',
    prompt:
      'Transform this room into a cozy kids room with a low wooden bed dressed in soft pastel bedding, a teepee play tent, a fluffy round rug, open shelves of toys and books, a garland of warm fairy lights, plush stuffed animals, a small reading nook, soft daylight, playful and sweet, photorealistic interior photography',
    thumbnailPrompt:
      'Cozy kids bedroom interior, a low wooden bed with soft pastel bedding and plush pillows, a canvas teepee play tent, a fluffy round cream rug, open wooden shelves of neatly arranged toys and picture books, a garland of warm glowing fairy lights, plush stuffed animals, a small cushioned reading nook, soft natural daylight, photorealistic, professional interior photography, warm playful sweet atmosphere, 4K',
    isActive: true,
    price: 0,
    isProOnly: false,
    isFeatured: false,
    sortOrder: 8,
  },
];
