// Client-side UI message stream reducer
// Consumes AI SDK UI data stream events and assembles a UIMessage snapshot.

export function createUIClientReducer({ getBaseParts } = {}) {
  let messageId = null;
  let parts = [];
  const textBuffers = new Map();
  const reasoningBuffers = new Map();

  const findPartIndexBy = (predicate) => parts.findIndex(predicate);

  const ensureBaseParts = (id) => {
    if (!id) return;
    if (messageId !== id) {
      messageId = id;
      const base = (typeof getBaseParts === 'function' ? getBaseParts(id) : null) || [];
      parts = Array.isArray(base) ? base.map((p) => ({ ...p })) : [];
    }
  };

  const snapshot = () => ({ id: messageId, role: 'assistant', parts: parts.filter((p) => !p?.transient) });

  const upsertToolPart = ({ toolName, toolCallId, patch, defaultState = 'input-available' }) => {
    // Ignore writeTweet tool entirely; handled via data-tool-output events
    if (toolName === 'writeTweet') return;
    if (!toolCallId) return;
    // Prefer existing part by toolCallId, otherwise infer type from toolName
    const existingIdx = findPartIndexBy((p) => p && p.toolCallId === toolCallId);
    // Sanitize inputs for specific tools
    let safePatch = { ...(patch || {}) };
    if (toolName === 'createPersona' && safePatch.input && typeof safePatch.input === 'object') {
      // Never expose persona_prompt in UI stream; keep only name
      const name = safePatch.input.name || 'persona';
      safePatch.input = { name };
    }
    if (existingIdx === -1) {
      const type = toolName ? `tool-${toolName}` : 'tool';
      parts.push({ type, toolCallId, state: defaultState, ...safePatch });
    } else {
      parts[existingIdx] = { ...parts[existingIdx], ...safePatch, toolCallId };
    }
  };

  const upsertDataPart = ({ type, id, data }) => {
    if (!type || !id) return;
    const idx = findPartIndexBy((p) => p && p.type === type && p.id === id);
    const next = { type, id, data };
    if (idx === -1) parts.push(next);
    else parts[idx] = next;
  };

  return {
    primeMessage(id) {
      ensureBaseParts(id);
      return snapshot();
    },
    handleEvent(ev) {
      const t = ev?.type;
      if (!t) return null;
      switch (t) {
        case 'connected':
        case 'ping':
          return null;
        case 'start': {
          if (ev.messageId) ensureBaseParts(ev.messageId);
          return snapshot();
        }
        case 'text-start': {
          ensureBaseParts(messageId || ev.messageId);
          if (!ev.id) return null;
          textBuffers.set(ev.id, '');
          const idx = findPartIndexBy((p) => p && p.type === 'text' && p.id === ev.id);
          const base = { type: 'text', id: ev.id, text: '', state: 'streaming' };
          if (idx === -1) parts.push(base);
          else parts[idx] = { ...parts[idx], state: 'streaming' };
          return snapshot();
        }
        case 'text-delta': {
          ensureBaseParts(messageId || ev.messageId);
          if (!ev.id || typeof ev.delta !== 'string') return null;
          const prev = textBuffers.get(ev.id) || '';
          const nextText = prev + ev.delta;
          textBuffers.set(ev.id, nextText);
          const idx = findPartIndexBy((p) => p && p.type === 'text' && p.id === ev.id);
          if (idx === -1) parts.push({ type: 'text', id: ev.id, text: nextText, state: 'streaming' });
          else parts[idx] = { ...parts[idx], text: nextText, state: 'streaming' };
          return snapshot();
        }
        case 'text-end': {
          ensureBaseParts(messageId || ev.messageId);
          if (!ev.id) return null;
          const text = textBuffers.get(ev.id) || '';
          textBuffers.delete(ev.id);
          const idx = findPartIndexBy((p) => p && p.type === 'text' && p.id === ev.id);
          if (idx === -1) parts.push({ type: 'text', id: ev.id, text, state: 'done' });
          else parts[idx] = { ...parts[idx], text, state: 'done' };
          return snapshot();
        }
        case 'reasoning-start': {
          ensureBaseParts(messageId || ev.messageId);
          if (!ev.id) return null;
          reasoningBuffers.set(ev.id, '');
          const idx = findPartIndexBy((p) => p && p.type === 'reasoning' && p.id === ev.id);
          const base = { type: 'reasoning', id: ev.id, text: '', state: 'streaming' };
          if (idx === -1) parts.push(base);
          else parts[idx] = { ...parts[idx], state: 'streaming' };
          return snapshot();
        }
        case 'reasoning-delta': {
          ensureBaseParts(messageId || ev.messageId);
          if (!ev.id || typeof ev.delta !== 'string') return null;
          const prev = reasoningBuffers.get(ev.id) || '';
          const nextText = prev + ev.delta;
          reasoningBuffers.set(ev.id, nextText);
          const idx = findPartIndexBy((p) => p && p.type === 'reasoning' && p.id === ev.id);
          if (idx === -1) parts.push({ type: 'reasoning', id: ev.id, text: nextText, state: 'streaming' });
          else parts[idx] = { ...parts[idx], text: nextText, state: 'streaming' };
          return snapshot();
        }
        case 'reasoning-end': {
          ensureBaseParts(messageId || ev.messageId);
          if (!ev.id) return null;
          const text = reasoningBuffers.get(ev.id) || '';
          reasoningBuffers.delete(ev.id);
          const idx = findPartIndexBy((p) => p && p.type === 'reasoning' && p.id === ev.id);
          if (idx === -1) parts.push({ type: 'reasoning', id: ev.id, text, state: 'done' });
          else parts[idx] = { ...parts[idx], text, state: 'done' };
          return snapshot();
        }
        case 'tool-input-available': {
          ensureBaseParts(messageId || ev.messageId);
          upsertToolPart({ toolName: ev.toolName, toolCallId: ev.toolCallId, patch: { input: ev.input, state: 'input-available' } });
          return snapshot();
        }
        case 'tool-output-available': {
          ensureBaseParts(messageId || ev.messageId);
          upsertToolPart({ toolName: ev.toolName, toolCallId: ev.toolCallId, patch: { output: ev.output, state: 'output-available' } });
          return snapshot();
        }
        case 'tool-output-error': {
          ensureBaseParts(messageId || ev.messageId);
          upsertToolPart({ toolName: ev.toolName, toolCallId: ev.toolCallId, patch: { errorText: String(ev.error || 'Tool error'), state: 'output-error' } });
          return snapshot();
        }
        default: {
          // data-* parts and other custom data
          if (typeof t === 'string' && t.startsWith('data-')) {
            ensureBaseParts(messageId || ev.messageId);
            upsertDataPart({ type: t, id: ev.id, data: ev.data });
            return snapshot();
          }
          return null;
        }
        case 'finish':
        case 'abort': {
          // Mark any streaming parts as done
          parts = parts.map((p) => (p && p.state === 'streaming' ? { ...p, state: 'done' } : p));
          return snapshot();
        }
      }
    },
  };
}
