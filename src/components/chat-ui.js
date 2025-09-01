"use client"

import { useState, useEffect } from 'react';
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import ChatSidebar from './chat-sidebar';
import ChatContent from './chat-content';
import ChatProvider from './chat/ChatProvider';
import { useChatStore } from '@/lib/chatStore';
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { checkRateLimit, recordMessage, getRateLimitInfo } from '@/lib/rate-limit';

export default function ChatUI({ experienceId, userId }) {
  const [conversationTopic, setConversationTopic] = useState(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  
  // Get state and actions from Zustand store
  const {
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    stop,
    getActiveConversation
  } = useChatStore();
  
  // Update rate limit info periodically
  useEffect(() => {
    const updateRateLimitInfo = () => {
      if (userId) {
        const info = getRateLimitInfo(userId);
        setRateLimitInfo(info);        
      }
    };
    
    // Update immediately
    updateRateLimitInfo();
    
    // Update every minute to refresh remaining time
    const interval = setInterval(updateRateLimitInfo, 60000);
    
    return () => clearInterval(interval);
  }, [userId]);
  
  // Debug: Track conversation ID changes
  useEffect(() => {
    console.log('[ChatUI] Conversation ID changed:', {
      old: 'previous value',
      new: activeConversationId,
      timestamp: new Date().toISOString()
    });
  }, [activeConversationId]);
  
  // Get current conversation data from store
  const activeConversation = getActiveConversation();
  
  // Debug: Log active conversation data
  useEffect(() => {
    console.log('[ChatUI] Active conversation data:', {
      activeConversationId,
      messagesCount: activeConversation.messages?.length || 0,
      status: activeConversation.status,
      messages: activeConversation.messages
    });
  }, [activeConversationId, activeConversation]);



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
    
    // Optimistic update - clear conversation state
    setConversationTopic(null); // Clear topic when creating new chat
    setIsLoadingConversation(false); // Clear loading state when creating new chat
    console.log('[ChatUI handleNewChat] Setting conversation ID to temp:', tempId);
    setActiveConversationId(tempId);
    
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
      setActiveConversationId(realConversationId);
      
      // Activate the new conversation immediately after creation
      if (typeof window !== 'undefined' && window.activateConversation) {
        console.log('[ChatUI handleNewChat] Activating conversation:', realConversationId);
        await window.activateConversation(realConversationId, []); // Empty messages for new conversation
      }
      
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
      setActiveConversationId(null);
      if (window.removeTempConversation) {
        window.removeTempConversation(tempId);
      }
      
      console.log('[ChatUI handleNewChat] FAILURE - Returning null');
      return null;
    }
  };

  const handleSelectConversation = async (conversationId) => {
    console.log('[ChatUI] Selecting conversation:', conversationId);
    
    // Clear topic when switching conversations
    setConversationTopic(null);
    
    // If conversationId is null, just clear active conversation
    if (!conversationId) {
      setActiveConversationId(null);
      setIsLoadingConversation(false);
      return;
    }
    
    // Set the active conversation in store
    setActiveConversationId(conversationId);
    
    // Activate the conversation (this will create a controller if needed)
    if (typeof window !== 'undefined' && window.activateConversation) {
      setIsLoadingConversation(true);
      try {
        await window.activateConversation(conversationId);
      } catch (error) {
        console.error('Error activating conversation:', error);
      } finally {
        setIsLoadingConversation(false);
      }
    }
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
      activeConversationId,
      options,
      timestamp: new Date().toISOString()
    });
    
    if (message && message.trim()) {
      // Check rate limit before processing message
      const rateLimitStatus = checkRateLimit(userId);
      console.log('[ChatUI handleSubmit] Rate limit check:', rateLimitStatus);
      
      if (!rateLimitStatus.allowed) {
        const rateLimitInfo = getRateLimitInfo(userId);
        toast.error(rateLimitInfo.message);
        console.log('[ChatUI handleSubmit] Rate limit exceeded, aborting message send');
        return;
      }
      
      let conversationId = activeConversationId;
      
      // Auto-create conversation if none exists
      if (!conversationId) {
        console.log('[ChatUI handleSubmit] No conversation ID, creating new chat...');
        conversationId = await handleNewChat();
        console.log('[ChatUI handleSubmit] After handleNewChat, got:', conversationId);
        
        if (!conversationId) {
          console.error('[ChatUI handleSubmit] Failed to create conversation, aborting message send');
          toast.error('Failed to create conversation. Please try again.');
          return;
        }
        
        console.log('[ChatUI handleSubmit] Successfully created conversation:', conversationId);
      } else {
        // Ensure existing conversation is activated
        if (typeof window !== 'undefined' && window.activateConversation) {
          console.log('[ChatUI handleSubmit] Ensuring conversation is activated:', conversationId);
          await window.activateConversation(conversationId);
        }
      }
      
      // Validate conversation ID before sending
      if (!conversationId || conversationId.startsWith('temp_')) {
        console.error('[ChatUI handleSubmit] Invalid conversation ID:', conversationId);
        toast.error('Invalid conversation. Please try creating a new chat.');
        return;
      }
      
      console.log('[ChatUI handleSubmit] About to send message with:', {
        conversationId,
        userId,
        experienceId,
        search: options.search || false,
        model: options.model || 'xai/grok-4',
        timestamp: new Date().toISOString()
      });
      
      // Record the message for rate limiting
      try {
        const updatedRateLimit = recordMessage(userId);
        console.log('[ChatUI handleSubmit] Message recorded for rate limiting:', updatedRateLimit);
      } catch (error) {
        console.error('[ChatUI handleSubmit] Error recording message for rate limiting:', error);
        toast.error('Error tracking message usage. Please try again.');
        return;
      }
      
      // Send message via store (which routes to correct controller)
      sendMessage(
        { text: message.trim() },
        {
          body: {
            search: options.search || false,
            model: options.model || 'xai/grok-4'
          }
        }
      );
      
      console.log('[ChatUI handleSubmit] sendMessage called successfully');
      
      // Generate topic for conversations with no messages yet (non-blocking)
      const isFirstMessage = activeConversation.messages.length === 0;
      if (isFirstMessage) {
        console.log('[ChatUI handleSubmit] Generating topic for first message of conversation...');
        // Don't await this - let it run in background
        generateConversationTopic(message.trim(), conversationId);
      }
    }
  };

  return (
    <ChatProvider userId={userId} experienceId={experienceId}>
      <SidebarProvider>
        <ChatSidebar
          experienceId={experienceId}
          userId={userId}
          currentConversationId={activeConversationId}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
        />
        <SidebarInset>
          <ChatContent
            messages={activeConversation.messages}
            status={activeConversation.status}
            onSubmit={handleSubmit}
            onStop={stop}
            currentConversationId={activeConversationId}
            experienceId={experienceId}
            conversationTopic={conversationTopic}
            isLoadingConversation={isLoadingConversation}
            rateLimitInfo={rateLimitInfo}
            userId={userId}
          />
        </SidebarInset>
      </SidebarProvider>
    </ChatProvider>
  );
}
