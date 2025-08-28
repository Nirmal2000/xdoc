"use client"

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect } from 'react';
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import ChatSidebar from './chat-sidebar';
import ChatContent from './chat-content';
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";

export default function ChatUI({ experienceId, userId }) {
  const [currentConversationId, setCurrentConversationId] = useState(null);
  
  // console.log('ChatUI props - experienceId:', experienceId, 'userId:', userId);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/experiences/${experienceId}/chat`,
    }),
    onFinish: async (message) => {
      console.log("Message", message)
      if (window.loadConversations) {
        window.loadConversations();
      }
    }
  });

  const handleNewChat = async () => {
    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}`;
    const tempConversation = {
      id: tempId,
      title: 'New Chat',
      status: 'creating',
      user_id: userId,
      experience_id: experienceId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Optimistic update - clear messages and set temp conversation
    setMessages([]);
    setCurrentConversationId(tempId);
    
    // Add temp conversation to sidebar (if window.addTempConversation exists)
    if (window.addTempConversation) {
      window.addTempConversation(tempConversation);
    }
    
    try {
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
        throw new Error('Failed to create conversation');
      }
      
      const data = await response.json();
      
      // Success - replace temp ID with real ID
      setCurrentConversationId(data.conversation_id);
      
      // Update sidebar with real conversation data
      if (window.replaceTempConversation) {
        window.replaceTempConversation(tempId, {
          ...tempConversation,
          id: data.conversation_id,
          status: 'active'
        });
      }
      
      toast.success('New chat created');
      return data.conversation_id;
      
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create new chat');
      
      // Rollback - remove temp conversation and reset
      setCurrentConversationId(null);
      if (window.removeTempConversation) {
        window.removeTempConversation(tempId);
      }
      
      return null;
    }
  };

  const handleSelectConversation = async (conversationId) => {
    setCurrentConversationId(conversationId);
    
    // If conversationId is null, just clear messages
    if (!conversationId) {
      setMessages([]);
      return;
    }
    
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

  const handleSubmit = async (message, options = {}) => {
    if (message && message.trim()) {
      let conversationId = currentConversationId;
      
      // Auto-create conversation if none exists
      if (!conversationId) {
        conversationId = await handleNewChat();
        if (!conversationId) return; // Failed to create conversation
      }
      
      // Get userSessionId from localStorage for X authentication
      const userSessionId = typeof window !== 'undefined' ? 
        localStorage.getItem('x_user_session_id') : null;
      
      sendMessage(
        { text: message.trim() },
        {
          body: {
            user_id: userId,
            conversation_id: conversationId,
            experience_id: experienceId,
            search: options.search || false,
            userSessionId: userSessionId // Include X user session for fetchTweets tool
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
          experienceId={experienceId}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
