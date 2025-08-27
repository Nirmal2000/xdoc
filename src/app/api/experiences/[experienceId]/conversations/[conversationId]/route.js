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

export async function DELETE(req, { params }) {
  const { experienceId, conversationId } = await params;

  try {
    // Delete all messages for this conversation first
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (messagesError) {
      throw new Error(`Failed to delete messages: ${messagesError.message}`);
    }

    // Delete the conversation
    const { error: conversationError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (conversationError) {
      throw new Error(`Failed to delete conversation: ${conversationError.message}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}