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

// -------------------- Sorted-set helpers (live counters) --------------------

/** Increment a member's score in a sorted set (no-op when Redis is down). */
async function zincrby(key, member, amount = 1) {
  if (!isReady) return;
  try {
    await getClient().zincrby(key, amount, member);
  } catch {
    // ignore — a missed increment is acceptable
  }
}

/**
 * Return `[[member, score], ...]` ordered high→low.
 * Returns `null` when Redis is unavailable so callers can fall back to their
 * own source (vs `[]` which means "available but empty").
 */
async function zrevrangeWithScores(key, start = 0, stop = -1) {
  if (!isReady) return null;
  try {
    const flat = await getClient().zrevrange(key, start, stop, 'WITHSCORES');
    const out = [];
    for (let i = 0; i < flat.length; i += 2) {
      out.push([flat[i], Number(flat[i + 1])]);
    }
    return out;
  } catch {
    return null;
  }
}

/** Seed/overwrite member scores: `entries = [[member, score], ...]`. */
async function zadd(key, entries) {
  if (!isReady || !entries || entries.length === 0) return;
  try {
    const args = [];
    for (const [member, score] of entries) args.push(score, member);
    await getClient().zadd(key, ...args);
  } catch {
    // ignore
  }
}

function ready() { return isReady; }

// -------------------- Per-user token balance cache --------------------

const balanceKey = (userId) => `balance:${userId}`;

/** Invalidate a user's cached token balance (called on any token change). */
async function delBalance(userId) {
  if (!userId) return;
  await del(balanceKey(userId));
}

// Kick off a connection attempt early so we avoid a cold start on first call.
getClient();

module.exports = {
  get, set, del, remember, ready,
  zincrby, zrevrangeWithScores, zadd,
  balanceKey, delBalance,
};
