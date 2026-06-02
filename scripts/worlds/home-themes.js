/**
 * Theme definitions for the "Explore Your Home" module.
 *
 * Structure: house SECTIONS (kitchen, living room, garden, ...) each contain a
 * set of style THEMES. Each theme's thumbnail is produced by running the
 * section's existing base room image through fal.ai's edit (image-to-image)
 * model with the theme's style — so every theme of a section shows the SAME
 * room redesigned in a different style.
 *
 * Theme world id pattern: `home-theme-<section>-<slug>` (the `home-theme-`
 * prefix never collides with the section base worlds `home-*`).
 */

const CDN = process.env.CDN_BASE_URL || 'https://d31qbpz1e19hhx.cloudfront.net';

// Each section's existing base image (generated earlier) used as the
// image-to-image source, plus the human room noun used in prompts.
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

// 5 themes per section. `details` drives both the edit prompt (thumbnail) and
// the transform prompt (applied to the user's own photo).
const THEMES = {
  'kitchen': [
    { slug: 'victorian',    name: 'Victorian',    desc: 'Ornate & timeless',  details: 'ornate dark wood cabinetry, patterned wallpaper, decorative crown moldings, vintage brass fixtures, marble countertops, a classic range, antique pendant lighting, rich jewel tones' },
    { slug: 'scandinavian', name: 'Scandinavian', desc: 'Light & airy',       details: 'light oak cabinets, white walls, matte handleless fronts, minimal clutter, natural light, cozy textiles, soft neutral palette, hygge atmosphere' },
    { slug: 'industrial',   name: 'Industrial',   desc: 'Raw & bold',         details: 'exposed brick, black steel framing, concrete countertops, open shelving, Edison bulb lighting, reclaimed wood, matte black fixtures' },
    { slug: 'farmhouse',    name: 'Rustic Farmhouse', desc: 'Warm & cozy',    details: 'weathered wood beams, shaker cabinets, white apron farmhouse sink, open shelving with ceramics, warm earthy tones, vintage accents' },
    { slug: 'modern-luxe',  name: 'Modern Luxe',  desc: 'Sleek & refined',    details: 'sleek handleless cabinetry, large marble waterfall island, brass accents, integrated designer lighting, neutral palette, high-end finishes' },
  ],
  'living-room': [
    { slug: 'victorian',    name: 'Victorian',    desc: 'Ornate & timeless',  details: 'tufted velvet sofas, ornate dark wood furniture, patterned wallpaper, gilded mirrors, a grand chandelier, rich drapery, decorative moldings, jewel tones' },
    { slug: 'mid-century',  name: 'Mid-Century',  desc: 'Retro & clean',      details: 'walnut furniture with tapered legs, bold accent colors, clean geometric lines, a statement sideboard, retro 1960s vibe, warm wood tones' },
    { slug: 'bohemian',     name: 'Bohemian',     desc: 'Eclectic & lush',    details: 'layered textiles and rugs, rattan furniture, abundant plants, macrame, warm earthy tones, eclectic global patterns, cozy floor cushions' },
    { slug: 'scandinavian', name: 'Scandinavian', desc: 'Light & cozy',       details: 'light wood floors, white walls, a cozy grey sofa, soft throws, minimal decor, plenty of natural light, hygge atmosphere' },
    { slug: 'art-deco',     name: 'Art Deco',     desc: 'Glam & geometric',   details: 'bold geometric patterns, gold and brass accents, velvet upholstery, lacquered surfaces, symmetrical layout, glamorous statement lighting' },
  ],
  'garden': [
    { slug: 'zen',          name: 'Zen Japanese', desc: 'Calm & balanced',    details: 'raked gravel, stone lanterns, a small koi pond, bonsai and bamboo, moss, natural stone path, tranquil minimalist composition' },
    { slug: 'mediterranean',name: 'Mediterranean',desc: 'Sunny & rustic',     details: 'terracotta pots, whitewashed walls, olive and citrus trees, wrought iron furniture, stone paving, climbing bougainvillea, warm coastal vibe' },
    { slug: 'tropical',     name: 'Tropical',     desc: 'Lush & vibrant',     details: 'lush palms and monstera, teak loungers, rattan furniture, vibrant greenery, a resort atmosphere, natural wood decking' },
    { slug: 'cottage',      name: 'English Cottage', desc: 'Charming & floral', details: 'climbing roses, lush flowerbeds, a stone path, a wooden bench, trimmed hedges, charming romantic planting, soft daylight' },
    { slug: 'modern',       name: 'Modern Terrace', desc: 'Sleek & minimal',  details: 'clean lines, sleek minimalist planters, a built-in fire pit, modern outdoor sofa, neutral palette, large format paving, ambient lighting' },
  ],
  'bathroom': [
    { slug: 'spa',          name: 'Spa Minimalist', desc: 'Serene & calm',    details: 'serene natural stone, a freestanding soaking tub, soft diffused lighting, teak accents, plants, plush towels, minimalist tranquil atmosphere' },
    { slug: 'victorian',    name: 'Victorian',    desc: 'Classic & elegant',  details: 'a clawfoot tub, patterned encaustic floor tiles, vintage brass fixtures, wainscoting, an ornate mirror, classic elegant detailing' },
    { slug: 'modern-marble',name: 'Modern Marble',desc: 'Luxe & bright',      details: 'full marble surfaces, gold fixtures, a frameless glass shower, floating vanity, backlit mirror, luxurious bright finish' },
    { slug: 'moroccan',     name: 'Moroccan',     desc: 'Rich & patterned',   details: 'zellige tiles, arched niches, brass lanterns, rich warm colors, carved wood, patterned surfaces, exotic atmosphere' },
    { slug: 'industrial',   name: 'Industrial',   desc: 'Raw & moody',        details: 'concrete surfaces, exposed black piping, a matte black rainfall shower, reclaimed wood vanity, Edison bulbs, moody raw textures' },
  ],
  'bedroom': [
    { slug: 'scandinavian', name: 'Scandinavian', desc: 'Light & cozy',       details: 'light wood, white walls, a cozy linen bed, soft neutral textiles, minimal decor, warm natural light, hygge calm' },
    { slug: 'bohemian',     name: 'Bohemian',     desc: 'Layered & warm',     details: 'a macrame headboard, layered textiles, rattan accents, abundant plants, warm earthy tones, eclectic patterns, cozy ambient lighting' },
    { slug: 'victorian',    name: 'Victorian',    desc: 'Opulent & rich',     details: 'a tufted upholstered headboard, ornate dark wood furniture, patterned wallpaper, rich drapery, a chandelier, jewel-toned opulence' },
    { slug: 'modern-luxe',  name: 'Modern Luxe',  desc: 'Sleek & plush',      details: 'a sleek low platform bed, plush bedding, integrated mood lighting, marble nightstands, brass accents, refined neutral palette' },
    { slug: 'japandi',      name: 'Japandi',      desc: 'Serene & natural',   details: 'low natural-wood furniture, a muted palette, linen bedding, wabi-sabi simplicity, paper lighting, serene uncluttered calm' },
  ],
  'dining-room': [
    { slug: 'victorian',    name: 'Victorian',    desc: 'Formal & ornate',    details: 'an ornate dark wood dining table, upholstered high-back chairs, a grand chandelier, patterned wallpaper, gilded mirror, formal rich palette' },
    { slug: 'modern',       name: 'Modern',       desc: 'Clean & minimal',    details: 'a sleek minimalist dining table, designer chairs, a statement pendant light, neutral palette, clean uncluttered lines' },
    { slug: 'rustic',       name: 'Rustic',       desc: 'Warm & natural',     details: 'a chunky reclaimed-wood table, mismatched vintage chairs, warm earthy tones, exposed beams, a cozy farmhouse feel' },
    { slug: 'industrial',   name: 'Industrial',   desc: 'Raw & urban',        details: 'a reclaimed wood and steel table, metal chairs, exposed brick, Edison bulb lighting, concrete floor, urban loft vibe' },
    { slug: 'mediterranean',name: 'Mediterranean',desc: 'Sunny & rustic',     details: 'a rustic wooden table, woven chairs, whitewashed walls, terracotta accents, wrought iron details, warm coastal light' },
  ],
  'office': [
    { slug: 'modern',       name: 'Modern Minimalist', desc: 'Clean & focused', details: 'a sleek minimalist desk, an ergonomic chair, hidden cable management, a neutral palette, clean shelving, calm focused atmosphere' },
    { slug: 'industrial',   name: 'Industrial',   desc: 'Raw & bold',          details: 'a reclaimed wood and steel desk, exposed brick, black metal shelving, Edison bulb lighting, leather chair, urban loft feel' },
    { slug: 'scandinavian', name: 'Scandinavian', desc: 'Light & tidy',        details: 'light oak desk, white walls, minimal tidy shelving, soft textiles, plants, plenty of natural light, hygge calm' },
    { slug: 'mid-century',  name: 'Mid-Century',  desc: 'Retro & warm',        details: 'a walnut desk with tapered legs, a bold accent chair, retro 1960s decor, warm wood tones, clean geometric lines' },
    { slug: 'library',      name: 'Cozy Library', desc: 'Warm & classic',      details: 'floor-to-ceiling wooden bookshelves, a leather armchair, a warm desk lamp, rich wood paneling, a cozy scholarly atmosphere' },
  ],
  'kids': [
    { slug: 'playful',      name: 'Playful Modern', desc: 'Bright & fun',      details: 'bright cheerful colors, fun geometric shapes, a soft play rug, modern low storage, a cozy reading nook, playful lighting' },
    { slug: 'scandinavian', name: 'Scandinavian', desc: 'Soft & calm',         details: 'light wood, soft pastel accents, natural textiles, minimal cozy decor, a teepee, warm natural light, calm hygge feel' },
    { slug: 'adventure',    name: 'Adventure',    desc: 'Explorer theme',      details: 'an explorer theme with maps and a canvas tent, warm wood, mountain wall murals, cozy lighting, adventurous decor' },
    { slug: 'pastel',       name: 'Pastel Dream', desc: 'Soft & whimsical',    details: 'soft pastel colors, cloud and star motifs, a canopy bed, plush textiles, whimsical dreamy decor, gentle ambient lighting' },
    { slug: 'montessori',   name: 'Montessori',   desc: 'Natural & open',      details: 'low natural-wood open shelves, a floor bed, neutral calming tones, an open uncluttered floor, soft natural materials' },
  ],
};

function buildTheme(section, t) {
  const { room, baseId } = SECTIONS[section];
  return {
    id: `home-theme-${section}-${t.slug}`,
    name: t.name,
    description: t.desc,
    category: 'home',
    section,
    baseImageUrl: baseUrl(baseId),
    // Applied to the user's own room photo at transform time.
    prompt: `Transform this room into a ${t.name}-style ${room}. ${t.details}. Photorealistic, cohesive interior design, professional photography, high quality.`,
    // Image-to-image edit prompt that produces the theme thumbnail.
    editPrompt: `Redesign this ${room} in ${t.name} style. ${t.details}. Keep the existing room architecture, windows and camera perspective. Photorealistic, professional interior photography, cohesive, warm and inviting, high quality, 4K.`,
  };
}

/** Flat list of all themes (optionally filtered to one section). */
function getThemes(section) {
  const sections = section ? [section] : Object.keys(THEMES);
  const out = [];
  for (const s of sections) {
    if (!THEMES[s]) continue;
    THEMES[s].forEach((t, i) => {
      const built = buildTheme(s, t);
      built.sortOrder = i + 1;
      out.push(built);
    });
  }
  return out;
}

module.exports = { SECTIONS, THEMES, getThemes };
