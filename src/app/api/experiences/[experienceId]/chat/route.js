import { xai } from '@ai-sdk/xai';
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from 'ai';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export const maxDuration = 30;

export async function POST(req, { params }) {
  const { experienceId } = await params;
  const body = await req.json();
  const { messages, user_id, conversation_id } = body;


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

  const result = streamText({
    model: xai('grok-3-mini'),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    onFinish: async (result) => {      
      
      // Construct AI message in the same format as user messages
      const aiMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        parts: result.content || [],
        metadata: undefined
      };
      
      // Save AI message to database
      try {
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversation_id,
            message: aiMessage
          });
        console.log('AI message saved successfully');
      } catch (error) {
        console.error('Failed to save AI message:', error);
      }
    }
  });

  return result.toUIMessageStreamResponse();
}