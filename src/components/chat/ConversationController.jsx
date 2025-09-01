import { useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useChatStore } from '@/lib/chatStore';

// This component's job is to run the useChat hook and sync its state to Zustand.
// It renders NO UI.
export default function ConversationController({ 
  conversationId, 
  initialMessages = [], 
  experienceId, 
  userId,
  userInfo = null 
}) {
  const { 
    registerActions, 
    unregisterActions, 
    updateConversationState, 
    saveMessageToDatabase 
  } = useChatStore();

  const { messages, sendMessage, status, error, stop, reload } = useChat({
    id: conversationId, // CRITICAL: This isolates the hook's state
    initialMessages,
    transport: new DefaultChatTransport({
      api: `/api/experiences/${experienceId}/chat`,
    }),
    onFinish: async ({ message, messages }) => {
      console.log(`[Controller-${conversationId}] onFinish triggered`);
      
      try {
        // Save assistant message to database
        if (message && message.role === 'assistant') {
          await saveMessageToDatabase(conversationId, message);
        }

        // Refresh conversations in sidebar if function exists
        if (typeof window !== 'undefined' && window.loadConversations) {
          window.loadConversations();
        }
      } catch (error) {
        console.error(`[Controller-${conversationId}] onFinish error:`, error);
      }
    },
    onError: (error) => {
      console.error(`[Controller-${conversationId}] onError:`, error);
      // Update store with error state
      updateConversationState(conversationId, { error });
    }
  });

  // Enhanced sendMessage wrapper that includes conversation context
  const enhancedSendMessage = (message, options = {}) => {
    console.log(`[Controller-${conversationId}] Sending message`);
    
    // Get userSessionId from localStorage for X authentication
    const userSessionId = typeof window !== 'undefined' ? 
      localStorage.getItem('x_user_session_id') : null;
    
    // Enhanced options with conversation context
    const enhancedOptions = {
      ...options,
      body: {
        user_id: userId,
        conversation_id: conversationId,
        experience_id: experienceId,
        userSessionId: userSessionId,
        userHandle: userInfo?.username || null,
        ...options.body
      }
    };
    
    return sendMessage(message, enhancedOptions);
  };

  // EFFECT 1: Register this hook's actions with the store on mount
  useEffect(() => {
    console.log(`[Controller-${conversationId}] Registering actions`);
    
    // Small delay to ensure useChat hook is fully initialized
    const timer = setTimeout(() => {
      registerActions(conversationId, { 
        sendMessage: enhancedSendMessage, 
        stop, 
        reload 
      });
      console.log(`[Controller-${conversationId}] Actions registered successfully`);
    }, 50);

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      console.log(`[Controller-${conversationId}] Unregistering actions`);
      unregisterActions(conversationId);
    };
  }, [conversationId, registerActions, unregisterActions]);

  // EFFECT 2: Sync this hook's state TO the global store whenever it changes
  useEffect(() => {
    console.log(`[Controller-${conversationId}] Syncing state to store:`, {
      messagesCount: messages.length,
      status,
      error,
      messages: messages.slice(0, 2) // Log first 2 messages for debugging
    });
    updateConversationState(conversationId, { 
      messages, 
      status, 
      error,
      lastUpdated: Date.now()
    });
  }, [conversationId, messages, status, error, updateConversationState]);

  // This component renders nothing. It's a pure logic/state controller.
  return null;
}