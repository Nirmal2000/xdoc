import { supabase } from '@/lib/supabase';

// Manual assembler + DB persister for AI SDK UIMessage stream parts
// Stores completed parts only and includes part ids (id or toolCallId)
export function createUIStreamDBPersister({ conversationId }) {
  let assistantMessageId = null;
  const textBuffers = new Map();
  const reasoningBuffers = new Map();

  async function appendOrUpdatePart(predicate, createPart, patch) {
    if (!assistantMessageId) return;
    try {
      const { data: existing, error: selErr } = await supabase
        .from('messages')
        .select('id, message')
        .eq('conversation_id', conversationId)
        .filter('message->>id', 'eq', String(assistantMessageId))
        .maybeSingle();
      if (selErr) throw selErr;

      if (!existing) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          message: { id: String(assistantMessageId), role: 'assistant', parts: [createPart()] },
        });
        return;
      }

      const current = existing.message || {};
      const parts = Array.isArray(current.parts) ? current.parts.slice() : [];
      const idx = parts.findIndex(predicate);
      if (idx === -1) {
        parts.push(createPart());
      } else if (patch) {
        parts[idx] = { ...parts[idx], ...patch };
      }
      await supabase
        .from('messages')
        .update({ message: { ...current, id: current.id || String(assistantMessageId), role: current.role || 'assistant', parts } })
        .eq('id', existing.id);
    } catch (e) {
      console.error('[UIStreamPersister] appendOrUpdatePart failed:', e);
    }
  }

  async function appendPart(part) {
    if (!assistantMessageId) return; // cannot persist until message id is known
    try {
      const { data: existing, error: selErr } = await supabase
        .from('messages')
        .select('id, message')
        .eq('conversation_id', conversationId)
        .filter('message->>id', 'eq', String(assistantMessageId))
        .maybeSingle();
      if (selErr) throw selErr;
      if (!existing) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          message: { id: String(assistantMessageId), role: 'assistant', parts: [part] },
        });
      } else {
        const current = existing.message || {};
        const parts = Array.isArray(current.parts) ? current.parts.slice() : [];
        parts.push(part);
        await supabase
          .from('messages')
          .update({ message: { ...current, id: current.id || String(assistantMessageId), role: current.role || 'assistant', parts } })
          .eq('id', existing.id);
      }
    } catch (e) {
      console.error('[UIStreamPersister] appendPart failed:', e);
    }
  }

  async function upsertToolPart({ toolName, toolCallId, patch, defaultState = 'input-available' }) {
    // Persist all tool parts, including writeTweet, so DB has full state
    if (!assistantMessageId || !toolCallId) return;
    try {
      const { data: existing, error: selErr } = await supabase
        .from('messages')
        .select('id, message')
        .eq('conversation_id', conversationId)
        .filter('message->>id', 'eq', String(assistantMessageId))
        .maybeSingle();
      if (selErr) throw selErr;

      const inferType = (partsArr) => {
        if (toolName) return `tool-${toolName}`;
        const found = Array.isArray(partsArr)
          ? partsArr.find((p) => p && p.toolCallId === toolCallId && typeof p.type === 'string')
          : null;
        return found?.type || 'tool';
      };

      if (!existing) {
        const type = inferType([]);
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          message: {
            id: String(assistantMessageId),
            role: 'assistant',
            parts: [{ type, toolCallId, state: defaultState, ...(patch || {}) }],
          },
        });
        return;
      }

      const current = existing.message || {};
      const parts = Array.isArray(current.parts) ? current.parts.slice() : [];
      const idx = parts.findIndex((p) => p && p.toolCallId === toolCallId);
      if (idx === -1) {
        const type = inferType(parts);
        parts.push({ type, toolCallId, state: defaultState, ...(patch || {}) });
      } else {
        parts[idx] = { ...parts[idx], ...(patch || {}), toolCallId };
      }
      await supabase
        .from('messages')
        .update({ message: { ...current, id: current.id || String(assistantMessageId), role: current.role || 'assistant', parts } })
        .eq('id', existing.id);
    } catch (e) {
      console.error('[UIStreamPersister] upsertToolPart failed:', e);
    }
  }

  return {
    setMessageId(id) {
      assistantMessageId = id ? String(id) : null;
    },

    async onChunk(chunk) {
      try {
        switch (chunk?.type) {
          case 'start':
            if (chunk.messageId) this.setMessageId(chunk.messageId);
            break;
          case 'text-start':
            if (chunk.id) {
              textBuffers.set(chunk.id, '');
              // Append placeholder to preserve order
              await appendOrUpdatePart(
                (p) => p && p.type === 'text' && p.id === chunk.id,
                () => ({ type: 'text', id: chunk.id, text: '', state: 'streaming' })
              );
            }
            break;
          case 'text-delta':
            if (chunk.id && typeof chunk.delta === 'string') {
              const prev = textBuffers.get(chunk.id) || '';
              textBuffers.set(chunk.id, prev + chunk.delta);
            }
            break;
          case 'text-end': {
            if (!chunk.id) break;
            const text = textBuffers.get(chunk.id) || '';
            textBuffers.delete(chunk.id);
            // Update placeholder in place
            await appendOrUpdatePart(
              (p) => p && p.type === 'text' && p.id === chunk.id,
              () => ({ type: 'text', id: chunk.id, text, state: 'done' }),
              { text, state: 'done' }
            );
            break;
          }
          case 'reasoning-start':
            if (chunk.id) {
              reasoningBuffers.set(chunk.id, '');
              // Append placeholder to preserve order
              await appendOrUpdatePart(
                (p) => p && p.type === 'reasoning' && p.id === chunk.id,
                () => ({ type: 'reasoning', id: chunk.id, text: '', state: 'streaming' })
              );
            }
            break;
          case 'reasoning-delta':
            if (chunk.id && typeof chunk.delta === 'string') {
              const prev = reasoningBuffers.get(chunk.id) || '';
              reasoningBuffers.set(chunk.id, prev + chunk.delta);
            }
            break;
          case 'reasoning-end': {
            if (!chunk.id) break;
            const text = reasoningBuffers.get(chunk.id) || '';
            reasoningBuffers.delete(chunk.id);
            // Update placeholder in place
            await appendOrUpdatePart(
              (p) => p && p.type === 'reasoning' && p.id === chunk.id,
              () => ({ type: 'reasoning', id: chunk.id, text, state: 'done' }),
              { text, state: 'done' }
            );
            break;
          }
          case 'tool-input-available': {
            if (!chunk.toolCallId) break;
            await upsertToolPart({
              toolName: chunk.toolName,
              toolCallId: chunk.toolCallId,
              patch: { state: 'input-available', input: chunk.input },
              defaultState: 'input-available',
            });
            break;
          }
          case 'tool-output-available': {
            if (!chunk.toolCallId) break;
            await upsertToolPart({
              toolName: chunk.toolName,
              toolCallId: chunk.toolCallId,
              // Store raw object; DB uses JSONB, renderer will consume object
              patch: { state: 'output-available', output: chunk.output ?? null },
              defaultState: 'input-available',
            });
            break;
          }
          case 'tool-output-error': {
            if (!chunk.toolCallId) break;
            // Ensure an input part exists; then mark error
            await upsertToolPart({
              toolName: chunk.toolName,
              toolCallId: chunk.toolCallId,
              patch: { state: 'output-error', errorText: String(chunk.error || 'Tool error') },
              defaultState: 'input-available',
            });
            break;
          }
          default: {
            // Persist custom data-* parts only when they are done (complete or error)
            if (typeof chunk?.type === 'string' && chunk.type.startsWith('data-')) {
              const id = chunk?.id;
              const data = chunk?.data;
              const status = data?.status;
              if (id && data && (status === 'complete' || status === 'error')) {
                await appendPart({ type: chunk.type, id, data });
              }
            }
            break;
          }
        }
      } catch (e) {
        console.error('[UIStreamPersister] onChunk error:', e);
      }
    },
  };
}
