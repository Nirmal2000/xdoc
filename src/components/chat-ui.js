"use client"

import { useState, useEffect, useRef } from 'react';
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import ChatSidebar from './chat-sidebar';
import ChatContent from './chat-content';
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { checkRateLimit, recordMessage, getRateLimitInfo } from '@/lib/rate-limit';
import { generateId } from 'ai';
import { createUIClientReducer } from '@/lib/ui-client-reducer';

export default function ChatUI({ experienceId, userId }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('ready');
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversationTopic, setConversationTopic] = useState(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const eventSourceRef = useRef(null);
  const currentAssistantIdRef = useRef(null);
  const currentConversationIdRef = useRef(null);
  const resumeAfterIdRef = useRef(null);
  const basePartsRef = useRef({});
  const lastAssistantIdRef = useRef(null);
  const firstEventLoggedRef = useRef(false);

  // Keep a ref in sync with the current conversation ID for async guards
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);
  
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
    // If we are loading messages from DB for this conversation, wait to compute resume cursor
    if (isLoadingConversation) return;

    setStatus('connecting');

    // Create a reducer to assemble UI snapshots from SSE events
    const reducer = createUIClientReducer({
      getBaseParts: (id) => (basePartsRef.current && basePartsRef.current[id]) || [],
    });
    // Prime reducer with last assistant id so resume works when 'start' isn't replayed
    if (lastAssistantIdRef.current) {
      try {
        reducer.primeMessage(lastAssistantIdRef.current);
        console.log('[ChatUI resume] Primed reducer with last assistant id:', lastAssistantIdRef.current);
      } catch (e) {
        console.warn('[ChatUI resume] Failed to prime reducer', e);
      }
    }
    const afterIdParam = resumeAfterIdRef.current ? `?afterId=${encodeURIComponent(resumeAfterIdRef.current)}` : '';
    if (afterIdParam) {
      console.log('[ChatUI resume] Connecting SSE with afterId:', resumeAfterIdRef.current);
    } else {
      console.log('[ChatUI resume] Connecting SSE without afterId');
    }
    const es = new EventSource(`/api/experiences/${experienceId}/conversations/${currentConversationId}/events${afterIdParam}`);
    eventSourceRef.current = es;
    firstEventLoggedRef.current = false;

    let cancelled = false;

    es.addEventListener('ping', () => {
      // Heartbeat: keep connection alive; do not change UI status
    });

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (!firstEventLoggedRef.current) {
          console.log('[ChatUI SSE] First event after (re)connect:', data?.type);
          firstEventLoggedRef.current = true;
        }
        if (!data || typeof data !== 'object') return;
        if (data.type === 'connected') return;
        if (data.type === 'start' && !data.messageId) return; // ignore custom

        const snap = reducer.handleEvent(data);
        if (snap && snap.id) {
          currentAssistantIdRef.current = snap.id;
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === snap.id);
            if (idx === -1) return [...prev, snap];
            const next = prev.slice();
            next[idx] = snap;
            return next;
          });
        }
        if (data.type === 'finish' || data.type === 'abort') setStatus('ready');
        else if (data.type !== 'connected' && data.type !== 'ping') setStatus('streaming');
      } catch (e) {
        console.error('[ChatUI] SSE parse error:', e);
      }
    };

    es.onerror = () => {
      setStatus('connecting');
      // keep ES open; server will attempt reconnects automatically if needed
    };

    return () => {
      cancelled = true;
      try { es.close(); } catch {}
      eventSourceRef.current = null;
    };
  }, [currentConversationId, experienceId, isLoadingConversation]);

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
      const selectedId = conversationId;

      // Fetch messages and persisted topic/title in parallel
      const [response, convo] = await Promise.all([
        fetch(`/api/experiences/${experienceId}/conversations/${selectedId}`, { method: 'GET' }),
        supabase
          .from('conversations')
          .select('title')
          .eq('id', selectedId)
          .maybeSingle(),
      ]);

      // If the user switched conversations while we were fetching, ignore results
      if (currentConversationIdRef.current !== selectedId) {
        return;
      }

      if (!response.ok) {
        console.error('Failed to load messages');
      } else {
        const data = await response.json();
        const loaded = data.messages || [];
        setMessages(loaded);
        // Prepare base parts map and resume cursor from DB-loaded messages
        try {
          basePartsRef.current = {};
          for (const m of loaded) {
            if (m && m.role === 'assistant' && Array.isArray(m.parts)) {
              basePartsRef.current[m.id] = m.parts;
            }
          }
          const lastAssistant = [...loaded].reverse().find((m) => m?.role === 'assistant' && Array.isArray(m.parts) && m.parts.length > 0);
          if (lastAssistant) {
            const rev = [...lastAssistant.parts].reverse();
            const lastWithId = rev.find((p) => (p && (p.id || p.toolCallId)) && (p.state === 'done' || p.state === 'output-available' || p.state === 'output-error' || p.state === undefined));
            resumeAfterIdRef.current = lastWithId?.id || lastWithId?.toolCallId || null;
            lastAssistantIdRef.current = lastAssistant.id;
            console.log('[ChatUI resume] DB load computed:', {
              lastAssistantId: lastAssistantIdRef.current,
              afterId: resumeAfterIdRef.current,
            });
          } else {
            resumeAfterIdRef.current = null;
            lastAssistantIdRef.current = null;
            console.log('[ChatUI resume] No assistant message found in DB for resume');
          }
        } catch (e) {
          console.warn('[ChatUI] Failed computing resume cursor:', e);
          resumeAfterIdRef.current = null;
          lastAssistantIdRef.current = null;
        }
      }

      if (!convo.error) {
        setConversationTopic(convo.data?.title || null);
      } else {
        console.warn('[ChatUI] Failed to load conversation title:', convo.error);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      // Only clear loading state if still on the same conversation
      if (currentConversationIdRef.current === conversationId) {
        setIsLoadingConversation(false);
      }
    }
  };

  // Function to generate topic non-blocking
  const generateConversationTopic = async (message, conversationId) => {
    try {
      console.log('[ChatUI] Generating topic for conversation:', conversationId);
      const requestConvId = conversationId;
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
        // Update header only if the same conversation is still active
        if (currentConversationIdRef.current === requestConvId) {
          setConversationTopic(data.topic);
        }
        
        // Also update the conversation title in the database
        await supabase
          .from('conversations')
          .update({ title: data.topic })
          .eq('id', requestConvId);
        
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

      // Indicate submission immediately so UI shows loader/disabled state
      setStatus('submitted');

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
