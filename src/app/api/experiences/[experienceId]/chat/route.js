import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  generateId,
} from 'ai';
// import {xai} from "@ai-sdk/xai"
import { supabase } from '@/lib/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createTweetTool } from '@/lib/create-tweet-tool';
import { createFetchTweetsTool } from '@/lib/fetch-tweets-tool';
import { createLiveSearchTool } from '@/lib/live-search-tool';

export const maxDuration = 30;

export async function POST(req, { params }) {
  console.log('[Route] POST /api/experience/:experienceId')
  const { experienceId } = await params;
  const body = await req.json();
  const { messages, user_id, conversation_id, search, userSessionId, model, userHandle } = body;

  // Note: Rate limiting is primarily handled on the client side using localStorage
  // This ensures immediate feedback and reduces server load
  // Server-side validation could be added here if needed for additional security


  // Validate and set the AI model to use
  const aiModel = model || 'xai/grok-4';
  console.log('[Chat Route] Using AI model:', aiModel);

  if (!user_id) {
    throw new Error('user_id is required');
  }

  if (!messages || !Array.isArray(messages)) {
    throw new Error('messages is required and must be an array');
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

  // Save only the latest user message
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation_id,
        message: lastUserMessage
      });
  }

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      // Debug logging
      console.log('[Chat Route] Starting stream execution for user:', user_id);
      console.log('[Chat Route] Messages count:', messages.length);
      console.log('[Chat Route] Search enabled:', search);
      
      // Optionally write initial custom data here (e.g., a loading indicator)
      writer.write({
        type: 'data-notification',
        data: { message: 'Generating response...', level: 'info' },
        transient: true, // Transient parts don't persist in message history
      });

      // Create the tweet tool with writer access
      const writeTweet = createTweetTool({
        writer,
        ctx: {
          experienceId,
          userId: user_id,
          conversationId: conversation_id,
        },
      });
      
      // Create the fetch tweets tool with writer access
      const fetchTweets = createFetchTweetsTool({
        writer,
        ctx: {
          experienceId,
          userId: user_id,
          conversationId: conversation_id,
          userSessionId: userSessionId, // Pass userSessionId from client
        },
      });

      // Create the live search tool
      const liveSearch = createLiveSearchTool();

      // Read the base system prompt
      const baseSystemPrompt = readFileSync(join(process.cwd(), 'public', 'systemprompt.txt'), 'utf-8');
      
      // Prepare additional context
      let systemPromptAdditions = '';
      
      // Add Twitter handle if available
      // if (userHandle) {
      //   systemPromptAdditions += `My twitter handle is "@${userHandle}"\n`;
      // }
      
      // Add today's date
      const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      systemPromptAdditions += `Today's date is "${today}"\n`;
      
      // Combine system prompt with additions
      const finalSystemPrompt = systemPromptAdditions + baseSystemPrompt;
      
      console.log('[Chat Route] System prompt additions:', systemPromptAdditions);

      // Enhanced debugging for convertToModelMessages
      let convertedMessages;
      try {
        convertedMessages = convertToModelMessages(messages);
        // console.log('[Debug] convertToModelMessages succeeded, result:', JSON.stringify(convertedMessages, null, 2));
      } catch (error) {
        console.error('[Debug] Error in convertToModelMessages:', error);
        return; // Exit early to prevent further execution
      }

      const result = streamText({
        model: aiModel,
        messages: convertedMessages,
        system: finalSystemPrompt,
        stopWhen: stepCountIs(5),
        tools: {
          writeTweet,
          fetchTweets,
          liveSearch,
        },
        toolChoice: search ? { type: 'tool', toolName: 'liveSearch' } : 'auto',
        onFinish: async ({response, content, steps, sources, ...rest}) => {
          
          // Write conversation_id to the stream as a data part
          writer.write({
            type: 'data-conversationid',
            id: generateId(),
            data: {
              conversationId: conversation_id
            }
          });

          // console.log('[ChatUI onFinish] Response:', JSON.stringify(response.messages, null, 2))
        }
      });
      
      // Merge the text stream into the UI message stream
      writer.merge(result.toUIMessageStream());
    },
  });

  // Return the streaming response
  return createUIMessageStreamResponse({ stream });
}