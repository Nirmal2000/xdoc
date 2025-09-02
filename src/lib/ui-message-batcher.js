// Batches 'text-delta' UIMessageChunk events by word count with a time-based fallback.
// Preserves all non-text events as-is.

const DEFAULT_WORDS_PER_CHUNK = 10;
const DEFAULT_MAX_LATENCY_MS = 350;

function countWords(str) {
  return (str.match(/\S+/g) || []).length;
}

export function createTextDeltaBatcherStream(srcStream, options = {}) {
  const wordsPerChunk = options.wordsPerChunk ?? DEFAULT_WORDS_PER_CHUNK;
  const maxLatencyMs = options.maxLatencyMs ?? DEFAULT_MAX_LATENCY_MS;

  return new ReadableStream({
    async start(controller) {
      const buffers = new Map(); // id -> { text: string, words: number, lastEmitAt: number, providerMetadata: any }
      let closed = false;

      const flush = (id) => {
        const buf = buffers.get(id);
        if (!buf || !buf.text) return;
        controller.enqueue({ type: 'text-delta', id, delta: buf.text, providerMetadata: buf.providerMetadata });
        buffers.set(id, { text: '', words: 0, lastEmitAt: Date.now(), providerMetadata: buf.providerMetadata });
      };

      const flushAll = () => {
        for (const id of buffers.keys()) flush(id);
      };

      const interval = setInterval(() => {
        if (closed) return;
        const now = Date.now();
        for (const [id, buf] of buffers) {
          if (buf.text && now - (buf.lastEmitAt || 0) >= maxLatencyMs) {
            flush(id);
          }
        }
      }, Math.max(100, Math.floor(maxLatencyMs / 2)));

      try {
        for await (const chunk of srcStream) {
          switch (chunk.type) {
            case 'text-start': {
              buffers.set(chunk.id, { text: '', words: 0, lastEmitAt: Date.now(), providerMetadata: chunk.providerMetadata });
              controller.enqueue(chunk);
              break;
            }
            case 'text-delta': {
              const existing = buffers.get(chunk.id) || { text: '', words: 0, lastEmitAt: Date.now(), providerMetadata: chunk.providerMetadata };
              existing.text += chunk.delta;
              existing.words += countWords(chunk.delta);
              if (chunk.providerMetadata) existing.providerMetadata = chunk.providerMetadata;
              buffers.set(chunk.id, existing);

              if (existing.words >= wordsPerChunk) {
                flush(chunk.id);
              }
              break;
            }
            case 'text-end': {
              // Ensure any remaining text is flushed before ending
              flush(chunk.id);
              controller.enqueue(chunk);
              break;
            }
            case 'finish':
            case 'abort': {
              // Conservative: flush all pending buffers before forwarding
              flushAll();
              controller.enqueue(chunk);
              break;
            }
            default: {
              // Forward all non-text parts unchanged
              controller.enqueue(chunk);
            }
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        try { clearInterval(interval); } catch {}
        closed = true;
        // Final safety flush
        try { for (const id of buffers.keys()) flush(id); } catch {}
        controller.close();
      }
    },
  });
}

