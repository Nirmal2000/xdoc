"use client"

import { useState, useEffect, useRef } from 'react';
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import ChatSidebar from './chat-sidebar';
import ChatContent from './chat-content';
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { checkRateLimit, recordMessage, getRateLimitInfo } from '@/lib/rate-limit';
import { generateId } from 'ai';

export default function ChatUI({ experienceId, userId }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('ready');
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversationTopic, setConversationTopic] = useState(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const eventSourceRef = useRef(null);
  const currentAssistantIdRef = useRef(null);
  
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
      new: currentConversationId,
      timestamp: new Date().toISOString()
    });
  }, [currentConversationId]);
  
  // SSE subscription for active conversation via Redis-backed events
  useEffect(() => {
    // cleanup previous
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    currentAssistantIdRef.current = null;

    if (!currentConversationId || String(currentConversationId).startsWith('temp_')) return;

    let reconnectAttempts = 0;
    let hbTimeout = null;

    const resetHeartbeat = () => {
      if (hbTimeout) clearTimeout(hbTimeout);
      // If no message received within 25s, mark as connecting
      hbTimeout = setTimeout(() => {
        setStatus('connecting');
      }, 25000);
    };

    const open = () => {
      const es = new EventSource(`/api/experiences/${experienceId}/conversations/${currentConversationId}/events`);
      eventSourceRef.current = es;
      setStatus('connecting');
      resetHeartbeat();

      es.addEventListener('ping', () => {
        resetHeartbeat();
      });

      es.addEventListener('message', () => {
        // noop; handled by onmessage
      });

      es.onmessage = (ev) => {
        resetHeartbeat();
        try {
          const evt = JSON.parse(ev.data);
          if (!evt || typeof evt !== 'object') return;

          if (evt.type === 'connected') {
            // connection message from server; no-op
          } else if (evt.type === 'start') {
            setStatus('streaming');
            currentAssistantIdRef.current = evt.assistantId || null;
            if (currentAssistantIdRef.current) {
              setMessages((prev) => {
                const exists = prev.some((m) => m.id === currentAssistantIdRef.current);
                if (exists) return prev;
                return [
                  ...prev,
                  { id: currentAssistantIdRef.current, role: 'assistant', content: '', parts: [], status: 'generating' },
                ];
              });
            }
          } else if (evt.type === 'text-start') {
            // Begin a new text part within the current assistant message
            setStatus('streaming');
            const aId = currentAssistantIdRef.current;
            const partId = evt.id;
            if (!aId || !partId) return;
            setMessages((prev) => prev.map((m) => {
              if (m.id !== aId) return m;
              const parts = Array.isArray(m.parts) ? [...m.parts] : [];
              const existingIndex = parts.findIndex((p) => p && p.type === 'text' && p.id === partId);
              if (existingIndex === -1) {
                parts.push({ type: 'text', id: partId, text: '', state: 'streaming' });
              }
              return { ...m, parts };
            }));
          } else if (evt.type === 'text-delta') {
            // Append delta to the current text part identified by evt.id
            setStatus('streaming');
            const aId = currentAssistantIdRef.current;
            const partId = evt.id;
            const delta = evt.delta || evt.text || '';
            if (!aId || !partId || !delta) return;
            setMessages((prev) => prev.map((m) => {
              if (m.id !== aId) return m;
              const parts = Array.isArray(m.parts) ? m.parts.map((p) => {
                if (p && p.type === 'text' && p.id === partId) {
                  return { ...p, text: (p.text || '') + delta, state: 'streaming' };
                }
                return p;
              }) : [];
              // Fallback: if part does not exist yet, create it
              const hasPart = parts.some((p) => p && p.type === 'text' && p.id === partId);
              if (!hasPart) parts.push({ type: 'text', id: partId, text: delta, state: 'streaming' });
              // Maintain content for backwards-compatibility/fallbacks
              const content = (m.content || '') + delta;
              return { ...m, parts, content };
            }));
          } else if (evt.type === 'text-end') {
            const aId = currentAssistantIdRef.current;
            const partId = evt.id;
            if (!aId || !partId) return;
            setMessages((prev) => prev.map((m) => {
              if (m.id !== aId) return m;
              const parts = Array.isArray(m.parts) ? m.parts.map((p) => {
                if (p && p.type === 'text' && p.id === partId) {
                  return { ...p, state: 'done' };
                }
                return p;
              }) : [];
              return { ...m, parts };
            }));
          } else if (evt.type === 'reasoning-start') {
            // Begin a new reasoning part
            setStatus('streaming');
            const aId = currentAssistantIdRef.current;
            const partId = evt.id;
            if (!aId || !partId) return;
            setMessages((prev) => prev.map((m) => {
              if (m.id !== aId) return m;
              const parts = Array.isArray(m.parts) ? [...m.parts] : [];
              const existingIndex = parts.findIndex((p) => p && p.type === 'reasoning' && p.id === partId);
              if (existingIndex === -1) {
                parts.push({ type: 'reasoning', id: partId, text: '', state: 'streaming' });
              }
              return { ...m, parts };
            }));
          } else if (evt.type === 'reasoning-delta') {
            // Append delta to the current reasoning part
            setStatus('streaming');
            const aId = currentAssistantIdRef.current;
            const partId = evt.id;
            const delta = evt.text || evt.delta || '';
            if (!aId || !partId || !delta) return;
            setMessages((prev) => prev.map((m) => {
              if (m.id !== aId) return m;
              const parts = Array.isArray(m.parts) ? m.parts.map((p) => {
                if (p && p.type === 'reasoning' && p.id === partId) {
                  return { ...p, text: (p.text || '') + delta, state: 'streaming' };
                }
                return p;
              }) : [];
              // Fallback if part did not exist yet
              const hasPart = parts.some((p) => p && p.type === 'reasoning' && p.id === partId);
              if (!hasPart) parts.push({ type: 'reasoning', id: partId, text: delta, state: 'streaming' });
              return { ...m, parts };
            }));
          } else if (evt.type === 'reasoning-end') {
            const aId = currentAssistantIdRef.current;
            const partId = evt.id;
            if (!aId || !partId) return;
            setMessages((prev) => prev.map((m) => {
              if (m.id !== aId) return m;
              const parts = Array.isArray(m.parts) ? m.parts.map((p) => {
                if (p && p.type === 'reasoning' && p.id === partId) {
                  return { ...p, state: 'done' };
                }
                return p;
              }) : [];
              return { ...m, parts };
            }));
          } else if (evt.type === 'text-delta') {
            // Already handled above: kept for backward compatibility if order changes
            // No-op here to avoid duplicate updates
          } else if (evt.type && evt.type.startsWith('data-')) {
            const aId = currentAssistantIdRef.current;
            if (!aId) return;
            if (evt.transient) return;
            setMessages((prev) => prev.map((m) => (m.id === aId ? { ...m, parts: [...(m.parts || []), evt] } : m)));
          } else if (evt.type === 'finish') {
            setStatus('ready');
            const aId = currentAssistantIdRef.current;
            if (aId) {
              setMessages((prev) => prev.map((m) => {
                if (m.id !== aId) return m;
                // Ensure any streaming parts are marked done
                const parts = Array.isArray(m.parts) ? m.parts.map((p) => (p && p.state === 'streaming' ? { ...p, state: 'done' } : p)) : m.parts;
                return { ...m, status: 'complete', parts };
              }));
            }
          } else if (evt.type === 'error') {
            setStatus('error');
          }
        } catch (e) {
          console.error('[ChatUI] SSE parse error:', e);
        }
      };

      es.onerror = () => {
        // Attempt reconnect with backoff
        if (hbTimeout) clearTimeout(hbTimeout);
        setStatus('connecting');
        es.close();
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 15000);
        reconnectAttempts += 1;
        setTimeout(() => {
          // Only reconnect if still on same conversation and no open ES
          if (!eventSourceRef.current && currentConversationId) {
            open();
          }
        }, delay);
      };
    };

    open();

    return () => {
      if (hbTimeout) clearTimeout(hbTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [currentConversationId, experienceId]);

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
    setConversationTopic(null); // Clear topic when creating new chat
    setIsLoadingConversation(false); // Clear loading state when creating new chat
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
      setIsLoadingConversation(false);
      return;
    }
    
    // Set loading state before fetching
    setIsLoadingConversation(true);
    
    try {
      // Load messages for this conversation via API
      const response = await fetch(`/api/experiences/${experienceId}/conversations/${conversationId}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        console.error('Failed to load messages');
        setIsLoadingConversation(false);
        return;
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoadingConversation(false);
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
      currentConversationId,
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
      
      // Save user message to DB optimistically (UIMessage shape)
      const userMsgId = generateId();
      const userMessage = { id: userMsgId, role: 'user', content: message.trim(), parts: [{ type: 'text', text: message.trim() }] };
      setMessages((prev) => [...prev, userMessage]);
      try {
        const res = await supabase.from('messages').insert({ conversation_id: conversationId, message: userMessage });
        if (res.error) {
          throw res.error;
        }
      } catch (e) {
        console.error('[ChatUI handleSubmit] Failed to persist user message:', e);
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
      
      // Record the message for rate limiting
      try {
        const updatedRateLimit = recordMessage(userId);
        console.log('[ChatUI handleSubmit] Message recorded for rate limiting:', updatedRateLimit);
      } catch (error) {
        console.error('[ChatUI handleSubmit] Error recording message for rate limiting:', error);
        toast.error('Error tracking message usage. Please try again.');
        return;
      }

      // Trigger background generation (fire-and-forget), sending current UI messages for context
      try {
        const resp = await fetch(`/api/experiences/${experienceId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            conversation_id: conversationId,
            search: options.search || false,
            model: options.model || 'xai/grok-4',
            userSessionId: userSessionId,
            messages: [...messages, userMessage],
          }),
        });
        if (!resp.ok) {
          const t = await resp.text();
          throw new Error(t || 'Failed to start generation');
        }
      } catch (e) {
        console.error('[ChatUI handleSubmit] Failed to start generation:', e);
        toast.error('Failed to start generation');
      }
      
      // Generate topic for conversations with no messages yet (non-blocking)
      // This catches both auto-created conversations and manually created empty conversations
      const isFirstMessage = messages.length === 0;
      if (isFirstMessage) {
        console.log('[ChatUI handleSubmit] Generating topic for first message of conversation...');
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
          onStop={() => {}}
          currentConversationId={currentConversationId}
          experienceId={experienceId}
          conversationTopic={conversationTopic}
          isLoadingConversation={isLoadingConversation}
          rateLimitInfo={rateLimitInfo}
          userId={userId}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
