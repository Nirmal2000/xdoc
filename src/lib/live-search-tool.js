import { generateText, generateId, tool } from 'ai';
import { z } from 'zod';
import { renderLiveSearchSystemPrompt } from '@/lib/prompts';

// Create the live search tool that performs web/news search using grok-3-mini
export function createLiveSearchTool() {
  return tool({
    description: 'Perform real-time web and news search to gather current information. Use this tool when users need up-to-date data, current events, or recent developments.',
    inputSchema: z.object({
      query: z.string().describe('The search query to perform - be specific and clear about what information is needed'),
    }),
    execute: async ({ query }) => {
      const generationId = generateId();

      // Debug logging
      console.log('[LiveSearch Tool] Starting execution with query:', query);

      // Validate query parameters
      if (!query || query.trim() === '') {
        console.error('[LiveSearch Tool] Error: query parameter is missing or empty');
        return {
          success: false,
          error: 'Query parameter is required',
        };
      }

      console.log('[LiveSearch Tool] Using query:', query.trim());

      try {        
        const searchPrompt = await renderLiveSearchSystemPrompt({ date: new Date().toLocaleDateString() });

        // Perform search using grok-3-mini with provider options for sources
        const { text, sources } = await generateText({
          model: 'perplexity/sonar',
          system: searchPrompt,
          prompt: query.trim()          
        });

        // Debug logging
        console.log('[LiveSearch Tool] Search completed successfully');

        return {
          success: true,
          content: text,
          sources: sources,
          query: query.trim(),
        };

      } catch (error) {
        console.error('[LiveSearch Tool] Error performing search:', error);

        return {
          success: false,
          error: `Search failed: ${error.message}`,
        };
      }
    },
  });
}
