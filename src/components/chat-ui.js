"use client"

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect } from 'react';
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import ChatSidebar from './chat-sidebar';
import ChatContent from './chat-content';
import { supabase } from '@/lib/supabase';

export default function ChatUI({ experienceId, userId }) {
  const [currentConversationId, setCurrentConversationId] = useState(null);
  
  // console.log('ChatUI props - experienceId:', experienceId, 'userId:', userId);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/experiences/${experienceId}/chat`,
    }),
    onFinish: async (message) => {
      // Trigger sidebar to reload conversations
      if (window.loadConversations) {
        window.loadConversations();
      }
    }
  });

  const handleNewChat = async () => {
    // Clear existing messages first
    setMessages([]);
    
    // Create new conversation via API
    const response = await fetch(`/api/experiences/${experienceId}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId
      })
    });
    
    if (!response.ok) {
      console.error('Failed to create conversation');
      return null;
    }
    
    const data = await response.json();
    setCurrentConversationId(data.conversation_id);
    
    // Trigger sidebar to reload conversations
    if (window.loadConversations) {
      window.loadConversations();
    }
    
    return data.conversation_id;
  };

  const handleSelectConversation = async (conversationId) => {
    setCurrentConversationId(conversationId);
    
    // Load messages for this conversation via API
    const response = await fetch(`/api/experiences/${experienceId}/conversations/${conversationId}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      console.error('Failed to load messages');
      return;
    }
    
    const data = await response.json();
    setMessages(data.messages);
  };

  const handleSubmit = async (message) => {
    if (message && message.trim()) {
      let conversationId = currentConversationId;
      
      // Auto-create conversation if none exists
      if (!conversationId) {
        conversationId = await handleNewChat();
        if (!conversationId) return; // Failed to create conversation
      }
      
      sendMessage(
        { text: message.trim() },
        {
          body: {
            user_id: userId,
            conversation_id: conversationId,
            experience_id: experienceId
          }
        }
      );
    }
  };

  return (
    <SidebarProvider>
      <ChatSidebar
        experienceId={experienceId}
        userId={userId}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
      />
      <SidebarInset>
        <ChatContent
          messages={messages}
          status={status}
          onSubmit={handleSubmit}
          onStop={stop}
          currentConversationId={currentConversationId}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}