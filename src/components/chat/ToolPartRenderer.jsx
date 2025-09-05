"use client"

import { Tool } from "@/components/ui/tool";

/**
 * Component for rendering different tool types (live search, fetch tweets, write tweet)
 */
export function ToolPartRenderer({ part, keyPrefix }) {
  const key = keyPrefix;

  // Handle live search tool parts
  if (part.type === 'tool-liveSearch') {
    return renderLiveSearchTool(part, key);
  }

  // Handle fetch tweets tool parts
  if (part.type === 'tool-fetchTweets') {
    return renderFetchTweetsTool(part, key);
  }

  // Handle create persona tool parts (mask input)
  if (part.type === 'tool-createPersona') {
    return renderCreatePersonaTool(part, key);
  }

  // Explicitly ignore writeTweet tool parts; handled via data-tool-output events
  if (part.type === 'tool-writeTweet') {
    return null;
  }

  return null;
}

function renderLiveSearchTool(part, key) {
  const toolState = part.state || 'input-streaming';
  const toolInput = part.input || {};
  const toolOutput = part.output;

  // Determine the appropriate state for the Tool component
  let displayState = 'input-streaming';
  let outputContent = undefined;
  let errorText = undefined;

  if (toolState === 'output-available' && toolOutput) {
    if (toolOutput.success) {
      displayState = 'output-available';
      outputContent = toolOutput.content;
    } else {
      displayState = 'output-error';
      errorText = toolOutput.error || 'Search failed';
    }
  } else if (toolState === 'input-available') {
    displayState = 'input-streaming'; // Keep showing as processing
  }

  return (
    <div key={key} className="mb-4">
      <Tool
        className="w-full"
        toolPart={{
          type: 'liveSearch',
          state: displayState,
          input: toolInput,
          output: outputContent,
          errorText: errorText,
          toolCallId: part.toolCallId
        }}
      />
    </div>
  );
}

function renderFetchTweetsTool(part, key) {
  const toolState = part.state || 'input-streaming';
  const toolInput = part.input || {};
  const toolOutput = part.output;

  // Determine the appropriate state for the Tool component
  let displayState = 'input-streaming';
  let outputContent = undefined;
  let errorText = undefined;

  if (toolState === 'output-available' && toolOutput) {
    if (toolOutput.success) {
      displayState = 'output-available';
      outputContent = 'Tweets fetched';
    } else {
      displayState = 'output-error';
      errorText = toolOutput.error || 'Failed to fetch tweets';
    }
  } else if (toolState === 'input-available') {
    displayState = 'input-streaming'; // Keep showing as processing
  }

  return (
    <div key={key} className="mb-4">
      <Tool
        className="w-full"
        toolPart={{
          type: 'fetchTweets',
          state: displayState,
          input: toolInput,
          output: outputContent,
          errorText: errorText,
          toolCallId: part.toolCallId
        }}
      />
    </div>
  );
}

// No renderer for writeTweet; TweetPartsRenderer handles data-tool-output

function renderCreatePersonaTool(part, key) {
  const toolState = part.state || 'input-streaming';
  const toolInput = part.input || {};
  const toolOutput = part.output;

  let displayState = 'input-streaming';
  let outputContent = undefined;
  let errorText = undefined;

  if (toolState === 'output-available' && toolOutput) {
    if (toolOutput.success) {
      displayState = 'output-available';
      const who = toolOutput.name || toolInput.name || 'persona';
      outputContent = `Persona created for ${who}`;
    } else {
      displayState = 'output-error';
      errorText = toolOutput.error || 'Failed to create persona';
    }
  } else if (toolState === 'output-error') {
    displayState = 'output-error';
    errorText = part.errorText || 'Failed to create persona';
  } else {
    displayState = 'input-streaming';
  }

  const name = toolInput.name || toolOutput?.name || 'persona';
  const maskedInput = { message: `Creating persona for ${name}` };

  return (
    <div key={key} className="mb-4">
      <Tool
        className="w-full"
        toolPart={{
          type: 'createPersona',
          state: displayState,
          input: maskedInput,
          output: outputContent,
          errorText: errorText,
          toolCallId: part.toolCallId,
        }}
      />
    </div>
  );
}
