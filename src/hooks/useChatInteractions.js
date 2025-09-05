"use client"

import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Hook for managing message actions (copy, upvote, downvote)
 */
export function useMessageActions() {
  const [messageVotes, setMessageVotes] = useState({});

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Message copied to clipboard');
  };

  const handleUpvote = (messageId) => {
    setMessageVotes(prev => ({
      ...prev,
      [messageId]: prev[messageId] === 'up' ? null : 'up'
    }));
    toast.success('Feedback received');
  };

  const handleDownvote = (messageId) => {
    setMessageVotes(prev => ({
      ...prev,
      [messageId]: prev[messageId] === 'down' ? null : 'down'
    }));
    toast.success('Feedback received');
  };

  return {
    messageVotes,
    handleCopyMessage,
    handleUpvote,
    handleDownvote
  };
}

/**
 * Hook for managing voice input integration with prompts
 */
export function useVoiceInput(voiceRecording) {
  const [originalPrompt, setOriginalPrompt] = useState('');
  const { isRecording, isStarting, transcripts, toggleRecording, getTranscriptText } = voiceRecording;

  const handleVoiceRecording = (currentPrompt, setPrompt) => {
    if (isRecording) {
      // Stop recording - transcript is already updated in real-time
      toggleRecording();
      const transcript = getTranscriptText();
      if (transcript.trim()) {
        toast.success('Voice transcribed successfully');
      }
      setOriginalPrompt(''); // Reset original prompt
    } else {
      // Start recording - store current prompt as original
      setOriginalPrompt(currentPrompt);
      toggleRecording();
    }
  };

  // Real-time transcript updates
  // Note: Effects must return a cleanup function or nothing.
  // Do not return derived values from useEffect. The updated prompt is
  // computed on demand via getUpdatedPrompt() and applied by the caller.
  useEffect(() => {
    // No-op effect to react to transcript changes if needed in future.
  }, [transcripts, isRecording, getTranscriptText, originalPrompt]);

  return {
    isRecording,
    isStarting,
    originalPrompt,
    handleVoiceRecording,
    getUpdatedPrompt: () => {
      if (isRecording) {
        const realTimeTranscript = getTranscriptText();
        if (realTimeTranscript.trim()) {
          return originalPrompt + (originalPrompt ? ' ' : '') + realTimeTranscript;
        }
        return originalPrompt;
      }
      return null;
    }
  };
}

/**
 * Hook for managing chat input state and submission
 */
export function useChatInput(onSubmit, currentConversationId, userId, personas = []) {
  const [prompt, setPrompt] = useState('');
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [selectedModel, setSelectedModel] = useState('xai/grok-4');

  const handleSubmit = () => {
    if (prompt && prompt.trim()) {
      // Don't allow submission if conversation is being created
      if (currentConversationId?.startsWith('temp_')) {
        return;
      }
      
      // Check rate limit before submitting
      if (userId) {
        const rateLimitStatus = checkRateLimit(userId);
        if (!rateLimitStatus.allowed) {
          toast.error('Rate limit exceeded. Please wait before sending another message.');
          return;
        }
      }
      
      onSubmit(prompt.trim(), { 
        search: false,
        model: selectedModel,
        persona: selectedPersona?.persona_prompt || null
      });
      setPrompt('');
    }
  };

  const isSubmitDisabled = (status) => {
    // Check rate limit in addition to other conditions
    let rateLimitExceeded = false;
    if (userId) {
      const rateLimitStatus = checkRateLimit(userId);
      rateLimitExceeded = !rateLimitStatus.allowed;
    }
    
    return !prompt.trim() || 
           status === 'streaming' || 
           status === 'submitted' || 
           currentConversationId?.startsWith('temp_') ||
           rateLimitExceeded;
  };

  const isInputDisabled = (status) => {
    // Keep textbox editable at all times except during conversation creation
    return currentConversationId?.startsWith('temp_');
  };

  const getPlaceholder = () => {
    return currentConversationId?.startsWith('temp_') 
      ? "Creating conversation..." 
      : "Ask anything";
  };

  return {
    prompt,
    setPrompt,
    selectedPersona,
    setSelectedPersona,
    selectedModel,
    setSelectedModel,
    handleSubmit,
    isSubmitDisabled,
    isInputDisabled,
    getPlaceholder
  };
}
