import { generateText } from 'ai';

export const maxDuration = 10;

export async function POST(req, { params }) {
  try {
    const { experienceId } = await params;
    const { userMessage } = await req.json();

    if (!userMessage) {
      return Response.json({ error: 'User message is required' }, { status: 400 });
    }

    // Generate a concise topic based on the user's message
    const { text } = await generateText({
      model: 'xai/grok-3-mini',
      prompt: `Generate a concise topic in 2-3 words for this message: "${userMessage}". Only return the topic, nothing else.`,
      maxTokens: 20,
    });

    const topic = text.trim();

    return Response.json({ topic });
  } catch (error) {
    console.error('Error generating topic:', error);
    return Response.json({ error: 'Failed to generate topic' }, { status: 500 });
  }
}