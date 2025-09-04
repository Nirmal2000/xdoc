import { supabase } from '@/lib/supabase';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export const maxDuration = 30;

// POST: generate images via Gemini using a text+image prompt, upload to Supabase Storage,
// and append URLs to the specified data-tool-output part in the assistant message.
export async function POST(req, { params }) {
  const { experienceId } = await params;
  try {
    const body = await req.json();
    const { messageid, partid, image, string: textPrompt } = body || {};

    if (!messageid) return new Response(JSON.stringify({ error: 'messageid is required' }), { status: 400 });
    if (!partid) return new Response(JSON.stringify({ error: 'partid is required' }), { status: 400 });
    if (!image) return new Response(JSON.stringify({ error: 'image is required' }), { status: 400 });
    if (!textPrompt || typeof textPrompt !== 'string') {
      return new Response(JSON.stringify({ error: 'string (text prompt) is required' }), { status: 400 });
    }

    const userMsgId = `user-${Date.now()}`;
    const userMessage = {
      id: userMsgId,
      role: 'user',
      content: [
        { type: 'text', text: String(textPrompt).trim() },
        { type: 'image', image },
      ],
    };

    const result = await generateText({
      model: google('gemini-2.5-flash-image-preview'),
      messages: [userMessage],
    });

    const files = Array.isArray(result?.files) ? result.files : [];
    const imageFiles = files.filter((f) => f?.mediaType?.startsWith('image/'));

    const bucket = process.env.SUPABASE_STORAGE;
    if (!bucket) {
      return new Response(JSON.stringify({ error: 'SUPABASE_STORAGE env var not set' }), { status: 500 });
    }

    const uploadedUrls = [];
    const baseFolder = `gemini/${experienceId || 'global'}/${messageid}`;

    for (const [index, file] of imageFiles.entries()) {
      const extension = (file.mediaType?.split('/')?.[1] || 'png').toLowerCase();
      const filename = `image-${Date.now()}-${index}.${extension}`;
      const storagePath = `${baseFolder}/${filename}`;

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file.uint8Array, {
          contentType: file.mediaType || 'image/png',
          upsert: false,
        });
      if (upErr) {
        console.error('[Image Route][POST] Supabase upload failed:', upErr);
        continue;
      }

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      const publicUrl = pub?.publicUrl;
      if (publicUrl) uploadedUrls.push(publicUrl);
    }

    if (uploadedUrls.length > 0) {
      try {
        const { data: rows, error: selErr } = await supabase
          .from('messages')
          .select('id, message')
          .filter('message->>id', 'eq', String(messageid));
        if (selErr) throw selErr;

        if (Array.isArray(rows)) {
          for (const row of rows) {
            const current = row?.message || {};
            const parts = Array.isArray(current?.parts) ? current.parts.slice() : [];
            const idx = parts.findIndex(
              (p) => p && p.type === 'data-tool-output' && String(p.id) === String(partid)
            );
            if (idx !== -1) {
              const part = { ...(parts[idx] || {}) };
              const data = { ...(part.data || {}) };
              const urlList = Array.isArray(data.url) ? data.url.slice() : [];
              for (const u of uploadedUrls) urlList.push(u);
              data.url = urlList;
              parts[idx] = { ...part, data };

              await supabase
                .from('messages')
                .update({ message: { ...current, parts } })
                .eq('id', row.id);
            }
          }
        }
      } catch (e) {
        console.error('[Image Route][POST] Failed to append URLs to data-tool-output:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, uploaded: uploadedUrls.length, urls: uploadedUrls }),
      { status: 200 }
    );
  } catch (e) {
    console.error('[Image Route][POST] Error:', e);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), { status: 500 });
  }
}