import { generateText } from 'ai';

export const maxDuration = 30;

// POST: generate text using xai/grok-4 model
export async function POST(req, { params }) {
  const { experienceId } = await params;
  try {
    const body = await req.json();
    const { text } = body || {};

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text is required and must be a string' }), { status: 400 });
    }

    const userMessage = {
      role: 'user',
      content: text.trim()
    };

    const systemMessage = {
      role: 'system',
      content:
        'You write tweets. Output only a single tweet and nothing else. Keep it under 300 characters. The user will provide an unsatisfying tweet—rewrite it to be better. If additional instructions are provided, incorporate them. Do not add commentary, labels, quotes, or formatting; output the tweet text only.'
    };

    const result = await generateText({
      model: 'xai/grok-4',
      messages: [systemMessage, userMessage],
    });

    return new Response(
      JSON.stringify({ text: result.text }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[Generate Text Route][POST] Error:', e);
    return new Response(JSON.stringify({ error: 'Failed to generate text' }), { status: 500 });
  }
}
