import { supabase } from '@/lib/supabase';
import { generateText } from 'ai';

export const maxDuration = 30;

// POST: generate images via Gemini using a text+image prompt, upload to Supabase Storage,
// and append URLs to the specified data-tool-output part in the assistant message.
export async function POST(req, { params }) {
  const { experienceId } = await params;
  try {
    const body = await req.json();
    const { messageid, partid, image, string: textPrompt } = body || {};

    // if (!messageid) return new Response(JSON.stringify({ error: 'messageid is required' }), { status: 400 });
    // if (!partid) return new Response(JSON.stringify({ error: 'partid is required' }), { status: 400 });
    // if (!image) return new Response(JSON.stringify({ error: 'image is required' }), { status: 400 });
    if (!textPrompt || typeof textPrompt !== 'string') {
      return new Response(JSON.stringify({ error: 'string (text prompt) is required' }), { status: 400 });
    }

    const userMsgId = `user-${Date.now()}`;
    const content = [{ type: 'text', text: String(textPrompt).trim() }];
    if (image) {
      content.push({ type: 'image', image });
    }
    const userMessage = {
      id: userMsgId,
      role: 'user',
      content,
    };

    const result = await generateText({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [userMessage],
    });

    const files = Array.isArray(result?.files) ? result.files : [];
    const imageFiles = files.filter((f) => f?.mediaType?.startsWith('image/'));

    const bucket = process.env.SUPABASE_STORAGE;
    if (!bucket) {
      return new Response(JSON.stringify({ error: 'SUPABASE_STORAGE env var not set' }), { status: 500 });
    }

    const uploadedUrls = [];
    const baseFolder = `gemini/${experienceId || 'global'}/temp`; // temp folder since messageid disabled

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


    return new Response(
      JSON.stringify(uploadedUrls),
      { status: 200 }
    );
  } catch (e) {
    console.error('[Image Route][POST] Error:', e);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), { status: 500 });
  }
}