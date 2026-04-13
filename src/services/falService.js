/**
 * fal.ai AI Service
 *
 * Interior design image generation using fal.ai's nano-banana (edit) model.
 * Supports multiple API keys with automatic failover: if a key fails, the
 * service rotates to the next configured key and retries transparently.
 *
 * Configure keys in .env via FAL_API_KEYS as a comma-separated list:
 *   FAL_API_KEYS=key_1,key_2,key_3
 *
 * A single FAL_KEY is also supported for backwards compatibility.
 */

const { fal } = require('@fal-ai/client');
const { DESIGN_STYLES } = require('../config/constants');
const ApiKey = require('../models/ApiKey');

// --- Model tiers ---
// Free:  SAM 3.1 image (cheap, fast)
const FREE_MODEL = 'fal-ai/sam-3-1/image';
// PRO+:  nano-banana-2 (good quality)
const PRO_MODEL = 'fal-ai/nano-banana-2/edit';
// x5:    nano-banana-pro (best quality, 5x token cost)
const X5_MODEL = 'fal-ai/nano-banana-pro/edit';

// Tier config: name, model id, token cost
const MODEL_TIERS = {
  free:  { model: FREE_MODEL,  label: 'Free (SAM 3.1)',         cost: 1 },
  pro:   { model: PRO_MODEL,   label: 'PRO+ (nano-banana-2)',   cost: 2 },
  best:  { model: X5_MODEL,    label: 'BEST (nano-banana-pro)', cost: 3 },
};

// -------------------- API key rotation --------------------

function loadEnvKeys() {
  const raw = process.env.FAL_API_KEYS || process.env.FAL_KEY || '';
  return raw.split(',').map(k => k.trim()).filter(Boolean);
}

// Keys loaded from .env at startup (fallback)
let API_KEYS = loadEnvKeys();
let currentKeyIndex = 0;
let _keysLoadedFromDb = false;

/**
 * Load keys from MongoDB. Merges with .env keys (DB keys take priority).
 * Called lazily on first transform request.
 */
async function loadKeysFromDb() {
  if (_keysLoadedFromDb) return;
  try {
    const dbKeys = await ApiKey.find({ provider: 'fal', isActive: true }).lean();
    if (dbKeys.length > 0) {
      const dbKeyStrings = dbKeys.map(k => k.key);
      // DB keys first, then any .env keys not already in DB
      const envOnly = API_KEYS.filter(k => !dbKeyStrings.includes(k));
      API_KEYS = [...dbKeyStrings, ...envOnly];
      console.log(`🔑 Loaded ${dbKeys.length} fal.ai key(s) from DB, ${envOnly.length} from .env`);
    }
  } catch (e) {
    console.warn('⚠️  Could not load keys from DB, using .env:', e.message);
  }
  _keysLoadedFromDb = true;
}

/**
 * Track key usage in DB (fire-and-forget).
 */
function trackKeyUsage(key, error = null) {
  const update = { $inc: { usageCount: 1 }, lastUsedAt: new Date() };
  if (error) update.lastError = error;
  ApiKey.findOneAndUpdate({ provider: 'fal', key }, update).catch(() => {});
}

if (API_KEYS.length === 0) {
  console.warn(
    '⚠️  No fal.ai API keys in .env. Will try loading from DB on first request.'
  );
}

/**
 * Apply a given key to the fal client. fal.config is synchronous.
 */
function useKey(index) {
  const key = API_KEYS[index];
  fal.config({ credentials: key });
  return key;
}

/**
 * Mask a key for safe logging.
 */
function maskKey(key) {
  if (!key) return '(none)';
  if (key.length <= 8) return '***';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/**
 * Run an async fal operation with automatic key rotation on failure.
 * The function `fn` receives no args and should call `fal.*` directly — we
 * configure the credentials before invoking it.
 */
async function withKeyRotation(fn, { maxAttempts } = {}) {
  // Lazy-load keys from DB on first call
  await loadKeysFromDb();

  if (API_KEYS.length === 0) {
    throw new Error(
      'No fal.ai API keys configured. Add keys to DB or set FAL_API_KEYS in .env.'
    );
  }

  const attempts = maxAttempts || API_KEYS.length;
  let lastError = null;

  for (let i = 0; i < attempts; i++) {
    const index = (currentKeyIndex + i) % API_KEYS.length;
    const key = useKey(index);
    try {
      const result = await fn();
      // On success, remember the working key for the next call.
      currentKeyIndex = index;
      trackKeyUsage(key);
      return result;
    } catch (error) {
      lastError = error;
      const status =
        error?.status || error?.response?.status || error?.statusCode;
      console.warn(
        `⚠️  fal.ai key ${maskKey(key)} (index ${index}) failed` +
          (status ? ` with status ${status}` : '') +
          `: ${error.message}. Rotating to next key.`
      );
      trackKeyUsage(key, error.message);
      currentKeyIndex = (index + 1) % API_KEYS.length;
    }
  }

  throw new Error(
    `All fal.ai API keys failed (${attempts} attempts). Last error: ${
      lastError?.message || 'unknown'
    }`
  );
}

// -------------------- Prompt engineering --------------------

const STYLE_PROMPTS = {
  scandinavian:
    'Scandinavian interior design, nordic style, clean lines, natural light oak wood, white walls, minimalist furniture, hygge atmosphere, soft natural lighting, cozy textiles, plants, neutral color palette, functional design',
  modern:
    'Modern contemporary interior design, sleek furniture, clean geometric lines, neutral colors with bold accents, open space, large windows, polished surfaces, minimal decoration, sophisticated lighting, glass and metal elements',
  industrial:
    'Industrial interior design, exposed brick walls, metal pipes, concrete floors, raw materials, factory-style lighting, open ductwork, leather furniture, iron accents, urban loft style, vintage industrial elements',
  minimalist:
    'Minimalist interior design, ultra clean lines, monochromatic palette, essential furniture only, lots of white space, hidden storage, simple geometric shapes, zen atmosphere, natural light, uncluttered surfaces',
  luxury:
    'Luxury high-end interior design, premium materials, marble surfaces, gold accents, crystal chandeliers, velvet upholstery, rich textures, sophisticated color palette, designer furniture, elegant lighting',
  bohemian:
    'Bohemian interior design, eclectic mix, colorful textiles, global patterns, layered rugs, plants everywhere, macrame, rattan furniture, vintage pieces, artistic displays, warm earthy tones, cozy atmosphere',
  japanese:
    'Japanese interior design, zen minimalism, shoji screens, tatami elements, natural wood, bamboo accents, neutral earth tones, low furniture, indoor garden, clean lines, peaceful atmosphere, wabi-sabi aesthetic',
  mediterranean:
    'Mediterranean interior design, terracotta tiles, whitewashed walls, arched doorways, wrought iron details, blue accents, natural textures, rustic wood beams, coastal vibes, warm sunlight, olive and citrus tones',
};

const ROOM_PROMPTS = {
  living_room:
    'spacious living room, comfortable seating area, coffee table, entertainment area',
  bedroom:
    'cozy bedroom, comfortable bed, nightstands, wardrobe, relaxing atmosphere',
  kitchen:
    'modern kitchen, countertops, cabinets, appliances, cooking area, dining space',
  bathroom:
    'elegant bathroom, vanity, mirror, shower or bathtub, tiles, fixtures',
  dining_room:
    'dining room, dining table, chairs, lighting fixture, sideboard',
  home_office:
    'home office, desk, office chair, shelving, organized workspace, good lighting',
  outdoor:
    'outdoor living space, patio furniture, garden elements, natural surroundings',
  other: 'interior space, well-designed room',
};

function generatePrompt(style, roomType, customPrompt = '') {
  const stylePart = STYLE_PROMPTS[style] || STYLE_PROMPTS.modern;
  const roomPart = ROOM_PROMPTS[roomType] || ROOM_PROMPTS.other;

  const base =
    'Redesign this room while preserving the original architecture, windows, doors, walls, and camera angle. ' +
    'Keep the same room layout and perspective, only change the furniture, materials, textures, decor, and lighting. ' +
    'Produce a photorealistic high-resolution interior photograph.';

  return [base, stylePart, roomPart, customPrompt].filter(Boolean).join('. ');
}

// -------------------- Public API --------------------

/**
 * Ensure the image URL is publicly accessible.
 * If it's a localhost URL, upload to fal.ai storage first.
 */
async function ensurePublicUrl(imageUrl) {
  if (!imageUrl.includes('localhost') && !imageUrl.includes('127.0.0.1')) {
    return imageUrl; // Already public
  }

  console.log('📤 Local URL detected, uploading to fal.ai storage...');

  // Download from local server
  const http = require('http');
  const buffer = await new Promise((resolve, reject) => {
    http.get(imageUrl, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });

  // Upload to fal storage
  const falUrl = await fal.storage.upload(new Blob([buffer], { type: 'image/jpeg' }));
  console.log(`☁️ Uploaded to fal storage: ${falUrl}`);
  return falUrl;
}

/**
 * Transform an image using either the premium nano-banana model or the free
 * Flux dev image-to-image model, depending on the user's tier.
 *
 * @param {string} imageUrl - URL of the source image (can be local or public).
 * @param {object} options
 * @param {string} [options.tier='free'] - Model tier: 'free', 'pro', or 'best'
 * @param {boolean} [options.isPremium] - Legacy: true maps to 'pro', false to 'free'
 * @returns {Promise<{success: boolean, url: string, prompts: object, model: string, tier: string}>}
 */
async function transformImage(imageUrl, options = {}) {
  const {
    style = 'modern',
    roomType = 'living_room',
    customPrompt = '',
    isPremium,
  } = options;

  // Resolve tier: explicit tier > isPremium flag > default free
  let tier = options.tier;
  if (!tier) {
    tier = isPremium ? 'pro' : 'free';
  }
  const tierConfig = MODEL_TIERS[tier] || MODEL_TIERS.free;

  const prompt = generatePrompt(style, roomType, customPrompt);

  console.log(`🎨 fal.ai [${tierConfig.label}]: transforming with style "${style}"`);
  if (customPrompt) console.log(`✏️ Custom instructions: "${customPrompt}"`);
  console.log(`📝 Full prompt: ${prompt}`);

  const result = await withKeyRotation(async () => {
    const publicUrl = await ensurePublicUrl(imageUrl);

    if (tier === 'free') {
      // SAM 3.1 — uses image_url (singular)
      return fal.subscribe(FREE_MODEL, {
        input: {
          prompt,
          image_url: publicUrl,
          num_images: 1,
        },
        logs: false,
      });
    } else {
      // PRO+ and x5 — nano-banana style: uses image_urls (array)
      return fal.subscribe(tierConfig.model, {
        input: {
          prompt,
          image_urls: [publicUrl],
          num_images: 1,
          output_format: 'jpeg',
        },
        logs: false,
      });
    }
  });

  const data = result?.data || result;
  const images = data?.images || [];
  const firstUrl = images[0]?.url;

  if (!firstUrl) {
    throw new Error('fal.ai returned no image URL');
  }

  console.log(`✅ fal.ai [${tierConfig.label}] completed: ${firstUrl}`);

  return {
    success: true,
    url: firstUrl,
    prompts: { positive: prompt, negative: '' },
    model: tierConfig.model,
    tier,
  };
}

function getAvailableStyles() {
  return DESIGN_STYLES.map(style => ({
    ...style,
    prompts: {
      positive: STYLE_PROMPTS[style.id] || STYLE_PROMPTS.modern,
      negative: '',
    },
  }));
}

function getKeyStatus() {
  return {
    totalKeys: API_KEYS.length,
    currentIndex: currentKeyIndex,
    currentKey: maskKey(API_KEYS[currentKeyIndex]),
  };
}

module.exports = {
  MODEL_TIERS,
  FREE_MODEL,
  PRO_MODEL,
  X5_MODEL,
  transformImage,
  generatePrompt,
  getAvailableStyles,
  getKeyStatus,
  // exported for testing
  _withKeyRotation: withKeyRotation,
};
