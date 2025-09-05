"use client";

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ui/reasoning";
import { Source, SourceContent, SourceTrigger } from "@/components/ui/source";
import { TypingLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Copy, ThumbsDown, ThumbsUp } from "lucide-react";

import { TweetPartsRenderer } from "./TweetPartsRenderer";
import { ToolPartRenderer } from "./ToolPartRenderer";
import { Markdown } from "@/components/ui/markdown";
import { StreamingText } from "@/components/ui/streaming-text";
/**
 * Component for rendering individual messages with their complex part structures
 */
export function MessageRenderer({
  message,
  isLastMessage,
  status,
  userInfo,
  messageVotes,
  onCopyMessage,
  onUpvote,
  onDownvote,
}) {
  const isAssistant = message.role === "assistant";

  // Process parts in their original order for interleaved display
  const renderMessageParts = (msg) => {
    if (!msg.parts || !Array.isArray(msg.parts)) {
      return null;
    }

    // Accumulate sources from all parts
    const allSources = [];
    msg.parts.forEach((part) => {
      // Collect sources from live search tool output
      if (
        part.type === "tool-liveSearch" &&
        part.output &&
        part.output.sources
      ) {
        allSources.push(...part.output.sources);
      }
    });

    const renderedParts = msg.parts.map((part, partIndex) => {
      const key = `${msg.id}-part-${partIndex}`;

      // Handle text parts
      if (part.type === "text" && part.text) {
        return (
          <MessageContent
            key={key}
            className="text-foreground prose prose-sm prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-xs flex-1 rounded-lg bg-transparent mb-2 dark:prose-invert"
          >
            <StreamingText
              text={part.text}
              animate={isLastMessage && status === "streaming"}
              speed={110}
              markdown
            />
          </MessageContent>
        );
      }

      // Handle reasoning parts
      if (part.type === "reasoning" && part.text) {
        console.log("[MessageRenderer] Reasoning part content:", {
          type: part.type,
          text: part.text,
          textType: typeof part.text,
          isMarkdown:
            part.text.includes("#") ||
            part.text.includes("*") ||
            part.text.includes("`"),
          length: part.text.length,
        });
        return (
          <div key={key} className="mb-2">
            <Reasoning
              isStreaming={
                isLastMessage && status === "streaming" && part.state !== "done"
              }
            >
              <ReasoningTrigger>Thinking...</ReasoningTrigger>
              <ReasoningContent className="ml-2 border-l-2 border-l-slate-200 px-2 pb-1 dark:border-l-slate-700 prose prose-sm prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-xs dark:prose-invert">
                <Markdown>{part.text}</Markdown>
              </ReasoningContent>
            </Reasoning>
          </div>
        );
      }

      // Handle tweet-related parts
      if (
        part.type === "data-tool-output" ||
        part.type === "data-fetch-tweets-tool"
      ) {
        return (
          <TweetPartsRenderer
            key={key}
            part={part}
            userInfo={userInfo}
            isLastMessage={isLastMessage}
            keyPrefix={key}
          />
        );
      }

      // Handle tool parts (exclude writeTweet, handled via data-tool-output)
      if (part.type === "tool-liveSearch" || part.type === "tool-fetchTweets") {
        return <ToolPartRenderer key={key} part={part} keyPrefix={key} />;
      }

      // Return null for unknown part types
      return null;
    });

    // Add loader while any part is streaming in the last message
    if (
      isLastMessage &&
      msg.parts &&
      Array.isArray(msg.parts) &&
      msg.parts.some((p) => p && p.state === "streaming")
    ) {
      renderedParts.push(
        <div key={`${msg.id}-loader`} className="mb-2">
          <TypingLoader size="sm" />
        </div>,
      );
    }

    // Add sources at the end if any were found
    if (allSources.length > 0) {
      renderedParts.push(
        <div
          key={`${msg.id}-sources`}
          className="mt-2 mb-2 flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        >
          {allSources.map((source, sourceIndex) => (
            <div
              key={`${msg.id}-source-${sourceIndex}`}
              className="flex-shrink-0"
            >
              <Source href={source.url}>
                <SourceTrigger showFavicon />
                <SourceContent
                  title={source.title || source.url}
                  description={
                    source.description || `Source ${sourceIndex + 1}`
                  }
                />
              </Source>
            </div>
          ))}
        </div>,
      );
    }

    return renderedParts;
  };

  // Fallback for messages without parts structure
  const getFallbackContent = (msg) => {
    if (msg.parts && Array.isArray(msg.parts)) {
      const textPart = msg.parts.find(
        (part) => part.type === "text" && part.text,
      );
      return textPart ? textPart.text : "";
    }
    console.log("[Chat Content] Fallback content debug:", {
      msgContent: msg.content,
      msgContentType: typeof msg.content,
      msgContentStringified: JSON.stringify(msg.content),
    });
    return msg.content || "";
  };

  const messageContent = renderMessageParts(message);
  const fallbackText = getFallbackContent(message);
  const hasRenderable =
    (Array.isArray(messageContent) && messageContent.length > 0) ||
    (fallbackText && String(fallbackText).trim().length > 0);

  return (
    <Message
      key={message.id}
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
        isAssistant ? "items-start" : "items-end",
      )}
    >
      {isAssistant ? (
        <AssistantMessage
          messageContent={messageContent}
          fallbackText={fallbackText}
          isLastMessage={isLastMessage}
          status={status}
          hasRenderable={hasRenderable}
          messageVotes={messageVotes}
          messageId={message.id}
          onCopyMessage={onCopyMessage}
          onUpvote={onUpvote}
          onDownvote={onDownvote}
        />
      ) : (
        <UserMessage
          fallbackText={fallbackText}
          onCopyMessage={onCopyMessage}
        />
      )}
    </Message>
  );
}

function AssistantMessage({
  messageContent,
  fallbackText,
  isLastMessage,
  status,
  hasRenderable,
  messageVotes,
  messageId,
  onCopyMessage,
  onUpvote,
  onDownvote,
}) {
  // Show actions for assistant message only after the current response has finished
  // and there is something renderable. Prevents transient flash before first chunk.
  const canShowActions =
    (!isLastMessage || status === "ready") && !!hasRenderable;
  return (
    <div className="group flex w-full flex-col gap-0">
      {/* Render parts in their original order */}
      {messageContent && messageContent.length > 0 ? (
        messageContent
      ) : (
        /* Fallback for messages without proper parts structure */
        <MessageContent className="text-foreground prose prose-sm prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-xs flex-1 rounded-lg bg-transparent p-0 dark:prose-invert">
          <StreamingText
            text={fallbackText}
            animate={isLastMessage && status === "streaming"}
            speed={110}
            markdown
          />
        </MessageContent>
      )}

      {canShowActions && (
        <MessageActions
          className={cn(
            "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
            isLastMessage && "opacity-100",
          )}
        >
          <MessageAction tooltip="Copy" delayDuration={100}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => onCopyMessage(fallbackText)}
            >
              <Copy />
            </Button>
          </MessageAction>
          <MessageAction tooltip="Upvote" delayDuration={100}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => onUpvote(messageId)}
            >
              <ThumbsUp
                className={cn(messageVotes[messageId] === "up" && "fill-white")}
              />
            </Button>
          </MessageAction>
          <MessageAction tooltip="Downvote" delayDuration={100}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => onDownvote(messageId)}
            >
              <ThumbsDown
                className={cn(
                  messageVotes[messageId] === "down" && "fill-red-400",
                )}
              />
            </Button>
          </MessageAction>
        </MessageActions>
      )}
    </div>
  );
}

function UserMessage({ fallbackText, onCopyMessage }) {
  return (
    <div className="group flex flex-col items-end gap-1">
      <MessageContent className="not-prose inline-block break-normal whitespace-normal bg-muted text-primary max-w-[95%] rounded-3xl px-5 py-2.5 sm:max-w-[90%]">
        {fallbackText}
      </MessageContent>
      <MessageActions
        className={cn(
          "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
        )}
      >
        <MessageAction tooltip="Copy" delayDuration={100}>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => onCopyMessage(fallbackText)}
          >
            <Copy />
          </Button>
        </MessageAction>
      </MessageActions>
    </div>
  );
}
