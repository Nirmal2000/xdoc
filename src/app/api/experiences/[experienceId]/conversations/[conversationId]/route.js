import { supabase } from '@/lib/supabase';

export async function GET(req, { params }) {
  const { experienceId, conversationId } = await params;

  // Load messages for this conversation
  const { data: messageRecords, error } = await supabase
    .from('messages')
    .select('message')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  // Extract message objects from JSONB column
  const messages = messageRecords.map(record => record.message);

  return Response.json({ messages });
}