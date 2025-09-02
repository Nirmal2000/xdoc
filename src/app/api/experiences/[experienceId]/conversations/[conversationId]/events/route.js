import { createSubscriber, closeSubscriber } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { experienceId, conversationId } = await params;
  const channel = `chat:${experienceId}:${conversationId}`;

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };

  const stream = new ReadableStream({
    start: async (controller) => {
      const encoder = new TextEncoder();
      const send = (data, eventName) => {
        if (eventName) {
          controller.enqueue(encoder.encode(`event: ${eventName}\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Heartbeats to keep connection alive
      const hb = setInterval(() => {
        // Emit explicit ping event so clients can observe
        send({ t: Date.now() }, 'ping');
      }, 15000);

      let sub = null;
      try {
        sub = await createSubscriber(channel, (msg) => {
          send(msg);
        });
        if (!sub) {
          send({ type: 'error', message: 'Redis not configured' });
        }
        // Immediately announce connection + channel for debugging
        send({ type: 'connected', channel });
      } catch (e) {
        send({ type: 'error', message: 'Subscription failed' });
      }

      const close = async () => {
        clearInterval(hb);
        await closeSubscriber(sub);
        try {
          controller.close();
        } catch {}
      };

      // If the client closes the connection, terminate
      req.signal.addEventListener('abort', close);
    },
    cancel: () => {},
  });

  return new Response(stream, { headers });
}
