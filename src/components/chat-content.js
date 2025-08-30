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
import { TypingLoader } from "@/components/ui/loader"
import { ScrollButton } from "@/components/ui/scroll-button"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ui/reasoning"
import { Source, SourceContent, SourceTrigger } from "@/components/ui/source"
import { Tool } from "@/components/ui/tool"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useVoiceRecording } from "@/hooks/useVoiceRecording"
import { useSimpleX } from "@/hooks/useSimpleXAuth"
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
  const [handleInput, setHandleInput] = useState(''); // For simple auth handle input
  const [showLoginInput, setShowLoginInput] = useState(false); // Control login input visibility
  const { user: userInfo, checked: authChecked, login, logout, loading } = useSimpleX();
  
  // Voice recording hook
  const { isRecording, transcripts, toggleRecording, getTranscriptText } = useVoiceRecording();

  // Whop iframe SDK hook
  const iframeSdk = useIframeSdk();

  // Store original prompt when recording starts
  const [originalPrompt, setOriginalPrompt] = useState('');

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

  const handleShowLoginInput = () => {
    setShowLoginInput(true);
  };

  const handleLogin = async () => {
    if (!handleInput.trim()) {
      toast.error('Please enter a Twitter handle');
      return;
    }

    try {
      await login(handleInput.trim());
      setHandleInput(''); // Clear input after successful login
      setShowLoginInput(false); // Hide input after successful login
      toast.success('Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Login failed');
    }
  };

  const handleCancelLogin = () => {
    setHandleInput('');
    setShowLoginInput(false);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
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
                    alt={userInfo?.name || 'User'}
                    className="h-8 w-8 rounded-full border"
                  />
                ) : null}
                <div className="text-sm text-muted-foreground mr-2">
                  {userInfo?.name} (@{userInfo?.username})
                </div>
                <Button variant="outline" className="rounded-full" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {showLoginInput ? (
                  <>
                    <div className="animate-in slide-in-from-right-2 duration-300">
                      <input
                        type="text"
                        placeholder="Enter Twitter handle (e.g., elonmusk)"
                        value={handleInput}
                        onChange={(e) => setHandleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleLogin();
                          } else if (e.key === 'Escape') {
                            handleCancelLogin();
                          }
                        }}
                        className="px-4 py-2 text-sm bg-black text-white border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={handleLogin}
                      disabled={loading || !handleInput.trim()}
                    >
                      {loading ? '...' : 'Login'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelLogin}
                      className="rounded-full h-8 w-8 p-0 text-gray-400 hover:text-white"
                    >
                      ×
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={handleShowLoginInput}
                    disabled={loading}
                  >
                    Login with X
                  </Button>
                )}
              </div>
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
              const isLastMessage = index === messages.length - 1;
              
              // Tool messages removed as per requirements
              
              // Handle assistant and user messages
              // Process parts in their original order for interleaved display
              const renderMessageParts = (msg) => {
                if (!msg.parts || !Array.isArray(msg.parts)) {
                  return null;
                }

                // Accumulate sources from all parts
                const allSources = [];
                msg.parts.forEach(part => {
                  // Collect sources from live search tool output
                  if (part.type === 'tool-liveSearch' && part.output && part.output.sources) {
                    allSources.push(...part.output.sources);
                  }
                });

                const renderedParts = msg.parts.map((part, partIndex) => {
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

                // Handle tweet tool output parts (createTweet only - single tweets)
                if (part.type === 'data-tool-output' && part.data) {
                  const tweetData = part.data;

                  // Handle error state
                  if (tweetData.status === 'error') {
                    return (
                      <div key={key} className="mb-4">
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-red-600 dark:text-red-400 text-sm">
                            {tweetData.text || 'An error occurred.'}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // Handle processing state
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

                  // Handle streaming and complete states with single tweet content
                  if (tweetData.text && (tweetData.status === 'streaming' || tweetData.status === 'complete')) {
                    const isStreaming = tweetData.status === 'streaming' && isLastMessage;

                    return (
                      <div key={key} className="mb-4">
                        <TweetMockup
                          index={tweetData.index || 0}
                          text={tweetData.text.trim()}
                          account={{
                            name: userInfo?.name || 'Your Name',
                            username: userInfo?.username || 'your_username',
                            verified: false,
                            avatar: userInfo?.profile_image_url
                          }}
                          onApply={(text) => {
                            navigator.clipboard.writeText(text);
                            toast.success('Tweet copied to clipboard!');
                          }}
                        >
                          <StreamingMessage
                            text={tweetData.text.trim()}
                            animate={isStreaming}
                            speed={30}
                          />
                        </TweetMockup>
                      </div>
                    );
                  }

                  // Fallback for data-tool-output parts without text content
                  return (
                    <div key={key} className="mb-4">
                      <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                        Loading...
                      </div>
                    </div>
                  );
                }

                // Handle fetch-tweets-tool output parts
                if (part.type === 'data-fetch-tweets-tool' && part.data) {
                  const fetchData = part.data;
                  // Handle error state
                  if (fetchData.status === 'error') {
                    return (
                      <div key={key} className="mb-4">
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-red-600 dark:text-red-400 text-sm">
                            {fetchData.text || 'An error occurred while fetching tweets.'}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // Handle tweets array - side-scrollable display
                  if (fetchData.tweets && Array.isArray(fetchData.tweets) && fetchData.tweets.length > 0) {
                    const tweets = fetchData.tweets;

                    return (
                      <div key={key} className="mb-4">
                      {/* Display individual tweet mockups as side-scrollable */}
                        <div className="overflow-x-auto pb-2">
                          <div className="flex gap-4 min-w-max">
                            {tweets.map((tweet, tweetIndex) => {
                              // Truncate tweet text to 100 characters with ellipsis
                              const truncatedText = tweet.text.length > 100 
                                ? tweet.text.substring(0, 100) + '...'
                                : tweet.text;
                              
                              return (
                                <div key={`${key}-tweet-${tweetIndex}`} className="flex-shrink-0 w-80">
                                  <TweetMockup
                                    index={tweetIndex}
                                    text={truncatedText}
                                    account={{
                                      name: tweet.author.replace('@', ''),
                                      username: tweet.author.replace('@', ''),
                                      verified: false,
                                      avatar: userInfo?.profile_image_url
                                    }}
                                    onApply={(text) => {
                                      // Copy the full original text, not truncated
                                      navigator.clipboard.writeText(tweet.text);
                                      toast.success('Tweet copied to clipboard!');
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }

                // Handle live search tool parts
                if (part.type === 'tool-liveSearch') {
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

                // Handle fetch tweets tool parts
                if (part.type === 'tool-fetchTweets') {
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

                // Handle write tweets tool parts
                if (part.type === 'tool-writeTweet') {
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
                      outputContent = 'Tweets written';
                    } else {
                      displayState = 'output-error';
                      errorText = toolOutput.error || 'Failed to write tweets';
                    }
                  } else if (toolState === 'input-available') {
                    displayState = 'input-streaming'; // Keep showing as processing
                  }

                  return (
                    <div key={key} className="mb-4">
                      <Tool
                        className="w-full"
                        toolPart={{
                          type: 'writeTweet',
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

                  // Return null for unknown part types
                  return null;
                });

                // Add loader above sources if last part has "start" or "reasoning"
                if (isLastMessage && msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0) {
                  const lastPart = msg.parts[msg.parts.length - 1];
                  if (lastPart.type && (lastPart.type.includes('start') || lastPart.type.includes('reasoning'))) {
                    renderedParts.push(
                      <div key={`${msg.id}-loader`} className="mb-2">
                        <TypingLoader size="sm" />
                      </div>
                    );
                  }
                }

                // Add sources at the end if any were found
                if (allSources.length > 0) {
                  renderedParts.push(
                    <div key={`${msg.id}-sources`} className="mt-2 mb-2 flex gap-2 overflow-x-auto pb-2">
                      {allSources.map((source, sourceIndex) => (
                        <div key={`${msg.id}-source-${sourceIndex}`} className="flex-shrink-0">
                          <Source href={source.url}>
                            <SourceTrigger showFavicon />
                            <SourceContent
                              title={source.title || source.url}
                              description={source.description || `Source ${sourceIndex + 1}`}
                            />
                          </Source>
                        </div>
                      ))}
                    </div>
                  );
                }

                return renderedParts;
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
            })}

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

