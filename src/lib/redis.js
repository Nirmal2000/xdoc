let RedisClient = null;

// Lazy load ioredis if available
export function getRedis() {
  if (RedisClient) return RedisClient;
  try {
    const Redis = require('ioredis');
    const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
    if (!url) {
      console.warn('[Redis] REDIS_URL/UPSTASH_REDIS_URL not set; Redis disabled');
      return null;
    }
    const client = new Redis(url, {
      lazyConnect: true,
      tls: url.startsWith('rediss://') ? {} : undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(1000 * 2 ** times, 15000),
      reconnectOnError: () => true,
    });
    client.on('connect', () => console.log('[Redis] connected'));
    client.on('end', () => console.warn('[Redis] connection ended'));
    client.on('error', (e) => console.error('[Redis] error', e?.message || e));
    RedisClient = client;
    return RedisClient;
  } catch (e) {
    console.warn('[Redis] ioredis not installed; Redis disabled');
    return null;
  }
}

function jsonReplacer(_key, value) {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  // Drop circular refs gracefully by relying on JSON.stringify default behavior with a try/catch higher up
  return value;
}

export async function publishRedis(channel, payload) {
  const client = getRedis();
  if (!client) return;
  try {
    if (!client.status || client.status === 'end') {
      await client.connect();
    }
    // Ensure non-JSON primitives (e.g., BigInt) don't break publishing
    const serialized = JSON.stringify(payload, jsonReplacer);
    await client.publish(channel, serialized);
  } catch (e) {
    console.error('[Redis] publish error:', e);
  }
}

// Publish to Redis Stream with optional trimming and TTL.
// - key: stream key (e.g., `stream:chat:<expId>:<convId>`)
// - payload: arbitrary JSON (serialized under field 'd')
// - options: { maxLen?: number, ttlSec?: number }
export async function publishStream(key, payload, options = {}) {
  const client = getRedis();
  if (!client) return null;
  const { maxLen = 2000, ttlSec = 600 } = options;
  try {
    if (!client.status || client.status === 'end') {
      await client.connect();
    }
    const data = JSON.stringify(payload, jsonReplacer);
    // XADD with approximate trimming to keep memory bounded
    const id = await client.xadd(key, 'MAXLEN', '~', String(maxLen), '*', 'd', data);
    if (ttlSec && ttlSec > 0) {
      try { await client.expire(key, ttlSec); } catch {}
    }
    return id;
  } catch (e) {
    console.error('[Redis] stream publish error:', e);
    return null;
  }
}

export async function createSubscriber(channel, onMessage) {
  const base = getRedis();
  if (!base) return null;
  const sub = base.duplicate();
  await sub.connect();
  // In ioredis, subscribe's callback is for subscribe confirmation, not messages.
  // Listen to 'message' for published payloads, then subscribe to the channel.
  sub.on('message', (chan, message) => {
    try {
      const parsed = JSON.parse(message);
      onMessage(parsed);
    } catch (e) {
      // Pass raw if not JSON
      onMessage(message);
    }
  });
  await sub.subscribe(channel);
  sub.on('error', (e) => console.error('[Redis sub] error', e?.message || e));
  sub.on('end', () => console.warn('[Redis sub] ended'));
  return sub;
}

export async function closeSubscriber(sub) {
  try {
    if (!sub) return;
    await sub.quit();
  } catch (e) {
    // ignore
  }
}
