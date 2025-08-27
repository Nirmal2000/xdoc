"use client"

import { useState } from 'react';
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
import { ScrollButton } from "@/components/ui/scroll-button"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
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

export default function ChatContent({ messages, status, onSubmit, onStop, currentConversationId }) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (prompt && prompt.trim()) {
      onSubmit(prompt.trim());
      setPrompt('');
    }
  };
  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex flex-row items-center gap-2">
            <img src="/logo.png" alt="X doc" className="h-8 w-auto" />
          </div>
      </header>

      <div className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {messages.length === 0 ? (
              <div className="mx-auto max-w-3xl w-full text-left px-6">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Quick Tasks</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div
                      className="relative overflow-hidden cursor-pointer group"
                      style={{ borderRadius: '1.27rem' }}
                      onClick={() => {
                        const prompt = "Please analyze my X/Twitter account comprehensively. Evaluate my content strategy, posting frequency, engagement patterns, audience demographics, content quality, and provide actionable recommendations for improvement. Include metrics analysis, competitor comparison, and specific suggestions to grow my presence on X.";
                        setPrompt(prompt);
                      }}
                    >
                      <img src="/eval.png" alt="Evaluate your X" className="w-full h-auto" style={{ borderRadius: '1.27rem' }} />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '1.27rem' }}></div>
                      <div className="absolute bottom-4 left-4 text-white font-semibold">
                        Evaluate your X
                      </div>
                    </div>
                    <div
                      className="relative overflow-hidden cursor-pointer group"
                      style={{ borderRadius: '1.27rem' }}
                      onClick={() => {
                        const prompt = "Help me create a compelling X/Twitter persona. Based on my interests, goals, and target audience, develop a unique personality with consistent voice, tone, and communication style. Include bio suggestions, content themes, posting schedule, and engagement strategies that will make my profile stand out and attract the right followers.";
                        setPrompt(prompt);
                      }}
                    >
                      <img src="/persona.png" alt="Create Persona" className="w-full h-auto" style={{ borderRadius: '1.27rem' }} />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '1.27rem' }}></div>
                      <div className="absolute bottom-4 left-4 text-white font-semibold">
                        Create Persona
                      </div>
                    </div>
                    <div
                      className="relative overflow-hidden cursor-pointer group"
                      style={{ borderRadius: '1.27rem' }}
                      onClick={() => {
                        const prompt = "Create a viral-worthy X/Twitter post for me. Analyze current trending topics, viral content patterns, and engagement strategies. Generate 3-5 different post variations with compelling hooks, emotional triggers, timing suggestions, and hashtag strategies. Include psychological triggers and formatting tips to maximize engagement and shares.";
                        setPrompt(prompt);
                      }}
                    >
                      <img src="/viraltweet.png" alt="Create Viral X" className="w-full h-auto" style={{ borderRadius: '1.27rem' }} />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '1.27rem' }}></div>
                      <div className="absolute bottom-4 left-4 text-white font-semibold">
                        Create Viral X
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-4">Coming Soon</h2>
                  <div className="custom-scrollbar flex space-x-2 overflow-x-auto pb-4">
                    <div className="flex-shrink-0 w-36 h-24 relative overflow-hidden cursor-pointer group" style={{ borderRadius: '0.8rem' }}>
                      <img src="/hastag.png" alt="tag Research" className="w-full h-full object-cover" style={{ borderRadius: '0.8rem' }} />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '0.8rem' }}></div>
                      <div className="absolute bottom-2 left-2 text-white text-xs font-semibold">
                        Hashtag Search
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-36 h-24 relative overflow-hidden cursor-pointer group" style={{ borderRadius: '0.8rem' }}>
                      <img src="/niche.png" alt="Niche News" className="w-full h-full object-cover" style={{ borderRadius: '0.8rem' }} />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '0.8rem' }}></div>
                      <div className="absolute bottom-2 left-2 text-white text-xs font-semibold">
                        Niche News
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-36 h-24 relative overflow-hidden cursor-pointer group" style={{ borderRadius: '0.8rem' }}>
                      <img src="/shadowban.png" alt="Shadowban Check" className="w-full h-full object-cover" style={{ borderRadius: '0.8rem' }} />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '0.8rem' }}></div>
                      <div className="absolute bottom-2 left-2 text-white text-xs font-semibold">
                        Shadowban Check
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-36 h-24 relative overflow-hidden cursor-pointer group" style={{ borderRadius: '0.8rem' }}>
                      <img src="/viral.png" alt="Viral News" className="w-full h-full object-cover" style={{ borderRadius: '0.8rem' }} />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '0.8rem' }}></div>
                      <div className="absolute bottom-2 left-2 text-white text-xs font-semibold">
                        Viral News
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {messages.map((message, index) => {
              const isAssistant = message.role === "assistant";
              const isLastMessage = index === messages.length - 1;
              
              // Extract text from parts array
              const getMessageText = (msg) => {
                if (msg.parts && Array.isArray(msg.parts)) {
                  const textPart = msg.parts.find(part => part.type === 'text' && part.text);
                  return textPart ? textPart.text : '';
                }
                return '';
              };
              
              const messageText = getMessageText(message);

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
                      <MessageContent
                        className="text-foreground prose flex-1 rounded-lg bg-transparent p-0"
                        markdown
                      >
                        {messageText}
                      </MessageContent>
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
                          >
                            <Copy />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Upvote" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <ThumbsUp />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Downvote" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <ThumbsDown />
                          </Button>
                        </MessageAction>
                      </MessageActions>
                    </div>
                  ) : (
                    <div className="group flex flex-col items-end gap-1">
                      <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                        {messageText}
                      </MessageContent>
                      <MessageActions
                        className={cn(
                          "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                        )}
                      >
                        <MessageAction tooltip="Edit" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <Pencil />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Delete" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <Trash />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Copy" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
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
                placeholder="Ask anything"
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
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
                    <Button type="button" variant="outline" className="rounded-full">
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
                  <PromptInputAction tooltip="Voice input">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <Mic size={18} />
                    </Button>
                  </PromptInputAction>

                  <Button
                    size="icon"
                    disabled={!prompt.trim() || status === 'streaming' || status === 'submitted'}
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