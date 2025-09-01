import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export const useChatStore = create((set, get) => ({
  // Holds the state of all conversations
  conversations: {},
  // Holds the sendMessage and other action functions for each active hook
  actions: {},
  // Currently selected conversation
  activeConversationId: null,

  // --- ACTIONS ---

  setActiveConversationId: (id) => {
    console.log('[ChatStore] Setting active conversation:', id);
    set({ activeConversationId: id });
  },

  // Called by the headless controller to register its actions
  registerActions: (conversationId, actions) => {
    console.log('[ChatStore] Registering actions for conversation:', conversationId);
    set((state) => ({
      actions: { ...state.actions, [conversationId]: actions },
    }));
  },

  // Called by the headless controller to unregister actions on unmount
  unregisterActions: (conversationId) => {
    console.log('[ChatStore] Unregistering actions for conversation:', conversationId);
    set((state) => {
      const newActions = { ...state.actions };
      delete newActions[conversationId];
      return { actions: newActions };
    });
  },

  // Called by the headless controller to sync its state with our store
  updateConversationState: (conversationId, data) => {
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: {
          ...(state.conversations[conversationId] || {}),
          ...data,
        },
      },
    }));
  },

  // Called by the UI to send a message
  sendMessage: async (message, options = {}) => {
    const { activeConversationId } = get();
    if (!activeConversationId) {
      console.error('[ChatStore] No active conversation for sendMessage');
      return;
    }

    // Find the correct sendMessage function registered by the controller
    let conversationActions = get().actions[activeConversationId];
    
    // If actions not registered yet, wait a bit for controller to mount
    if (!conversationActions) {
      console.log(`[ChatStore] Actions not ready for ${activeConversationId}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      conversationActions = get().actions[activeConversationId];
    }
    
    if (conversationActions && conversationActions.sendMessage) {
      console.log(`[ChatStore] Dispatching message to controller for ${activeConversationId}`);
      conversationActions.sendMessage(message, options);
    } else {
      console.error(`[ChatStore] No actions registered for conversation ${activeConversationId}`);
      // Try to activate the conversation if it's not active
      if (typeof window !== 'undefined' && window.activateConversation) {
        console.log(`[ChatStore] Attempting to activate conversation ${activeConversationId}`);
        await window.activateConversation(activeConversationId);
        // Try again after activation
        setTimeout(() => {
          const retryActions = get().actions[activeConversationId];
          if (retryActions && retryActions.sendMessage) {
            console.log(`[ChatStore] Retrying message send for ${activeConversationId}`);
            retryActions.sendMessage(message, options);
          }
        }, 200);
      }
    }
  },

  // Called by the UI to stop current streaming
  stop: () => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    const conversationActions = get().actions[activeConversationId];
    if (conversationActions && conversationActions.stop) {
      console.log(`[ChatStore] Stopping stream for ${activeConversationId}`);
      conversationActions.stop();
    }
  },

  // Called by the UI to reload/reset a conversation
  reload: () => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    const conversationActions = get().actions[activeConversationId];
    if (conversationActions && conversationActions.reload) {
      console.log(`[ChatStore] Reloading conversation ${activeConversationId}`);
      conversationActions.reload();
    }
  },

  // Get conversation data for the current active conversation
  getActiveConversation: () => {
    const { activeConversationId, conversations } = get();
    console.log('[ChatStore] getActiveConversation called:', {
      activeConversationId,
      availableConversations: Object.keys(conversations),
      hasData: !!conversations[activeConversationId]
    });
    if (!activeConversationId) return { messages: [], status: 'idle' };
    const result = conversations[activeConversationId] || { messages: [], status: 'idle' };
    console.log('[ChatStore] Returning conversation data:', {
      messagesCount: result.messages?.length || 0,
      status: result.status
    });
    return result;
  },

  // Initialize conversation state (useful for loading from API)
  initializeConversation: (conversationId, initialData = {}) => {
    console.log('[ChatStore] Initializing conversation:', conversationId, 'with data:', initialData);
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: {
          messages: [],
          status: 'idle',
          error: null,
          ...initialData, // Put initialData first so it can be overridden if needed
        },
      },
    }));
  },

  // Clean up conversation state (e.g., on logout or memory management)
  removeConversation: (conversationId) => {
    console.log('[ChatStore] Removing conversation:', conversationId);
    set((state) => {
      const newConversations = { ...state.conversations };
      const newActions = { ...state.actions };
      delete newConversations[conversationId];
      delete newActions[conversationId];
      
      return {
        conversations: newConversations,
        actions: newActions,
        activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId
      };
    });
  },

  // Save a message to the database (called by controllers on finish)
  saveMessageToDatabase: async (conversationId, message) => {
    try {
      if (!conversationId || conversationId.startsWith('temp_')) {
        console.log('[ChatStore] Skipping save for temp conversation:', conversationId);
        return;
      }

      console.log('[ChatStore] Saving message to database for conversation:', conversationId);
      const result = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          message: message
        });
        
      if (result.error) {
        console.error('[ChatStore] Database save error:', result.error);
        throw result.error;
      }
      
      console.log('[ChatStore] Message saved successfully');
      return result;
    } catch (error) {
      console.error('[ChatStore] Error saving message:', error);
      throw error;
    }
  }
}));