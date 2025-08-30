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
  const [conversationTopic, setConversationTopic] = useState(null);
  
  // Debug: Track conversation ID changes
  useEffect(() => {
    console.log('[ChatUI] Conversation ID changed:', {
      old: 'previous value',
      new: currentConversationId,
      timestamp: new Date().toISOString()
    });
  }, [currentConversationId]);
  
  // console.log('ChatUI props - experienceId:', experienceId, 'userId:', userId);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/experiences/${experienceId}/chat`,
    }),
    onFinish: async ({message, messages}) => {
      console.log('[ChatUI onFinish] CALLBACK TRIGGERED!', message);
      
      try {
        // Look for data-conversationid type in message parts
        let serverConversationId = null;
        
        if (message?.parts && Array.isArray(message.parts)) {
          const conversationIdPart = message.parts.find(part => part.type === 'data-conversationid');
          
          if (conversationIdPart && conversationIdPart.data && conversationIdPart.data.conversationId) {
            serverConversationId = conversationIdPart.data.conversationId;
            console.log('[ChatUI onFinish] Using server conversation ID:', serverConversationId);
          }
        }
        
        // Use server conversation ID if available, otherwise fall back to current state
        const conversationIdToUse = serverConversationId || currentConversationId;
        console.log('[ChatUI onFinish] Using conversation ID:', conversationIdToUse);
        
        // Validate conversation ID before saving
        if (!conversationIdToUse || conversationIdToUse.startsWith('temp_')) {
          console.error('[ChatUI onFinish] Invalid conversation ID, skipping save:', conversationIdToUse);
          return;
        }
        
        if (message && message.role === 'assistant') {
          const result = await supabase
            .from('messages')
            .insert({
              conversation_id: conversationIdToUse,
              message: message
            });
            
          if (result.error) {
            console.error('[ChatUI onFinish] Supabase error:', result.error);
            throw result.error;
          }
          
          console.log('[ChatUI onFinish] Assistant message saved successfully with conversation ID:', conversationIdToUse);
        }

        if (window.loadConversations) {
          window.loadConversations();
        }
      } catch (error) {
        console.error('[ChatUI onFinish] Error saving assistant message:', error);
      }
    },
    onError: (error) => {
      console.error('[ChatUI onError] Error occurred:', error);
    }
  });

  const handleNewChat = async () => {
    console.log('[ChatUI handleNewChat] ENTRY - Creating new chat...');
    
    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}`;
    console.log('[ChatUI handleNewChat] Generated temp ID:', tempId);
    
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
    console.log('[ChatUI handleNewChat] Setting conversation ID to temp:', tempId);
    setCurrentConversationId(tempId);
    
    // Add temp conversation to sidebar (if window.addTempConversation exists)
    if (window.addTempConversation) {
      window.addTempConversation(tempConversation);
    }
    
    try {
      console.log('[ChatUI handleNewChat] Making API call to create conversation...');
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
      
      console.log('[ChatUI handleNewChat] API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ChatUI handleNewChat] API error:', errorText);
        throw new Error(`Failed to create conversation: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[ChatUI handleNewChat] API response data:', data);
      
      // Success - replace temp ID with real ID
      const realConversationId = data.conversation_id;
      console.log('[ChatUI handleNewChat] Setting conversation ID to real:', realConversationId);
      setCurrentConversationId(realConversationId);
      
      // Update sidebar with real conversation data
      if (window.replaceTempConversation) {
        window.replaceTempConversation(tempId, {
          ...tempConversation,
          id: realConversationId,
          status: 'active'
        });
      }
      
      toast.success('New chat created');
      console.log('[ChatUI handleNewChat] SUCCESS - Returning conversation ID:', realConversationId);
      return realConversationId;
      
    } catch (error) {
      console.error('[ChatUI handleNewChat] ERROR creating conversation:', error);
      toast.error('Failed to create new chat');
      
      // Rollback - remove temp conversation and reset
      console.log('[ChatUI handleNewChat] ROLLBACK - Setting conversation ID to null');
      setCurrentConversationId(null);
      if (window.removeTempConversation) {
        window.removeTempConversation(tempId);
      }
      
      console.log('[ChatUI handleNewChat] FAILURE - Returning null');
      return null;
    }
  };

  const handleSelectConversation = async (conversationId) => {
    setCurrentConversationId(conversationId);
    
    // Clear topic when switching conversations
    setConversationTopic(null);
    
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

  // Function to generate topic non-blocking
  const generateConversationTopic = async (message, conversationId) => {
    try {
      console.log('[ChatUI] Generating topic for conversation:', conversationId);
      const response = await fetch(`/api/experiences/${experienceId}/topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: message
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[ChatUI] Generated topic:', data.topic);
        setConversationTopic(data.topic);
        
        // Also update the conversation title in the database
        await supabase
          .from('conversations')
          .update({ title: data.topic })
          .eq('id', conversationId);
        
        // Refresh conversations in sidebar
        if (window.loadConversations) {
          window.loadConversations();
        }
      } else {
        console.error('[ChatUI] Failed to generate topic:', response.status);
      }
    } catch (error) {
      console.error('[ChatUI] Error generating topic:', error);
    }
  };

  const handleSubmit = async (message, options = {}) => {
    console.log('[ChatUI handleSubmit] ENTRY:', {
      message: message?.substring(0, 50) + '...',
      currentConversationId,
      options,
      timestamp: new Date().toISOString()
    });
    
    if (message && message.trim()) {
      let conversationId = currentConversationId;
      let isNewConversation = false;
      console.log('[ChatUI handleSubmit] Initial conversation ID:', conversationId);
      
      // Auto-create conversation if none exists
      if (!conversationId) {
        console.log('[ChatUI handleSubmit] No conversation ID, creating new chat...');
        conversationId = await handleNewChat();
        console.log('[ChatUI handleSubmit] After handleNewChat, got:', conversationId);
        
        if (!conversationId) {
          console.error('[ChatUI handleSubmit] Failed to create conversation, aborting message send');
          toast.error('Failed to create conversation. Please try again.');
          return; // Exit early if conversation creation failed
        }
        console.log('[ChatUI handleSubmit] Successfully created conversation:', conversationId);
        isNewConversation = true;
      }
      
      // Validate conversation ID before sending
      if (!conversationId || conversationId.startsWith('temp_')) {
        console.error('[ChatUI handleSubmit] Invalid conversation ID:', conversationId);
        toast.error('Invalid conversation. Please try creating a new chat.');
        return;
      }
      
      // Get userSessionId from localStorage for X authentication
      const userSessionId = typeof window !== 'undefined' ? 
        localStorage.getItem('x_user_session_id') : null;
      
      console.log('[ChatUI handleSubmit] About to send message with:', {
        conversationId,
        userId,
        experienceId,
        search: options.search || false,
        model: options.model || 'xai/grok-4',
        userSessionId: !!userSessionId,
        timestamp: new Date().toISOString()
      });
      
      sendMessage(
        { text: message.trim() },
        {
          body: {
            user_id: userId,
            conversation_id: conversationId,
            experience_id: experienceId,
            search: options.search || false,
            model: options.model || 'xai/grok-4',
            userSessionId: userSessionId // Include X user session for fetchTweets tool
          }
        }
      );
      
      console.log('[ChatUI handleSubmit] sendMessage called successfully');
      
      // Generate topic for new conversations (non-blocking)
      if (isNewConversation) {
        console.log('[ChatUI handleSubmit] Generating topic for new conversation...');
        // Don't await this - let it run in background
        generateConversationTopic(message.trim(), conversationId);
      }
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
          conversationTopic={conversationTopic}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
