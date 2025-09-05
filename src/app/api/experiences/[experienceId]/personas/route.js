import { supabase } from '@/lib/supabase';

// DELETE /api/experiences/[experienceId]/personas
// Body: { user_id: string, name: string }
export async function DELETE(req, { params }) {
  const { experienceId } = await params; // eslint-disable-line no-unused-vars
  const { user_id, name } = await req.json();

  if (!user_id || !name) {
    return new Response('user_id and name are required', { status: 400 });
  }

  const { error } = await supabase
    .from('personas')
    .delete()
    .eq('userid', user_id)
    .eq('name', name);

  if (error) {
    return new Response(`Failed to delete persona: ${error.message}`, { status: 500 });
  }

  return Response.json({ success: true });
}

