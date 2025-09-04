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
