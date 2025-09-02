// Batches 'text-delta' and 'reasoning-delta' UIMessageChunk events by word count
// with a time-based fallback. Preserves all other events as-is.

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
      // key: `${emitType}:${id}` where emitType is 'text-delta' or 'reasoning-delta'
      const buffers = new Map(); // key -> { emitType, id, text, words, lastEmitAt, providerMetadata }
      let closed = false;

      const flush = (key) => {
        const buf = buffers.get(key);
        if (!buf || !buf.text) return;
        controller.enqueue({ type: buf.emitType, id: buf.id, delta: buf.text, providerMetadata: buf.providerMetadata });
        buffers.set(key, { ...buf, text: '', words: 0, lastEmitAt: Date.now() });
      };

      const flushAll = () => {
        for (const key of buffers.keys()) flush(key);
      };

      const interval = setInterval(() => {
        if (closed) return;
        const now = Date.now();
        for (const [key, buf] of buffers) {
          if (buf.text && now - (buf.lastEmitAt || 0) >= maxLatencyMs) {
            flush(key);
          }
        }
      }, Math.max(100, Math.floor(maxLatencyMs / 2)));

      try {
        for await (const chunk of srcStream) {
          switch (chunk.type) {
            case 'text-start': {
              const key = `text-delta:${chunk.id}`;
              buffers.set(key, { emitType: 'text-delta', id: chunk.id, text: '', words: 0, lastEmitAt: Date.now(), providerMetadata: chunk.providerMetadata });
              controller.enqueue(chunk);
              break;
            }
            case 'text-delta': {
              const key = `text-delta:${chunk.id}`;
              const existing = buffers.get(key) || { emitType: 'text-delta', id: chunk.id, text: '', words: 0, lastEmitAt: Date.now(), providerMetadata: chunk.providerMetadata };
              const delta = chunk.delta ?? chunk.text ?? '';
              existing.text += delta;
              existing.words += countWords(chunk.delta);
              if (chunk.providerMetadata) existing.providerMetadata = chunk.providerMetadata;
              buffers.set(key, existing);

              if (existing.words >= wordsPerChunk) {
                flush(key);
              }
              break;
            }
            case 'text-end': {
              // Ensure any remaining text is flushed before ending
              flush(`text-delta:${chunk.id}`);
              controller.enqueue(chunk);
              break;
            }
            case 'reasoning-start': {
              const key = `reasoning-delta:${chunk.id}`;
              buffers.set(key, { emitType: 'reasoning-delta', id: chunk.id, text: '', words: 0, lastEmitAt: Date.now(), providerMetadata: chunk.providerMetadata });
              controller.enqueue(chunk);
              break;
            }
            case 'reasoning-delta': {
              const key = `reasoning-delta:${chunk.id}`;
              const existing = buffers.get(key) || { emitType: 'reasoning-delta', id: chunk.id, text: '', words: 0, lastEmitAt: Date.now(), providerMetadata: chunk.providerMetadata };
              const delta = chunk.delta ?? chunk.text ?? '';
              existing.text += delta;
              existing.words += countWords(delta);
              if (chunk.providerMetadata) existing.providerMetadata = chunk.providerMetadata;
              buffers.set(key, existing);

              if (existing.words >= wordsPerChunk) {
                flush(key);
              }
              break;
            }
            case 'reasoning-end': {
              flush(`reasoning-delta:${chunk.id}`);
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
        try { for (const key of buffers.keys()) flush(key); } catch {}
        controller.close();
      }
    },
  });
}
