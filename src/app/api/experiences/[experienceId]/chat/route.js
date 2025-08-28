import { xai } from '@ai-sdk/xai';
import {
  streamText,  
  convertToModelMessages,  
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
} from 'ai';
import { supabase } from '@/lib/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createTweetTool } from '@/lib/create-tweet-tool';

export const maxDuration = 30;

export async function POST(req, { params }) {
  const { experienceId } = await params;
  const body = await req.json();
  const { messages, user_id, conversation_id, search } = body;


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
      
      console.log('[Chat Route] WriteTweet tool created successfully');

      const result = streamText({
        model: xai('grok-4'),
        messages: convertToModelMessages(messages),
        system: readFileSync(join(process.cwd(), 'public', 'systemprompt.txt'), 'utf-8'),
        stopWhen: stepCountIs(5),
        tools: {
          writeTweet,
        },
        providerOptions: {
          xai: {
            searchParameters: {
              mode: search ? 'on' : 'off',
              returnCitations: search ? true : false,
              sources: search ? [
                {
                  type: 'news',
                },
              ] : [],
            },
          },
        },
        onFinish: async ({response, content, steps, sources, ...rest}) => {
          // Access the response after completion
          try {
            const resolvedResponse = await response;            
            
            // Send sources as a custom data part to the frontend
            writer.write({
              type: 'data-sources',
              data: sources,
            });

            // Save each message from resolvedResponse.messages as separate rows
            const messagesToInsert = [];
            
            if (resolvedResponse.messages && Array.isArray(resolvedResponse.messages)) {
              for (const message of resolvedResponse.messages) {
                // Convert content to parts structure if needed
                const messageWithParts = {
                  ...message,
                  id: crypto.randomUUID()
                };
                
                // If message has content instead of parts, convert it
                if (message.content && !message.parts) {
                  messageWithParts.parts = Array.isArray(message.content) ? message.content : [{
                    type: 'text',
                    text: String(message.content)
                  }];
                  // Remove content property to avoid confusion
                  delete messageWithParts.content;
                } else if (message.content && message.parts) {
                  // If both exist, prefer parts and remove content
                  delete messageWithParts.content;
                }
                
                messagesToInsert.push({
                  conversation_id: conversation_id,
                  message: messageWithParts
                });
              }
            }
            
            // Append sources as additional row if available
            if (sources && sources.length > 0) {
              const sourcesMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                parts: [{
                  type: 'data-sources',
                  data: sources,
                }]
              };
              
              messagesToInsert.push({
                conversation_id: conversation_id,
                message: sourcesMessage
              });
            }
            
            // Insert messages sequentially to avoid same timestamp from trigger
            if (messagesToInsert.length > 0) {
              console.log(`[Chat Route] Inserting ${messagesToInsert.length} messages sequentially`);
              
              for (let i = 0; i < messagesToInsert.length; i++) {
                const messageToInsert = messagesToInsert[i];
                
                try {
                  const { data, error } = await supabase
                    .from('messages')
                    .insert(messageToInsert)
                    .select();
                    
                  if (error) {
                    console.error(`[Chat Route] Supabase error for message ${i + 1}:`, error);
                  } else {
                    console.log(`[Chat Route] Message ${i + 1}/${messagesToInsert.length} saved:`, data?.[0]?.id);
                  }
                  
                  // Small delay to ensure different timestamps (only if not the last message)
                  if (i < messagesToInsert.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                  }
                } catch (error) {
                  console.error(`[Chat Route] Failed to save message ${i + 1}:`, error);
                }
              }
              
              console.log('[Chat Route] All messages inserted sequentially');
            }
          } catch (error) {
            console.error('[Chat Route] Error in onFinish:', error);
          }
        }
      });
      
      // Merge the text stream into the UI message stream
      writer.merge(result.toUIMessageStream());
    },
  });

  // Return the streaming response
  return createUIMessageStreamResponse({ stream });
}