"use client"

import { useState, useEffect, memo } from 'react';
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { DotsLoader } from "@/components/ui/loader"
import { ScrollButton } from "@/components/ui/scroll-button"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ui/reasoning"
import { Source, SourceContent, SourceTrigger } from "@/components/ui/source"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useVoiceRecording } from "@/hooks/useVoiceRecording"
import { useXAuth } from "@/hooks/useXAuth"
import { useIframeSdk } from "@whop/react"
import { TweetMockup } from "@/components/ui/tweet-mockup"
import { StreamingMessage } from "@/components/ui/streaming-message"
import QuickTasks from "@/components/quick-tasks"
import {
  ArrowUp,
  Copy,
  Globe,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react"

export default function ChatContent({ messages, status, onSubmit, onStop, currentConversationId, experienceId }) {
  const [prompt, setPrompt] = useState('');
  const [messageVotes, setMessageVotes] = useState({}); // Track votes by message ID
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const { user: userInfo, checked: authChecked, logout: xLogout } = useXAuth();

  // Voice recording hook
  const { isRecording, transcripts, toggleRecording, getTranscriptText } = useVoiceRecording();

  // Whop iframe SDK hook
  const iframeSdk = useIframeSdk();

  // Store original prompt when recording starts
  const [originalPrompt, setOriginalPrompt] = useState('');

  // Listen for popup auth completion and refresh
  useEffect(() => {
    function onMessage(e) {
      if (e?.data && e.data.type === 'x-auth' && e.data.status === 'ok') {
        // Refresh the iframe/app to re-run auth check
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Real-time transcript updates
  useEffect(() => {
    if (isRecording) {
      const realTimeTranscript = getTranscriptText();
      if (realTimeTranscript.trim()) {
        // Append real-time transcript to original prompt
        setPrompt(originalPrompt + (originalPrompt ? ' ' : '') + realTimeTranscript);
      } else {
        // If no transcript yet, keep original prompt
        setPrompt(originalPrompt);
      }
    }
  }, [transcripts, isRecording, getTranscriptText, originalPrompt]);

  const handleSubmit = () => {
    if (prompt && prompt.trim()) {
      // Don't allow submission if conversation is being created
      if (currentConversationId?.startsWith('temp_')) {
        return;
      }
      onSubmit(prompt.trim(), { search: isSearchEnabled });
      setPrompt('');
    }
  };

  const handleSearchToggle = () => {
    setIsSearchEnabled(prev => !prev);
  };

  const handleVoiceRecording = () => {
    if (isRecording) {
      // Stop recording - transcript is already updated in real-time
      toggleRecording();
      const transcript = getTranscriptText();
      if (transcript.trim()) {
        toast.success('Voice transcribed successfully');
      }
      setOriginalPrompt(''); // Reset original prompt
    } else {
      // Start recording - store current prompt as original
      setOriginalPrompt(prompt);
      toggleRecording();
    }
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Message copied to clipboard');
  };

  const handleUpvote = (messageId) => {
    setMessageVotes(prev => ({
      ...prev,
      [messageId]: prev[messageId] === 'up' ? null : 'up'
    }));
    toast.success('Feedback received');
  };

  const handleDownvote = (messageId) => {
    setMessageVotes(prev => ({
      ...prev,
      [messageId]: prev[messageId] === 'down' ? null : 'down'
    }));
    toast.success('Feedback received');
  };

  const handleLogout = async () => {
    try {
      await xLogout();
      // If embedded, reload top-level to ensure a clean state
      if (typeof window !== 'undefined' && window.top) {
        window.top.location.reload();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (_) {}
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex flex-row items-center gap-2">
            <img src="/logo.png" alt="X doc" className="h-8 w-auto" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!authChecked ? null : userInfo ? (
              <>
                {userInfo?.profile_image_url ? (
                  <img
                    src={userInfo.profile_image_url}
                    alt={userInfo?.username || 'User'}
                    className="h-8 w-8 rounded-full border"
                  />
                ) : null}
                <Button variant="outline" className="rounded-full" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  const returnTo = `https://whop.com/experiences/${experienceId}`;
                  const authUrl = `/api/auth/x/authorize?mode=popup&return_to=${encodeURIComponent(returnTo)}`;
                  const w = 520, h = 720;
                  const topWin = window.top || window;
                  const y = topWin.outerHeight ? Math.max(0, (topWin.outerHeight - h) / 2) : 50;
                  const x = topWin.outerWidth ? Math.max(0, (topWin.outerWidth - w) / 2) : 50;
                  window.open(authUrl, 'x-auth', `popup=1,width=${w},height=${h},left=${x},top=${y}`);
                }}
              >
                Login with X
              </Button>
            )}
          </div>
      </header>

      <div className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {messages.length === 0 ? (
              <QuickTasks setPrompt={setPrompt} />
            ) : null}
            {messages.map((message, index) => {
              const isAssistant = message.role === "assistant";
              const isTool = message.role === "tool";
              const isLastMessage = index === messages.length - 1;
              
              // Handle tool messages (from database) - these are separate messages
              if (isTool && message.parts) {
                return message.parts.map((toolPart, toolPartIndex) => {
                  // Handle tool-result for writeTweet
                  if (toolPart.type === "tool-result" && toolPart.toolName === "writeTweet" && toolPart.output?.value?.content) {
                    const tweetContent = toolPart.output.value.content;
                    const threads = tweetContent.split('---').filter(t => t.trim());
                    const key = `${message.id || index}-tool-${toolPartIndex}`;
                    
                    return (
                      <Message
                        key={key}
                        className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-start"
                      >
                        <div className="group flex w-full flex-col gap-0">
                          <div className="mb-4 space-y-4">
                            {threads.map((thread, i) => (
                              <div key={`${key}-thread-${i}`} className="relative">
                                {/* Thread connector line */}
                                {i > 0 && (
                                  <div className="absolute left-[35px] top-0 w-0.5 bg-border h-4 -mt-2" />
                                )}
                                
                                <TweetMockup
                                  index={i}
                                  isConnectedBefore={i > 0}
                                  isConnectedAfter={i < threads.length - 1}
                                  threads={threads}
                                  text={thread.trim()}
                                  account={{
                                    name: userInfo?.name || 'Your Name',
                                    username: userInfo?.username || 'your_username',
                                    verified: false,
                                    avatar: userInfo?.profile_image_url
                                  }}
                                  onApply={(text, allThreads, index) => {
                                    navigator.clipboard.writeText(text);
                                    toast.success('Tweet copied to clipboard!');
                                  }}
                                >
                                  {/* No animation for database-loaded tweets */}
                                  <StreamingMessage 
                                    text={thread.trim()} 
                                    animate={false}
                                    speed={30}
                                  />
                                </TweetMockup>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Message>
                    );
                  }
                  return null;
                }).filter(Boolean);
              }             
              
              // Handle assistant and user messages
              if (!isTool) {
                // Process parts in their original order for interleaved display
                const renderMessageParts = (msg) => {
                  if (!msg.parts || !Array.isArray(msg.parts)) {
                    return null;
                  }

                  return msg.parts.map((part, partIndex) => {
                  const key = `${msg.id}-part-${partIndex}`;

                  // Handle text parts
                  if (part.type === 'text' && part.text) {
                    return (
                      <MessageContent
                        key={key}
                        className="text-foreground prose flex-1 rounded-lg bg-transparent p-0 mb-2"
                        markdown
                      >
                        {part.text}
                      </MessageContent>
                    );
                  }

                  // Handle reasoning parts
                  if (part.type === 'reasoning' && part.text) {
                    return (
                      <div key={key} className="mb-2">
                        <Reasoning isStreaming={isLastMessage && status === 'streaming'}>
                          <ReasoningTrigger>Thinking...</ReasoningTrigger>
                          <ReasoningContent
                            markdown
                            className="ml-2 border-l-2 border-l-slate-200 px-2 pb-1 dark:border-l-slate-700"
                          >
                            {part.text}
                          </ReasoningContent>
                        </Reasoning>
                      </div>
                    );
                  }

                  // Handle tweet tool output parts
                  if (part.type === 'data-tool-output' && part.data) {
                    const tweetData = part.data;
                    
                    // Handle loading state (processing)
                    if (tweetData.status === 'processing') {
                      return (
                        <div key={key} className="mb-4">
                          <TweetMockup 
                            index={tweetData.index || 0}
                            isLoading={true}
                            account={{
                              name: userInfo?.name || 'Your Name',
                              username: userInfo?.username || 'your_username',
                              verified: false,
                              avatar: userInfo?.profile_image_url
                            }}
                          />
                        </div>
                      );
                    }
                    
                    // Handle error state
                    if (tweetData.status === 'error') {
                      return (
                        <div key={key} className="mb-4">
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-red-600 dark:text-red-400 text-sm">
                              {tweetData.text || 'An error occurred while generating the tweet.'}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    
                    // Handle tweet content for all other statuses (streaming, complete, etc.)
                    if (tweetData.text) {
                      const threads = tweetData.text.split('---').filter(t => t.trim());
                      const isStreaming = tweetData.status === 'streaming' && isLastMessage;
                      
                      return (
                        <div key={key} className="mb-4 space-y-4">
                          {threads.map((thread, i) => (
                            <div key={`${key}-thread-${i}`} className="relative">
                              {/* Thread connector line */}
                              {i > 0 && (
                                <div className="absolute left-[35px] top-0 w-0.5 bg-border h-4 -mt-2" />
                              )}
                              
                              <TweetMockup
                                index={i}
                                isConnectedBefore={i > 0}
                                isConnectedAfter={i < threads.length - 1}
                                threads={threads}
                                text={thread.trim()}
                                account={{
                                  name: userInfo?.name || 'Your Name',
                                  username: userInfo?.username || 'your_username',
                                  verified: false,
                                  avatar: userInfo?.profile_image_url
                                }}
                                onApply={(text, allThreads, index) => {
                                  navigator.clipboard.writeText(text);
                                  toast.success('Tweet copied to clipboard!');
                                }}
                              >
                                {/* Only animate streaming for the last thread of the last message */}
                                <StreamingMessage 
                                  text={thread.trim()} 
                                  animate={isStreaming && i === threads.length - 1}
                                  speed={30}
                                />
                              </TweetMockup>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    
                    // Fallback for data-tool-output parts without text content
                    return (
                      <div key={key} className="mb-4">
                        <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                          Tweet generation in progress...
                        </div>
                      </div>
                    );
                  }

                  // Handle data sources parts
                  if (part.type === 'data-sources' && part.data && part.data.length > 0) {
                    return (
                      <div key={key} className="mt-2 mb-2 flex gap-2 overflow-x-auto pb-2">
                        {part.data.map((source, sourceIndex) => (
                          <div key={`${key}-source-${sourceIndex}`} className="flex-shrink-0">
                            <Source href={source.url}>
                              <SourceTrigger showFavicon />
                              <SourceContent
                                title={source.url}
                                description={`${source.sourceType} source`}
                              />
                            </Source>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  // Return null for unknown part types
                  return null;
                });
              };

              // Fallback for messages without parts structure
              const getFallbackContent = (msg) => {
                if (msg.parts && Array.isArray(msg.parts)) {
                  const textPart = msg.parts.find(part => part.type === 'text' && part.text);
                  return textPart ? textPart.text : '';
                }
                console.log('[Chat Content] Fallback content debug:', {
                  msgContent: msg.content,
                  msgContentType: typeof msg.content,
                  msgContentStringified: JSON.stringify(msg.content)
                });
                return msg.content || '';
              };

              const messageContent = renderMessageParts(message);
              const fallbackText = getFallbackContent(message);
              
              console.log('[Chat Content] Message render debug:', {
                messageId: message.id,
                hasMessageContent: messageContent && messageContent.length > 0,
                fallbackText,
                fallbackTextType: typeof fallbackText
              });

              return (
                <Message
                  key={message.id}
                  className={cn(
                    "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
                    isAssistant ? "items-start" : "items-end"
                  )}
                >
                  {isAssistant ? (
                    <div className="group flex w-full flex-col gap-0">
                      {/* Render parts in their original order */}
                      {messageContent && messageContent.length > 0 ? (
                        messageContent
                      ) : (
                        /* Fallback for messages without proper parts structure */
                        <MessageContent
                          className="text-foreground prose flex-1 rounded-lg bg-transparent p-0"
                          markdown
                        >
                          {fallbackText}
                        </MessageContent>
                      )}
                      
                      <MessageActions
                        className={cn(
                          "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                          isLastMessage && "opacity-100"
                        )}
                      >
                        <MessageAction tooltip="Copy" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => handleCopyMessage(fallbackText)}
                          >
                            <Copy />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Upvote" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => handleUpvote(message.id)}
                          >
                            <ThumbsUp className={cn(
                              messageVotes[message.id] === 'up' && "fill-white"
                            )} />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Downvote" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => handleDownvote(message.id)}
                          >
                            <ThumbsDown className={cn(
                              messageVotes[message.id] === 'down' && "fill-red-400"
                            )} />
                          </Button>
                        </MessageAction>
                      </MessageActions>
                    </div>
                  ) : (
                    <div className="group flex flex-col items-end gap-1">
                      <MessageContent className="bg-muted text-primary max-w-[95%] rounded-3xl px-5 py-2.5 sm:max-w-[90%]">
                        {fallbackText}
                      </MessageContent>
                      <MessageActions
                        className={cn(
                          "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                        )}
                      >
                        <MessageAction tooltip="Copy" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => handleCopyMessage(fallbackText)}
                          >
                            <Copy />
                          </Button>
                        </MessageAction>
                      </MessageActions>
                    </div>
                  )}
                </Message>
              );
              } // Close the if (!isTool) block
            })}
            {status === "submitted" && <LoadingMessage />}
          </ChatContainerContent>
          <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
            <ScrollButton className="shadow-sm" />
          </div>
        </ChatContainerRoot>
      </div>

      <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            isLoading={status === 'streaming' || status === 'submitted'}
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={handleSubmit}
            className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder={currentConversationId?.startsWith('temp_') ? "Creating conversation..." : "Ask anything"}
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                disabled={currentConversationId?.startsWith('temp_')}
              />

              <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip="Add a new action">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <Plus size={18} />
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="Search">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className={cn(
                        "rounded-full",
                        isSearchEnabled && "bg-white text-black hover:bg-gray-200 hover:text-black"
                      )}
                      onClick={handleSearchToggle}
                    >
                      <Globe size={18} />
                      Search
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="More actions">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <MoreHorizontal size={18} />
                    </Button>
                  </PromptInputAction>
                </div>
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip={isRecording ? "Stop recording" : "Voice input"}>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn(
                        "size-9 rounded-full",
                        isRecording && "bg-red-500 text-white hover:bg-red-600"
                      )}
                      onClick={handleVoiceRecording}
                    >
                      <Mic size={18} />
                    </Button>
                  </PromptInputAction>

                  <Button
                    size="icon"
                    disabled={!prompt.trim() || status === 'streaming' || status === 'submitted' || currentConversationId?.startsWith('temp_')}
                    onClick={handleSubmit}
                    className="size-9 rounded-full"
                  >
                    {(status === 'streaming' || status === 'submitted') ? (
                      <span className="size-3 rounded-xs bg-white" />
                    ) : (
                      <ArrowUp size={18} />
                    )}
                  </Button>
                </div>
              </PromptInputActions>
            </div>
          </PromptInput>
        </div>
      </div>
    </main>
  );
}

const LoadingMessage = memo(() => (
  <Message className="mx-auto flex w-full max-w-3xl flex-col items-start gap-2 px-6">
    <div className="group flex w-full flex-col gap-0">
      <div className="text-foreground prose w-full min-w-0 flex-1 rounded-lg bg-transparent p-0">
        <DotsLoader />
      </div>
    </div>
  </Message>
))

LoadingMessage.displayName = "LoadingMessage"
