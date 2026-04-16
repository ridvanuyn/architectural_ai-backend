/**
 * Thin Redis cache wrapper. Degrades to a no-op when Redis is unreachable
 * so the API keeps serving traffic straight from MongoDB.
 */
const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let client = null;
let isReady = false;

function getClient() {
  if (client) return client;
  client = new Redis(REDIS_URL, {
    // Fail fast instead of stalling API requests when Redis is down.
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    lazyConnect: false,
    enableOfflineQueue: false,
  });
  client.on('ready', () => {
    isReady = true;
    console.log('🟢 Redis connected:', REDIS_URL);
  });
  client.on('error', (err) => {
    if (isReady) {
      console.warn('Redis error:', err.message);
    }
    isReady = false;
  });
  client.on('end', () => { isReady = false; });
  return client;
}

async function get(key) {
  if (!isReady) return null;
  try {
    const raw = await getClient().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function set(key, value, ttlSeconds = 300) {
  if (!isReady) return;
  try {
    await getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Swallow — cache miss is always acceptable.
  }
}

async function del(...keys) {
  if (!isReady || keys.length === 0) return;
  try {
    await getClient().del(...keys);
  } catch {
    // ignore
  }
}

/**
 * Cache-aside helper. Runs `loader()` on miss and stores its result.
 */
async function remember(key, ttlSeconds, loader) {
  const cached = await get(key);
  if (cached !== null) return cached;
  const fresh = await loader();
  await set(key, fresh, ttlSeconds);
  return fresh;
}

function ready() { return isReady; }

// Kick off a connection attempt early so we avoid a cold start on first call.
getClient();

module.exports = { get, set, del, remember, ready };
