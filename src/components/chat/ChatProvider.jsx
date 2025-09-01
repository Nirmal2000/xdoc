import { useState, useEffect } from 'react';
import ConversationController from './ConversationController';
import { useChatStore } from '@/lib/chatStore';

// This component ensures our controllers stay mounted even when not visible
export default function ChatProvider({ userId, experienceId, userInfo, children }) {
  const [activeConversations, setActiveConversations] = useState(new Map()); // Map<conversationId, {messages, status}>
  const { initializeConversation } = useChatStore();

  // Function to activate a conversation (create controller for it)
  const activateConversation = async (conversationId, initialMessages = null) => {
    console.log('[ChatProvider] Activating conversation:', conversationId);
    
    // If already active, don't re-activate
    if (activeConversations.has(conversationId)) {
      console.log('[ChatProvider] Conversation already active:', conversationId);
      return;
    }
    
    let messages = initialMessages;
    
    // If no initial messages provided, try to load from API
    if (!messages) {
      try {
        console.log('[ChatProvider] Loading messages from API for:', conversationId);
        const response = await fetch(
          `/api/experiences/${experienceId}/conversations/${conversationId}`
        );
        if (response.ok) {
          const data = await response.json();
          messages = data.messages;
          console.log('[ChatProvider] Loaded messages:', messages.length);
        } else {
          console.error('[ChatProvider] Failed to load messages, status:', response.status);
          messages = [];
        }
      } catch (error) {
        console.error('[ChatProvider] Error loading conversation messages:', error);
        messages = [];
      }
    }
    
    // Initialize in store with loaded messages
    initializeConversation(conversationId, { 
      messages: messages || [],
      status: 'idle' 
    });
    
    // Add to active conversations with the loaded messages
    setActiveConversations(prev => new Map([
      ...prev,
      [conversationId, { messages: messages || [], status: 'idle' }]
    ]));
  };

  // Function to deactivate a conversation (unmount controller)
  const deactivateConversation = (conversationId) => {
    console.log('[ChatProvider] Deactivating conversation:', conversationId);
    setActiveConversations(prev => {
      const next = new Map(prev);
      next.delete(conversationId);
      return next;
    });
  };

  // Expose functions globally for other components to use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.activateConversation = activateConversation;
      window.deactivateConversation = deactivateConversation;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete window.activateConversation;
        delete window.deactivateConversation;
      }
    };
  }, [experienceId]);

  return (
    <>
      {/* Render headless controllers for all active conversations */}
      {Array.from(activeConversations.entries()).map(([conversationId, conversationData]) => (
        <ConversationController
          key={conversationId}
          conversationId={conversationId}
          experienceId={experienceId}
          userId={userId}
          userInfo={userInfo}
          initialMessages={conversationData.messages}
        />
      ))}
      
      {/* Render children (the actual UI components) */}
      {children}
    </>
  );
}