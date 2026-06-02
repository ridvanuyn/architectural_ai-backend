/**
 * Theme definitions for the "Explore Your Home" module.
 *
 * Structure: house SECTIONS (kitchen, living room, garden, ...) each contain a
 * rich set of style THEMES (~20 per section). Each theme's thumbnail is produced
 * by running the section's existing base room image through fal.ai's edit
 * (image-to-image) model with the theme's style — so every theme of a section
 * shows the SAME room redesigned in a different style.
 *
 * Theme groups per section:
 *  - mainstream/light everyday styles (Modern, Minimalist, Scandinavian, ...)
 *  - bolder period styles (Victorian, Industrial, Art Deco, ...)
 *  - world / genre styles (Parisian, Moroccan, MasterChef, Space, ...)
 *  - functional tweaks (Light Floor, Dark Floor, Light Wall, Dark Wall,
 *    Best Color, Spacious) — same room, one design variable changed.
 *
 * Theme world id pattern: `home-theme-<section>-<slug>` (the `home-theme-`
 * prefix never collides with the section base worlds `home-*`).
 */

const CDN = process.env.CDN_BASE_URL || 'https://d31qbpz1e19hhx.cloudfront.net';

const SECTIONS = {
  'kitchen':     { baseId: 'home-modern-kitchen', room: 'kitchen' },
  'living-room': { baseId: 'home-living-room',    room: 'living room' },
  'garden':      { baseId: 'home-garden-terrace', room: 'garden and terrace' },
  'bathroom':    { baseId: 'home-bathroom',       room: 'bathroom' },
  'bedroom':     { baseId: 'home-bedroom',        room: 'bedroom' },
  'dining-room': { baseId: 'home-dining-room',    room: 'dining room' },
  'office':      { baseId: 'home-home-office',    room: 'home office' },
  'kids':        { baseId: 'home-kids-room',      room: 'kids room' },
};

const baseUrl = (id) => `${CDN}/thumbnails/${id}/1024.jpg`;

// Reusable mainstream/light style snippets.
const S = {
  modern:       { name: 'Modern',       desc: 'Clean & open',       details: 'clean lines, an open airy layout, a soft neutral palette, large windows with abundant natural light, sleek uncluttered furniture, subtle warm wood accents, bright and fresh' },
  minimalist:   { name: 'Minimalist',   desc: 'Light & simple',     details: 'a bright minimalist palette of white and soft beige, clutter-free surfaces, simple functional pieces, generous negative space, soft natural light, calm and airy' },
  scandinavian: { name: 'Scandinavian', desc: 'Light & cozy',       details: 'light oak, white walls, cozy natural textiles, minimal decor, abundant natural light, warm hygge simplicity' },
  coastal:      { name: 'Coastal',      desc: 'Bright & breezy',    details: 'a light coastal palette of white, sand and soft blue, natural linen and rattan, breezy sheer fabrics, weathered light wood, fresh airy beach-house calm' },
  japandi:      { name: 'Japandi',      desc: 'Calm & natural',     details: 'warm minimalism blending Japanese and Scandinavian, natural light wood, a muted neutral palette, low clean-lined furniture, serene and uncluttered' },
  classic:      { name: 'Classic',      desc: 'Elegant & timeless', details: 'elegant timeless detailing, soft light neutral tones, refined moldings, tasteful furniture, a bright warm and uncluttered look' },
};
const t = (slug, base) => ({ slug, name: base.name, desc: base.desc, details: base.details });

// Functional tweaks — applied to every indoor section. Same room, one variable
// changed. `keepStyle` is reflected in the detail wording.
const FUNCTIONAL = [
  { slug: 'light-floor', name: 'Light Floor', desc: 'Bright flooring', details: 'replace only the flooring with light, pale flooring such as light oak or pale stone tile to brighten the space, keeping the existing style, walls, furniture and layout unchanged' },
  { slug: 'dark-floor',  name: 'Dark Floor',  desc: 'Rich flooring',   details: 'replace only the flooring with rich dark flooring such as dark walnut or charcoal stone tile for a grounded elegant look, keeping the existing style, walls and layout unchanged' },
  { slug: 'light-wall',  name: 'Light Wall',  desc: 'Bright walls',    details: 'repaint only the walls a bright light tone such as soft white or pale warm neutral to make the room feel brighter and more open, keeping the existing flooring, furniture and style' },
  { slug: 'dark-wall',   name: 'Dark Wall',   desc: 'Moody walls',     details: 'repaint only the walls a moody dark tone such as charcoal, deep forest green or navy for a dramatic cozy look, keeping the existing flooring, furniture and style' },
  { slug: 'best-color',  name: 'Best Color',  desc: 'Designer pick',   details: 'repaint the walls in the single best color that suits this room’s existing design and makes it look its most beautiful and inviting — a tasteful designer-chosen wall color — keeping the furniture and layout unchanged' },
  { slug: 'spacious',    name: 'Spacious',    desc: 'Look bigger',     details: 'make this room look noticeably larger and more open — lighter airy colors, a large mirror, streamlined low-profile furniture, an uncluttered layout and bright even lighting — while keeping the same overall style' },
];

// Garden-adapted functional tweaks (outdoor surfaces instead of floor/wall).
const GARDEN_FUNCTIONAL = [
  { slug: 'light-floor', name: 'Light Paving', desc: 'Bright ground', details: 'use light, pale paving and decking such as light stone and pale wood to brighten the space, keeping the existing planting and layout' },
  { slug: 'dark-floor',  name: 'Dark Paving',  desc: 'Rich ground',   details: 'use rich dark paving and decking such as dark stone and charcoal wood for a grounded elegant look, keeping the existing planting' },
  { slug: 'light-wall',  name: 'Light Walls',  desc: 'Bright walls',  details: 'use bright whitewashed walls and light fencing to make the garden feel brighter and more open, keeping the existing planting' },
  { slug: 'dark-wall',   name: 'Dark Walls',   desc: 'Moody walls',   details: 'use moody dark walls and dark fencing for a dramatic backdrop that makes the greenery pop, keeping the existing planting' },
  { slug: 'best-color',  name: 'Best Palette', desc: 'Designer pick', details: 'choose the best planting and material palette that suits this garden and makes it look its most beautiful and inviting, a tasteful designer-chosen scheme' },
  { slug: 'spacious',    name: 'Spacious',     desc: 'Look bigger',   details: 'make this garden look noticeably larger and more open with a clear sightline, light surfaces, layered planting depth and uncluttered seating' },
];

// World / genre snippets shared across rooms.
const G = {
  parisian:    { name: 'Parisian',     desc: 'Chic & elegant',   details: 'Parisian Haussmann elegance, herringbone wood floors, ornate white wall moldings, tall windows, a refined soft neutral palette, chic classic furniture' },
  moroccan:    { name: 'Moroccan',     desc: 'Rich & exotic',    details: 'Moroccan riad style, zellige tiles, arched niches, brass lanterns, rich jewel tones, carved wood, layered patterned textiles' },
  tropical:    { name: 'Tropical',     desc: 'Lush & vibrant',   details: 'a tropical resort feel, lush palms and plants, teak and rattan, light breezy fabrics, vibrant greenery, natural textures' },
  'art-deco':  { name: 'Art Deco',     desc: 'Glam & geometric', details: 'bold geometric patterns, gold and brass accents, velvet upholstery, lacquered surfaces, a symmetrical glamorous layout, statement lighting' },
  japanese:    { name: 'Japanese',     desc: 'Zen & natural',    details: 'serene Japanese minimalism, natural wood, shoji-style screens, low furniture, a muted palette, tatami textures, calm wabi-sabi simplicity' },
};

// 8 sections, ~20 themes each: mainstream-first, then bold, genre, functional.
const THEMES = {
  'kitchen': [
    t('modern', S.modern), t('minimalist', S.minimalist), t('scandinavian', S.scandinavian), t('coastal', S.coastal), t('classic', S.classic),
    { slug: 'farmhouse',   name: 'Rustic Farmhouse', desc: 'Warm & cozy',  details: 'weathered wood beams, shaker cabinets, a white apron farmhouse sink, open shelving with ceramics, warm earthy tones, vintage accents' },
    { slug: 'modern-luxe', name: 'Modern Luxe',  desc: 'Sleek & refined',  details: 'sleek handleless cabinetry, a large marble waterfall island, brass accents, integrated designer lighting, a neutral palette, high-end finishes' },
    { slug: 'industrial',  name: 'Industrial',   desc: 'Raw & bold',       details: 'exposed brick, black steel framing, concrete countertops, open shelving, Edison bulb lighting, reclaimed wood, matte black fixtures' },
    { slug: 'victorian',   name: 'Victorian',    desc: 'Ornate & timeless', details: 'ornate dark wood cabinetry, patterned wallpaper, decorative crown moldings, vintage brass fixtures, marble countertops, antique pendant lighting' },
    // world / genre
    { slug: 'chef',          name: 'MasterChef Pro', desc: 'Pro kitchen',  details: 'a professional chef kitchen, brushed stainless steel, a large gas range and hood, a roomy prep island, hanging utensils, restaurant-grade fittings, crisp task lighting' },
    { slug: 'french-bistro', name: 'French Bistro', desc: 'Parisian charm', details: 'a charming French bistro kitchen, marble counters, brass fixtures, subway tiles, open shelving with copper pots, a vintage range, warm Parisian charm' },
    { slug: 'tuscan',        name: 'Tuscan',       desc: 'Italian warmth',  details: 'a Tuscan Italian kitchen, warm terracotta tiles, rustic wood beams, a stone hood, wrought iron details, earthy ochre tones, sun-washed warmth' },
    { slug: 'mexican',       name: 'Mexican',      desc: 'Vibrant & warm',  details: 'a Mexican hacienda kitchen, hand-painted talavera tiles, warm clay walls, carved wood, colorful ceramics, wrought iron, lively warmth' },
    t('japanese', G.japanese),
    // functional
    ...FUNCTIONAL,
  ],
  'living-room': [
    t('modern', S.modern), t('minimalist', S.minimalist), t('scandinavian', S.scandinavian), t('coastal', S.coastal), t('japandi', S.japandi),
    { slug: 'mid-century', name: 'Mid-Century',  desc: 'Retro & clean',  details: 'walnut furniture with tapered legs, soft accent colors, clean geometric lines, a statement sideboard, a retro 1960s vibe, warm wood tones' },
    { slug: 'bohemian',    name: 'Bohemian',     desc: 'Eclectic & lush', details: 'layered light textiles and rugs, rattan furniture, abundant plants, macrame, warm airy earthy tones, relaxed eclectic comfort' },
    { slug: 'art-deco',    name: 'Art Deco',     desc: 'Glam & geometric', details: 'bold geometric patterns, gold and brass accents, velvet upholstery, lacquered surfaces, a symmetrical layout, glamorous statement lighting' },
    { slug: 'victorian',   name: 'Victorian',    desc: 'Ornate & timeless', details: 'tufted velvet sofas, ornate dark wood furniture, patterned wallpaper, gilded mirrors, a grand chandelier, rich drapery, decorative moldings' },
    // world / genre
    t('parisian', G.parisian),
    t('moroccan', G.moroccan),
    { slug: 'hollywood', name: 'Hollywood Glam', desc: 'Bold & lavish', details: 'Hollywood Regency glamour, lush velvet, mirrored and lacquered surfaces, bold jewel tones, brass accents, dramatic lighting, lavish symmetry' },
    t('tropical', G.tropical),
    { slug: 'chalet',    name: 'Mountain Chalet', desc: 'Cozy & woody', details: 'a cozy alpine chalet, warm timber walls and beams, a stone fireplace, chunky knit throws, fur textures, a snug rustic mountain feel' },
    // functional
    ...FUNCTIONAL,
  ],
  'garden': [
    t('modern', S.modern),
    { slug: 'minimalist',  name: 'Minimalist',   desc: 'Clean & airy',   details: 'a clean minimalist garden, neat geometric planters, a simple lawn, light gravel, sleek low outdoor seating, uncluttered and bright' },
    { slug: 'scandinavian',name: 'Nordic',       desc: 'Light & natural', details: 'a light Nordic garden deck, pale wood decking, simple greenery, minimal cozy outdoor furniture, bright airy and natural' },
    { slug: 'coastal',     name: 'Coastal',      desc: 'Breezy & fresh', details: 'a breezy coastal terrace, a white and soft-blue palette, rattan loungers, potted grasses, weathered wood decking, fresh seaside calm' },
    { slug: 'mediterranean',name: 'Mediterranean',desc: 'Sunny & rustic', details: 'terracotta pots, whitewashed walls, olive and citrus trees, wrought iron furniture, stone paving, climbing bougainvillea, a warm coastal vibe' },
    { slug: 'zen',         name: 'Zen Japanese', desc: 'Calm & balanced', details: 'raked gravel, stone lanterns, a small koi pond, bonsai and bamboo, moss, a natural stone path, a tranquil minimalist composition' },
    { slug: 'tropical',    name: 'Tropical',     desc: 'Lush & vibrant', details: 'lush palms and monstera, teak loungers, rattan furniture, vibrant greenery, a resort atmosphere, natural wood decking' },
    { slug: 'cottage',     name: 'English Cottage', desc: 'Charming & floral', details: 'climbing roses, lush flowerbeds, a stone path, a wooden bench, trimmed hedges, charming romantic planting, soft daylight' },
    // world / genre
    { slug: 'balinese',  name: 'Balinese',     desc: 'Tropical zen',   details: 'a Balinese garden retreat, a thatched bale, tropical plants, a stone water feature, carved stone, teak loungers, a serene spa-like atmosphere' },
    { slug: 'greek',     name: 'Greek Santorini', desc: 'White & blue', details: 'a Greek island terrace, whitewashed walls, blue accents, bougainvillea, pebble paving, simple cushioned seating, bright Aegean sunlight' },
    { slug: 'desert',    name: 'Desert Modern', desc: 'Arid & sculptural', details: 'a desert modern garden, sculptural cacti and succulents, gravel and boulders, warm earth tones, clean concrete planters, low desert planting' },
    { slug: 'tuscan',    name: 'Tuscan',       desc: 'Italian warmth', details: 'a Tuscan courtyard, terracotta urns, cypress trees, a stone fountain, gravel paths, climbing vines, warm sun-washed Italian charm' },
    { slug: 'rooftop',   name: 'Rooftop Lounge', desc: 'Urban & chic', details: 'a chic urban rooftop lounge, sleek modular sofas, a fire feature, planter boxes, string lights, a city skyline backdrop, stylish evening ambiance' },
    { slug: 'japanese-tea', name: 'Japanese Tea', desc: 'Serene ritual', details: 'a Japanese tea garden, stepping stones, a stone water basin, manicured moss, maple trees, a simple wooden tea pavilion, profound calm' },
    // functional
    ...GARDEN_FUNCTIONAL,
  ],
  'bathroom': [
    t('modern', S.modern), t('minimalist', S.minimalist), t('scandinavian', S.scandinavian), t('coastal', S.coastal),
    { slug: 'spa',          name: 'Spa Minimalist', desc: 'Serene & calm', details: 'serene natural stone, a freestanding soaking tub, soft diffused lighting, teak accents, plants, plush towels, a minimalist tranquil atmosphere' },
    { slug: 'modern-marble',name: 'Modern Marble',desc: 'Luxe & bright',  details: 'full marble surfaces, gold fixtures, a frameless glass shower, a floating vanity, a backlit mirror, a luxurious bright finish' },
    { slug: 'moroccan',     name: 'Moroccan',     desc: 'Rich & patterned', details: 'zellige tiles, arched niches, brass lanterns, rich warm colors, carved wood, patterned surfaces, an exotic atmosphere' },
    { slug: 'industrial',   name: 'Industrial',   desc: 'Raw & moody',    details: 'concrete surfaces, exposed black piping, a matte black rainfall shower, a reclaimed wood vanity, Edison bulbs, moody raw textures' },
    { slug: 'victorian',    name: 'Victorian',    desc: 'Classic & elegant', details: 'a clawfoot tub, patterned encaustic floor tiles, vintage brass fixtures, wainscoting, an ornate mirror, classic elegant detailing' },
    // world / genre
    { slug: 'japanese-onsen', name: 'Japanese Onsen', desc: 'Zen bathing', details: 'a Japanese onsen bath, a deep wooden soaking tub, natural stone, bamboo, a pebble floor, soft light, a serene wabi-sabi atmosphere' },
    t('tropical', G.tropical),
    t('art-deco', G['art-deco']),
    { slug: 'farmhouse', name: 'Farmhouse', desc: 'Warm & rustic', details: 'a farmhouse bathroom, shiplap walls, a freestanding tub, a vanity from reclaimed wood, matte black fixtures, warm cozy charm' },
    { slug: 'luxury-gold', name: 'Luxury Gold', desc: 'Opulent & bright', details: 'an opulent bright bathroom, white marble with gold veining, polished gold fixtures, a crystal chandelier, a glass shower, lavish glamour' },
    // functional
    ...FUNCTIONAL,
  ],
  'bedroom': [
    t('modern', S.modern), t('minimalist', S.minimalist), t('scandinavian', S.scandinavian), t('coastal', S.coastal), t('japandi', S.japandi),
    { slug: 'classic',     name: 'Classic',      desc: 'Elegant & timeless', details: 'a softly upholstered headboard, light neutral tones, refined classic furniture, tasteful drapery, warm lamplight, an elegant uncluttered look' },
    { slug: 'bohemian',    name: 'Bohemian',     desc: 'Layered & warm', details: 'a macrame headboard, layered light textiles, rattan accents, abundant plants, warm airy earthy tones, cozy relaxed comfort' },
    { slug: 'modern-luxe', name: 'Modern Luxe',  desc: 'Sleek & plush',  details: 'a sleek low platform bed, plush bedding, integrated mood lighting, marble nightstands, brass accents, a refined neutral palette' },
    { slug: 'victorian',   name: 'Victorian',    desc: 'Opulent & rich', details: 'a tufted upholstered headboard, ornate dark wood furniture, patterned wallpaper, rich drapery, a chandelier, jewel-toned opulence' },
    // world / genre
    t('parisian', G.parisian),
    t('moroccan', G.moroccan),
    t('tropical', G.tropical),
    t('art-deco', G['art-deco']),
    { slug: 'industrial', name: 'Industrial', desc: 'Raw & urban', details: 'an industrial loft bedroom, exposed brick, black metal bed frame, concrete accents, Edison bulb lighting, leather and reclaimed wood' },
    // functional
    ...FUNCTIONAL,
  ],
  'dining-room': [
    t('modern', S.modern), t('minimalist', S.minimalist), t('scandinavian', S.scandinavian), t('coastal', S.coastal), t('classic', S.classic),
    { slug: 'mediterranean',name: 'Mediterranean',desc: 'Sunny & rustic', details: 'a rustic wooden table, woven chairs, whitewashed walls, terracotta accents, wrought iron details, warm coastal light' },
    { slug: 'rustic',       name: 'Rustic',       desc: 'Warm & natural', details: 'a chunky reclaimed-wood table, mismatched vintage chairs, warm earthy tones, exposed beams, a cozy farmhouse feel' },
    { slug: 'industrial',   name: 'Industrial',   desc: 'Raw & urban',   details: 'a reclaimed wood and steel table, metal chairs, exposed brick, Edison bulb lighting, a concrete floor, an urban loft vibe' },
    { slug: 'victorian',    name: 'Victorian',    desc: 'Formal & ornate', details: 'an ornate dark wood dining table, upholstered high-back chairs, a grand chandelier, patterned wallpaper, a gilded mirror, a formal rich palette' },
    // world / genre
    t('parisian', G.parisian),
    t('moroccan', G.moroccan),
    t('japanese', G.japanese),
    t('art-deco', G['art-deco']),
    { slug: 'farmhouse', name: 'Farmhouse', desc: 'Warm & cozy', details: 'a farmhouse dining room, a long reclaimed-wood table, bench seating, shiplap walls, a simple chandelier, warm inviting country charm' },
    // functional
    ...FUNCTIONAL,
  ],
  'office': [
    t('modern', S.modern), t('minimalist', S.minimalist), t('scandinavian', S.scandinavian), t('japandi', S.japandi), t('coastal', S.coastal), t('classic', S.classic),
    { slug: 'mid-century',  name: 'Mid-Century',  desc: 'Retro & warm', details: 'a walnut desk with tapered legs, a soft accent chair, retro 1960s decor, warm wood tones, clean geometric lines' },
    { slug: 'library',      name: 'Cozy Library', desc: 'Warm & classic', details: 'floor-to-ceiling wooden bookshelves, a leather armchair, a warm desk lamp, rich wood paneling, a cozy scholarly atmosphere' },
    { slug: 'industrial',   name: 'Industrial',   desc: 'Raw & bold',   details: 'a reclaimed wood and steel desk, exposed brick, black metal shelving, Edison bulb lighting, a leather chair, an urban loft feel' },
    // world / genre
    t('parisian', G.parisian),
    { slug: 'dark-academia', name: 'Dark Academia', desc: 'Scholarly & moody', details: 'a dark academia study, deep green and walnut tones, antique books, brass desk lamps, leather, classical art, a moody scholarly atmosphere' },
    { slug: 'creative',   name: 'Creative Studio', desc: 'Bright & playful', details: 'a bright creative studio, a large worktable, mood boards and art, colorful accents, open shelving with supplies, energetic inspiring light' },
    { slug: 'executive',  name: 'Executive Luxe', desc: 'Refined & powerful', details: 'an executive office, a large walnut desk, leather chairs, refined paneling, brass accents, a sophisticated powerful neutral palette' },
    { slug: 'bohemian',   name: 'Boho',          desc: 'Relaxed & green', details: 'a boho home office, abundant plants, rattan and natural wood, layered textiles, warm earthy tones, a relaxed creative feel' },
    // functional
    ...FUNCTIONAL,
  ],
  'kids': [
    t('modern', S.modern), t('minimalist', S.minimalist), t('scandinavian', S.scandinavian), t('coastal', S.coastal),
    { slug: 'playful',      name: 'Playful Modern', desc: 'Bright & fun', details: 'bright cheerful colors, fun geometric shapes, a soft play rug, modern low storage, a cozy reading nook, playful lighting' },
    { slug: 'pastel',       name: 'Pastel Dream', desc: 'Soft & whimsical', details: 'soft pastel colors, cloud and star motifs, a canopy bed, plush textiles, whimsical dreamy decor, gentle ambient lighting' },
    { slug: 'bohemian',     name: 'Boho',         desc: 'Cozy & natural', details: 'light boho textiles, rattan and natural wood, a teepee, leafy plants, soft warm neutral tones, cozy relaxed comfort' },
    { slug: 'montessori',   name: 'Montessori',   desc: 'Natural & open', details: 'low natural-wood open shelves, a floor bed, neutral calming tones, an open uncluttered floor, soft natural materials' },
    { slug: 'adventure',    name: 'Adventure',    desc: 'Explorer theme', details: 'an explorer theme with maps and a canvas tent, warm wood, mountain wall murals, cozy lighting, adventurous decor' },
    // world / genre (kid themes & color)
    { slug: 'space',     name: 'Space Adventure', desc: 'Cosmic fun',   details: 'a space adventure room, a galaxy wall mural, glowing stars and planets, a rocket bed, deep blue and purple tones, cosmic wonder' },
    { slug: 'jungle',    name: 'Jungle Safari',  desc: 'Wild & green',  details: 'a jungle safari room, leafy green murals, friendly cartoon animal decor, a canopy net, warm wood, playful explorer details' },
    { slug: 'princess',  name: 'Princess Castle', desc: 'Magical & pink', details: 'a princess castle room, a canopy bed, soft pinks and gold, fairy lights, a turret motif, sparkly whimsical magical decor' },
    { slug: 'superhero', name: 'Superhero',      desc: 'Bold & action', details: 'a superhero room, bold primary red, blue and yellow, comic-style wall art, a city skyline mural, action-packed playful energy' },
    { slug: 'rainbow',   name: 'Rainbow',        desc: 'Colorful & happy', details: 'a happy rainbow room, cheerful multicolor accents, a rainbow wall mural, colorful soft rugs and cushions, bright joyful playful decor' },
    // functional
    ...FUNCTIONAL,
  ],
};

function buildTheme(section, th) {
  const { room, baseId } = SECTIONS[section];
  return {
    id: `home-theme-${section}-${th.slug}`,
    name: th.name,
    description: th.desc,
    category: 'home',
    section,
    baseImageUrl: baseUrl(baseId),
    prompt: `Transform this room into a ${th.name}-style ${room}. ${th.details}. Photorealistic, cohesive interior design, professional photography, high quality.`,
    editPrompt: `Redesign this ${room}: ${th.details}. Keep the existing room architecture, windows and camera perspective. Photorealistic, professional interior photography, cohesive, warm and inviting, high quality, 4K.`,
  };
}

/** Flat list of all themes (optionally filtered to one section). */
function getThemes(section) {
  const sections = section ? [section] : Object.keys(THEMES);
  const out = [];
  for (const s of sections) {
    if (!THEMES[s]) continue;
    THEMES[s].forEach((th, i) => {
      const built = buildTheme(s, th);
      built.sortOrder = i + 1;
      out.push(built);
    });
  }
  return out;
}

module.exports = { SECTIONS, THEMES, getThemes };
