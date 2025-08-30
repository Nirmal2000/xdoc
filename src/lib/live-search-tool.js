import { generateText, generateId, tool } from 'ai';
import { z } from 'zod';

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
        const searchPrompt = `
You are performing a search for the following query: "${query.trim()}"

Please provide comprehensive, accurate, and up-to-date information based on real-time search results. Focus on current facts, recent developments, and reliable sources. Structure your response in a clear, readable format.`;

        // Perform search using grok-3-mini with provider options for sources
        const { text, sources } = await generateText({
          model: 'xai/grok-3-mini',
          system: searchPrompt,
          prompt: query.trim(),
          providerOptions: {
            xai: {
              searchParameters: {
                mode: 'on',
                returnCitations: true,
                sources: [
                  {
                    type: 'web',
                  },
                  {
                    type: 'news',
                  },
                ],
              },
            },
          },
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