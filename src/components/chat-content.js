"use client"

import { useEffect } from 'react';
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container"
import { ScrollButton } from "@/components/ui/scroll-button"
import { useVoiceRecording } from "@/hooks/useVoiceRecording"
import { useSimpleX } from "@/hooks/useSimpleXAuth"
import { useIframeSdk } from "@whop/react"
import QuickTasks from "@/components/quick-tasks"
import { ChatHeader, MessageRenderer, ChatInput } from "@/components/chat"
import { useMessageActions, useVoiceInput, useChatInput } from "@/hooks/useChatInteractions"
import { BarsLoader } from "@/components/ui/loader"

export default function ChatContent({ messages, status, onSubmit, onStop, currentConversationId, experienceId, conversationTopic, isLoadingConversation, rateLimitInfo, userId }) {
  // Authentication and user info
  const { user: userInfo, checked: authChecked, login, logout, loading } = useSimpleX();
  
  // Voice recording hook
  const voiceRecording = useVoiceRecording();

  // Whop iframe SDK hook
  const iframeSdk = useIframeSdk();

  // Custom hooks for chat functionality
  const { messageVotes, handleCopyMessage, handleUpvote, handleDownvote } = useMessageActions();
  const voiceInput = useVoiceInput(voiceRecording);
  const chatInput = useChatInput(onSubmit, currentConversationId, userId);

  // Real-time transcript updates
  useEffect(() => {
    const updatedPrompt = voiceInput.getUpdatedPrompt();
    if (updatedPrompt !== null) {
      chatInput.setPrompt(updatedPrompt);
    }
  }, [voiceRecording.transcripts, voiceInput.isRecording, voiceInput.getUpdatedPrompt]);

  const handleVoiceRecording = () => {
    voiceInput.handleVoiceRecording(chatInput.prompt, chatInput.setPrompt);
  };  

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <ChatHeader 
        userInfo={userInfo}
        authChecked={authChecked}
        loading={loading}
        login={login}
        logout={logout}
        conversationTopic={conversationTopic}
      />

      <div className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {isLoadingConversation ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <BarsLoader size="lg" className="text-primary" />                
              </div>
            ) : messages.length === 0 ? (
              <QuickTasks setPrompt={chatInput.setPrompt} userInfo={userInfo} />
            ) : null}
            {!isLoadingConversation && messages.map((message, index) => {
              const isLastMessage = index === messages.length - 1;
              
              return (
                <MessageRenderer
                  key={message.id}
                  message={message}
                  isLastMessage={isLastMessage}
                  status={status}
                  userInfo={userInfo}
                  messageVotes={messageVotes}
                  onCopyMessage={handleCopyMessage}
                  onUpvote={handleUpvote}
                  onDownvote={handleDownvote}
                />
              );
            })}

          </ChatContainerContent>
          <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
            <ScrollButton className="shadow-sm" />
          </div>
        </ChatContainerRoot>
      </div>

      <ChatInput
        prompt={chatInput.prompt}
        onPromptChange={chatInput.setPrompt}
        onSubmit={chatInput.handleSubmit}
        status={status}
        isSearchEnabled={chatInput.isSearchEnabled}
        onSearchToggle={chatInput.handleSearchToggle}
        isRecording={voiceInput.isRecording}
        onVoiceRecording={handleVoiceRecording}
        isSubmitDisabled={chatInput.isSubmitDisabled(status)}
        isInputDisabled={chatInput.isInputDisabled()}
        placeholder={chatInput.getPlaceholder()}
        selectedModel={chatInput.selectedModel}
        onModelChange={chatInput.setSelectedModel}
        rateLimitInfo={rateLimitInfo}
      />
    </main>
  );
}
