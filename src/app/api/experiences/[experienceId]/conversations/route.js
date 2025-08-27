import { supabase } from '@/lib/supabase';

export async function POST(req, { params }) {
  const { experienceId } = await params;
  const { user_id } = await req.json();

  if (!user_id) {
    throw new Error('user_id is required');
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

  // Create new conversation
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      user_id,
      experience_id: experienceId,
      title: 'New Chat'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return Response.json({ conversation_id: conversation.id });
}