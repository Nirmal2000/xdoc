import { generateId, tool } from 'ai';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

// Create the createPersona tool that stores a persona prompt for a user
export function createPersonaTool({ writer, ctx }) {
  return tool({
    description: 'Create and store a persona for the current user. Use after gathering enough information to draft a ~250-word persona prompt.',
    inputSchema: z.object({
      name: z.string().describe('The display name for the persona'),
      persona_prompt: z.string().describe('A concise ~250-word prompt describing behaviors, tone, and knowledge for the persona'),
    }),
    execute: async ({ name, persona_prompt }) => {
      const id = generateId();

      if (!ctx?.userId) {
        return { success: false, error: 'Missing user context' };
      }

      const cleanName = (name || '').trim();
      const cleanPrompt = (persona_prompt || '').trim();
      if (!cleanName || !cleanPrompt) {
        return { success: false, error: 'Both name and persona_prompt are required' };
      }

      try {
        // Upsert so saving the same name updates the existing persona
        const { error } = await supabase
          .from('personas')
          .upsert([
            { userid: ctx.userId, name: cleanName, persona_prompt: cleanPrompt }
          ], { onConflict: 'userid,name' });

        if (error) {          
          return { success: false, error: error.message };
        }

        return { success: true, name: cleanName };
      } catch (e) {
        return { success: false, error: e?.message || 'Unknown error' };
      }
    },
  });
}
