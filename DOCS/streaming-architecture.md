# Streaming Architecture (E2E)

This document explains how assistant responses stream from the server to the UI, how timing/animation works, and recent changes to tweet rendering speed.

## Overview

- Server generates UI message events and publishes them to a Redis Stream per conversation.
- Client subscribes via Server‑Sent Events (SSE) to a conversation’s event feed, replays any missed entries, and assembles a live assistant message.
- UI components animate text locally (typewriter), independent of the raw network event rate.

## Server Side

- Entry: `src/app/api/experiences/[experienceId]/chat/route.js`
  - Starts background generation on POST.
  - Uses AI SDK `createUIMessageStream()` and merges a batching stream (`createTextDeltaBatcherStream`) to coalesce `text-delta`/`reasoning-delta` events (≈20 words or 120ms).
  - Publishes all stream chunks to Redis Stream: `stream:chat:<experienceId>:<conversationId>`.
  - Persists only completed parts to DB (text/reasoning on `*-end`, data parts when `status` is `complete`/`error`). See `src/lib/ui-stream-persister.js`.

- Tools
  - `writeTweet` → emits `data-tool-output` with statuses `processing → streaming → complete`, sending cumulative `text` during streaming.
  - `fetchTweets` → emits `data-fetch-tweets-tool` with incremental `tweets` arrays, chunked by words and streamed in parallel.

## Event Transport (SSE)

- Route: `src/app/api/experiences/[experienceId]/conversations/[conversationId]/events/route.js`
  - Streams entries from the Redis Stream as SSE.
  - Supports `?afterId=...` resume: seeks to the last matching part id (or toolCallId) and skips the exact entry so only the tail replays.
  - Sends `ping` heartbeats.

## Client Assembly

- Container: `src/components/chat-ui.js`
  - Connects SSE per active conversation; sets global `status` to `streaming` on most events and `ready` on `finish/abort`.
  - After loading DB messages on conversation switch, computes resume cursor (`afterId` + last assistant id) and primes the reducer.

- Reducer: `src/lib/ui-client-reducer.js`
  - Consumes UI stream chunks and assembles a single assistant message snapshot with ordered `parts` (text, reasoning, tool, data parts).
  - Buffers per‑part text until `*-end`; marks any `streaming` parts as `done` on `finish/abort`.

## Rendering and Animation

- Plain Assistant Text
  - Component: `StreamingText` in `src/components/ui/streaming-text.jsx`.
  - Animate gate: last message AND global `status === 'streaming'` AND part not `done`.
  - Speed: `110` (fast typewriter). The component animates toward the latest `text` prop at its own pace (not network‑paced).

- Reasoning
  - Rendered in a collapsible (`Reasoning`), not typewritten; `isStreaming` toggles loader state.

- Tweets
  - Single tweet from `writeTweet`: `TweetPartsRenderer.jsx` renders with `StreamingMessage`.
  - Animate gate: `tweetData.status === 'streaming'` AND last message.
  - Speed: UPDATED to `110` (was `30`) at `src/components/chat/TweetPartsRenderer.jsx`.
  - Note: When the tool emits `status: 'complete'`, animation stops and the full text shows (can appear as a “jump” if the last delta was large).

## Why Text Sometimes “Jumps” at the End

- Animation is client‑side. When a tool flips to `complete`, tweet animation stops and the component snaps to the final full text.
- For plain text, the higher speed (110) tends to catch up before `finish`, so the jump is less noticeable.

## Recent Change

- Tweet streaming speed aligned with assistant text: `StreamingMessage` speed changed to `110` in `TweetPartsRenderer.jsx` to provide a consistent typewriter feel.

## Potential Improvements (Optional)

- Align tweet animate gate with global `status` so it continues animating until `finish/abort`, reducing end‑of‑stream jumps.
- Let `StreamingMessage` continue animating to completion even if `animate` flips false mid‑way, then stop.
- Tune server batch sizes to emit smaller final deltas.

