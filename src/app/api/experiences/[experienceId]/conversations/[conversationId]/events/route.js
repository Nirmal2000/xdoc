import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { experienceId, conversationId } = await params;
  const streamKey = `stream:chat:${experienceId}:${conversationId}`;

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };

  const stream = new ReadableStream({
    start: async (controller) => {
      const encoder = new TextEncoder();
      const send = (data, eventName, id) => {
        if (eventName) controller.enqueue(encoder.encode(`event: ${eventName}\n`));
        if (id) controller.enqueue(encoder.encode(`id: ${id}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Heartbeats keep connection alive
      const hb = setInterval(() => send({ t: Date.now() }, 'ping'), 15000);

      // Announce connection
      send({ type: 'connected', streamKey, mode: 'replay-from-start' });

      const client = getRedis();
      if (!client) {
        send({ type: 'error', message: 'Redis not configured' });
        controller.close();
        return;
      }
      if (!client.status || client.status === 'end') {
        try { await client.connect(); } catch {}
      }

      let closed = false;
      let cursor = '0-0';

      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      const readLoop = async () => {
        while (!closed) {
          try {
            const entries = await client.xrange(streamKey, `(${cursor}`, '+', 'COUNT', 100);
            if (Array.isArray(entries) && entries.length > 0) {
              for (const [id, fields] of entries) {
                cursor = id;
                let payload = null;
                for (let i = 0; i < fields.length; i += 2) {
                  const k = fields[i];
                  const v = fields[i + 1];
                  if (k === 'd') {
                    try { payload = JSON.parse(v); } catch { payload = null; }
                    break;
                  }
                }
                if (payload == null) continue;
                send(payload, undefined, id);
              }
            } else {
              // Idle: short sleep to avoid tight loop
              await sleep(120);
            }
          } catch (e) {
            send({ type: 'error', message: 'stream read error' });
            await sleep(250);
          }
        }
      };

      readLoop();

      const close = async () => {
        if (closed) return;
        closed = true;
        clearInterval(hb);
        try { controller.close(); } catch {}
      };

      req.signal.addEventListener('abort', close);
    },
    cancel: () => {},
  });

  return new Response(stream, { headers });
}
