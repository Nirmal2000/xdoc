import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  stepCountIs,
} from 'ai';
// import {xai} from "@ai-sdk/xai"
import { after } from 'next/server';
import { supabase } from '@/lib/supabase';
import { renderChatSystemPrompt } from '@/lib/prompts';
import { createTweetTool } from '@/lib/create-tweet-tool';
import { createFetchTweetsTool } from '@/lib/fetch-tweets-tool';
import { createLiveSearchTool } from '@/lib/live-search-tool';
import { createPersonaTool } from '@/lib/create-persona-tool';
import { createTextDeltaBatcherStream } from '@/lib/ui-message-batcher';
import { publishStream, getRedis } from '@/lib/redis';
import { createUIStreamDBPersister } from '@/lib/ui-stream-persister';

export const maxDuration = 30;

export async function POST(req, { params }) {
  console.log('[Route] POST /api/experience/:experienceId')
  const { experienceId } = await params;
  const body = await req.json();
  const { user_id, conversation_id, search, userSessionId, model, persona, messages: clientMessages } = body;

  // Note: Rate limiting is primarily handled on the client side using localStorage
  // This ensures immediate feedback and reduces server load
  // Server-side validation could be added here if needed for additional security


  // Validate and set the AI model to use
  const aiModel = model || 'xai/grok-4';
  console.log('[Chat Route] Using AI model:', aiModel);

  if (!user_id) {
    throw new Error('user_id is required');
  }

  if (!conversation_id) {
    throw new Error('conversation_id is required');
  }

  // Ensure user exists in database (upsert)
  await supabase
    .from('users')
    .upsert({ 
      user_id,
      name: null,
      profile_picture_url: null
    }, { 
      onConflict: 'user_id',
      ignoreDuplicates: true
    });

  // Optionally load DB history if client did not send messages
  let dbHistory = null;
  if (!clientMessages || !Array.isArray(clientMessages)) {
    const { data, error: loadErr } = await supabase
      .from('messages')
      .select('message')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });
    if (loadErr) {
      console.error('[Chat Route] Failed to load history:', loadErr);
      return new Response('Failed to load history', { status: 500 });
    }
    dbHistory = data || [];
  }

  // Background generation (continues after response)
  after(async () => {
    const streamKey = `stream:chat:${experienceId}:${conversation_id}`;
    try {
      // Ensure only one active stream per conversation: clear any stale stream
      try {
        const client = getRedis();
        if (client) {
          if (!client.status || client.status === 'end') {
            await client.connect();
          }
          await client.del(streamKey);
        }
      } catch (e) {
        console.warn('[Chat Route] Failed to clear previous stream:', e?.message || e);
      }

      // Manual persistence handler (stores completed parts with ids)
      const persister = createUIStreamDBPersister({ conversationId: conversation_id });

      // Prefer client-sent messages to avoid redundant DB round trips
      const sourceMessages = clientMessages && Array.isArray(clientMessages)
        ? clientMessages
        : (dbHistory || []).map((m) => m.message);

      // Normalize content strings to parts for compatibility
      const normalized = (sourceMessages || []).map((m) => {
        if (m && Array.isArray(m.parts)) return m;
        if (m && typeof m.content === 'string') {
          return { ...m, parts: [{ type: 'text', text: m.content }] };
        }
        return m;
      });

      const modelMessages = convertToModelMessages(normalized);

      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          writer.write({ type: 'data-notification', data: { message: 'Generating response...', level: 'info' }, transient: true });

          const writeTweet = createTweetTool({ writer, ctx: { experienceId, userId: user_id, conversationId: conversation_id } });
          const fetchTweets = createFetchTweetsTool({ writer, ctx: { experienceId, userId: user_id, conversationId: conversation_id, userSessionId } });
          const liveSearch = createLiveSearchTool();
          const createPersona = createPersonaTool({ writer, ctx: { experienceId, userId: user_id, conversationId: conversation_id } });

          const systemPrompt = await renderChatSystemPrompt({ date: new Date().toLocaleDateString(), persona });
          const result = streamText({
            model: aiModel,
            messages: modelMessages,
            system: systemPrompt,
            stopWhen: stepCountIs(5),
            tools: { writeTweet, fetchTweets, liveSearch, createPersona },
            toolChoice: search ? { type: 'tool', toolName: 'liveSearch' } : 'auto',
            onFinish: async () => {},
          });

          // Stream full UIMessageChunk events, including reasoning, tools, and data parts
          const uiStream = result.toUIMessageStream();
          const batchedStream = createTextDeltaBatcherStream(uiStream, { wordsPerChunk: 20, maxLatencyMs: 120 });
          writer.merge(batchedStream);
        },
      });

      // Ensure publish ordering: collect non-terminal publishes, flush before terminal
      const inflight = [];
      for await (const chunk of stream) {
        try {
          // Persist completed parts based on protocol
          await persister.onChunk(chunk);
          if (chunk.type === 'finish' || chunk.type === 'abort') {
            // Flush inflight before publishing terminal event; keep stream key (TTL handles cleanup)
            await Promise.all(inflight.splice(0));
            await publishStream(streamKey, chunk, { maxLen: 2000, ttlSec: 900 });
          } else {
            // Fire-and-forget for all non-terminal chunks to avoid backpressure
            inflight.push(publishStream(streamKey, chunk, { maxLen: 2000, ttlSec: 900 }));
          }
        } catch (e) {
          console.error('[Chat Route] Redis stream publish error (sync):', e);
        }
      }
      // Do not publish an extra finish; the UIMessageStream already includes it
    } catch (error) {
      console.error('[Chat Route] Background generation error:', error);
      // Best-effort error signal into the stream
      try { publishStream(streamKey, { type: 'error', message: 'Generation failed' }, { maxLen: 2000, ttlSec: 900 }); } catch {}
    }
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
