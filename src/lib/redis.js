let RedisClient = null;

// Lazy load ioredis if available
function getRedis() {
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

export async function publishRedis(channel, payload) {
  const client = getRedis();
  if (!client) return;
  try {
    if (!client.status || client.status === 'end') {
      await client.connect();
    }
    await client.publish(channel, JSON.stringify(payload));
  } catch (e) {
    console.error('[Redis] publish error:', e);
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
