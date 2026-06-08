/**
 * Prompt enrichment by design intent.
 *
 * Every template carries a `designIntent`:
 *   'transform' → redesign / restyle the room into the template's theme.
 *   'preserve'  → keep the room's existing design, furniture, layout and style
 *                 exactly as-is; apply ONLY the single described change.
 *
 * The two intents need OPPOSITE base instructions. The legacy single base
 * ("…only change the furniture, materials, textures, decor…") is correct for a
 * full restyle but actively breaks light-touch edits: "Add Plants" or "Sunset"
 * would also swap the sofa, repaint walls, etc. We therefore pick the base
 * instruction from the intent instead of baking opposite instructions into
 * every stored prompt.
 *
 * `classifyWorldIntent` is the single source of truth for the offline
 * classification migration (scripts/classify-design-intent.js) AND the runtime
 * fallback used when a design request doesn't carry an authoritative intent
 * (e.g. older app builds that only send the raw prompt text).
 */

// Phrases authored into preserve-type prompts. Any hit ⇒ the template keeps the
// existing room and applies a single change.
const PRESERVE_MARKERS = [
  'take this exact room',
  'keep this exact room',
  'keeping the existing',
  'keep all furniture',
  'keep all the furniture',
  'keeping all furniture',
  'replace only',
  'repaint only',
  'exactly the same but',
  'keep the furniture',
  'keeping the furniture',
  'keeping the same overall style', // "Spacious" functional tweak
  'same walls, same floor',
  'keep all existing',
];

// Functional home tweaks (id suffixes) that adjust ONE variable of an existing
// room. Belt-and-suspenders alongside the prompt markers above.
const PRESERVE_ID_SUFFIXES = [
  '-light-floor', '-dark-floor',
  '-light-wall', '-dark-wall',
  '-best-color', '-spacious',
];

/**
 * Infer intent purely from a prompt string. Returns 'preserve' on a marker hit,
 * otherwise null (caller decides the default).
 */
function inferIntentFromPrompt(prompt = '') {
  const p = String(prompt || '').toLowerCase();
  if (!p) return null;
  for (const m of PRESERVE_MARKERS) {
    if (p.includes(m)) return 'preserve';
  }
  return null;
}

/**
 * Authoritative classification for a SpecialtyWorld doc ({ id, prompt }).
 * Used by the migration to persist designIntent in the DB.
 */
function classifyWorldIntent(world = {}) {
  const id = String(world.id || '').toLowerCase();
  if (id.startsWith('tool-')) return 'preserve';
  if (PRESERVE_ID_SUFFIXES.some((s) => id.endsWith(s))) return 'preserve';
  return inferIntentFromPrompt(world.prompt) || 'transform';
}

/**
 * Resolve the intent to use for a generation. Prefers an explicit (DB-sourced)
 * designIntent; falls back to inferring from the prompt text; defaults to
 * 'transform' (the historical behaviour for styles and themed worlds).
 */
function resolveIntent({ designIntent, customPrompt } = {}) {
  if (designIntent === 'preserve' || designIntent === 'transform') return designIntent;
  return inferIntentFromPrompt(customPrompt) || 'transform';
}

const BASE_TRANSFORM =
  'Redesign this room while preserving the original architecture, windows, doors, walls, and camera angle. ' +
  'Keep the same room layout and perspective, only change the furniture, materials, textures, decor, and lighting. ' +
  'Produce a photorealistic high-resolution interior photograph.';

const BASE_PRESERVE =
  'Keep this room\'s existing interior design exactly as it is in the original photo: the same furniture and furniture style, ' +
  'the same layout and arrangement, the same walls, flooring, materials, colors, decor and overall look. ' +
  'Do NOT redesign, restyle, replace or rearrange the furniture, and do NOT change the room into a different style. ' +
  'Apply ONLY the single specific change described below — nothing else. ' +
  'Preserve the original architecture, windows, doors, camera angle and perspective. ' +
  'Produce a photorealistic high-resolution interior photograph.';

function baseInstructionFor(intent) {
  return intent === 'preserve' ? BASE_PRESERVE : BASE_TRANSFORM;
}

module.exports = {
  PRESERVE_MARKERS,
  PRESERVE_ID_SUFFIXES,
  inferIntentFromPrompt,
  classifyWorldIntent,
  resolveIntent,
  baseInstructionFor,
  BASE_TRANSFORM,
  BASE_PRESERVE,
};
