import { xai } from '@ai-sdk/xai';
import {
  generateId,
  streamText,
  tool,
} from 'ai';
import { z } from 'zod';
import { renderTweetSystemPrompt } from '@/lib/prompts';

// Create the tweet tool that handles streaming content generation
export function createTweetTool({ writer, ctx }) {
  return tool({
    description: 'Generate compelling tweets or X posts with viral potential. Use this tool when users ask for tweet creation, content ideas, or X-related help.',
    inputSchema: z.object({
      topic: z.string().describe('The main topic or subject for the tweet'),
      instructions: z.string().describe('Style, tone, or specific instructions for the tweet'),
    }),
    execute: async ({ topic, instructions }) => {
      const generationId = generateId();
      const index = 0; // For now, using single index

      // Debug logging
      console.log('[WriteTweet Tool] Starting execution with params:', { topic, instructions });
      
      // Validate parameters
      if (!topic || topic.trim() === '') {
        console.error('[WriteTweet Tool] Error: topic parameter is missing or empty');
        const errorMessage = 'Error: No topic provided for tweet generation. Please specify what the tweet should be about.';
        
        writer.write({
          type: 'data-tool-output',
          id: generationId,
          data: {
            text: errorMessage,
            index,
            status: 'error',
            instructions: instructions || 'No instructions provided',
          },
        });
        
        return {
          success: false,
          error: 'Missing topic parameter',
        };
      }
      
      // Use default instructions if not provided
      const finalInstructions = instructions && instructions.trim() !== '' 
        ? instructions 
        : 'Create an engaging, viral-worthy tweet with good structure and relevant hashtags';

      console.log('[WriteTweet Tool] Using topic:', topic);
      console.log('[WriteTweet Tool] Using instructions:', finalInstructions);

      // Signal that we're starting to process
      writer.write({
        type: 'data-tool-output',
        id: generationId,
        data: {
          text: '',
          index,
          status: 'processing',
          instructions: finalInstructions,
        },
      });

      // Render system prompt from centralized template
      const systemPrompt = await renderTweetSystemPrompt({ date: new Date().toLocaleDateString() });

      const userMessage = `Create a single tweet about: ${topic}\n\nInstructions: ${finalInstructions}`;

      try {
        // Debug logging
        console.log('[WriteTweet Tool] System prompt:', systemPrompt);
        console.log('[WriteTweet Tool] User message:', userMessage);

        // Stream the tweet generation using XAI
        const result = streamText({
          model: 'xai/grok-4',
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userMessage,
            },
          ],
          temperature: 0.8, // Higher creativity for social media content
          maxTokens: 1000,
        });

        let fullText = '';
        const WORDS_PER_CHUNK = 10;
        let wordsSinceLastEmit = 0;

        // Stream the content as it generates, but batch by ~10 words
        for await (const textPart of result.textStream) {
          fullText += textPart;
          wordsSinceLastEmit += (textPart.match(/\S+/g) || []).length;

          if (wordsSinceLastEmit >= WORDS_PER_CHUNK) {
            writer.write({
              type: 'data-tool-output',
              id: generationId,
              data: {
                text: fullText,
                index,
                status: 'streaming',
                instructions: finalInstructions,
              },
            });
            wordsSinceLastEmit = 0;
          }
        }

        // Debug logging
        console.log('[WriteTweet Tool] Generated content:', fullText);

        // Signal completion (ensure final content is sent)
        writer.write({
          type: 'data-tool-output',
          id: generationId,
          data: {
            text: fullText,
            index,
            status: 'complete',
            instructions: finalInstructions,
          },
        });

        return {
          success: true,
          content: fullText,
          instructions: finalInstructions,
        };

      } catch (error) {
        console.error('[WriteTweet Tool] Error generating tweet:', error);
        
        // Signal error
        writer.write({
          type: 'data-tool-output',
          id: generationId,
          data: {
            text: 'Sorry, I encountered an error while generating your tweet. Please try again.',
            index,
            status: 'error',
            instructions: finalInstructions,
          },
        });

        return {
          success: false,
          error: error.message,
        };
      }
    },
  });
}
