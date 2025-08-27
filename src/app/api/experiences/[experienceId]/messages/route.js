import { supabase } from '@/lib/supabase';

export async function POST(req, { params }) {
  const { experienceId } = await params;
  const { conversation_id, message } = await req.json();

  if (!conversation_id) {
    throw new Error('conversation_id is required');
  }

  if (!message) {
    throw new Error('message is required');
  }

  // Save message to database
  const { error } = await supabase
    .from('messages')
    .insert({
      conversation_id,
      message
    });

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`);
  }

  return Response.json({ success: true });
}