NEXTJS ROUTE

import { xai } from '@ai-sdk/xai';
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: xai('grok-3'),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}


FRONTEND IN PROMPT KIT CHAT INTERFACE
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function Page() {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  const [input, setInput] = useState('');


use messages.map
each message has id, role (tool, user, ai)

The useChat hook returns a status. It has the following possible values:

submitted: The message has been sent to the API and we're awaiting the start of the response stream.
streaming: The response is actively streaming in from the API, receiving chunks of data.
ready: The full response has been received and processed; a new user message can be submitted.
error: An error occurred during the API request, preventing successful completion.


STOP BUTTON EXAMPLE
 <button onClick={stop} disabled={!(status === 'streaming' || status === 'submitted')}>Stop</button>

CALLBACKS 
const {
  /* ... */
} = useChat({
  onFinish: (message, { usage, finishReason }) => {
    console.log('Finished streaming message:', message);
    console.log('Token usage:', usage);
    console.log('Finish reason:', finishReason);
  },
  onError: error => {
    console.error('An error occurred:', error);
  },
  onData: data => {
    console.log('Received data part from server:', data);
  },
});




Custom headers, body, and credentials

const { messages, sendMessage } = useChat({
  transport: new DefaultChatTransport({
    api: 'next js route',    
    body: {
      user_id: '',
      conversation_id: '' (the row id from table)
      experience id: '' (from whop)
    },    
  }),
});