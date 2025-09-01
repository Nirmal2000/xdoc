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
  const { isRecording, transcripts, toggleRecording, getTranscriptText } = voiceRecording;

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
  useEffect(() => {
    if (isRecording) {
      const realTimeTranscript = getTranscriptText();
      if (realTimeTranscript.trim()) {
        // Return updated prompt for parent component to use
        return originalPrompt + (originalPrompt ? ' ' : '') + realTimeTranscript;
      } else {
        // If no transcript yet, keep original prompt
        return originalPrompt;
      }
    }
  }, [transcripts, isRecording, getTranscriptText, originalPrompt]);

  return {
    isRecording,
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
export function useChatInput(onSubmit, currentConversationId, userId) {
  const [prompt, setPrompt] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
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
      
      onSubmit(prompt.trim(), { search: isSearchEnabled, model: selectedModel });
      setPrompt('');
    }
  };

  const handleSearchToggle = () => {
    setIsSearchEnabled(prev => !prev);
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
    isSearchEnabled,
    selectedModel,
    setSelectedModel,
    handleSubmit,
    handleSearchToggle,
    isSubmitDisabled,
    isInputDisabled,
    getPlaceholder
  };
}