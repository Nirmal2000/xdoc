"use client"

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { CircularLoader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import {
  ArrowUp,
  Globe,
  Mic,
} from "lucide-react";
import { ModelSelector } from "@/components/ui/model-selector";

/**
 * Component for handling prompt input, voice recording, and actions
 */
export function ChatInput({
  prompt,
  onPromptChange,
  onSubmit,
  status,
  isSearchEnabled,
  onSearchToggle,
  isRecording,
  onVoiceRecording,
  isSubmitDisabled,
  isInputDisabled,
  placeholder,
  selectedModel,
  onModelChange
}) {
  return (
    <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
      <div className="mx-auto max-w-3xl">
        <PromptInput
          isLoading={status === 'streaming' || status === 'submitted'}
          value={prompt}
          onValueChange={onPromptChange}
          onSubmit={onSubmit}
          className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
        >
          <div className="flex flex-col">
            <PromptInputTextarea
              placeholder={placeholder}
              className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
              disabled={isInputDisabled}
            />

            <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
              <InputLeftActions
                isSearchEnabled={isSearchEnabled}
                onSearchToggle={onSearchToggle}
                selectedModel={selectedModel}
                onModelChange={onModelChange}
              />
              <InputRightActions
                isRecording={isRecording}
                onVoiceRecording={onVoiceRecording}
                onSubmit={onSubmit}
                isSubmitDisabled={isSubmitDisabled}
                status={status}
              />
            </PromptInputActions>
          </div>
        </PromptInput>
      </div>
    </div>
  );
}

function InputLeftActions({ isSearchEnabled, onSearchToggle, selectedModel, onModelChange }) {
  return (
    <div className="flex items-center gap-2">
      <PromptInputAction tooltip="Select AI Model">
        <ModelSelector
          value={selectedModel}
          onValueChange={onModelChange}
        />
      </PromptInputAction>

      <PromptInputAction tooltip="Search">
        <Button 
          type="button" 
          variant="outline" 
          className={cn(
            "rounded-full",
            isSearchEnabled && "bg-white text-black hover:bg-gray-200 hover:text-black"
          )}
          onClick={onSearchToggle}
        >
          <Globe size={18} />
          Search
        </Button>
      </PromptInputAction>
    </div>
  );
}

function InputRightActions({ 
  isRecording, 
  onVoiceRecording, 
  onSubmit, 
  isSubmitDisabled, 
  status 
}) {
  return (
    <div className="flex items-center gap-2">
      <PromptInputAction tooltip={isRecording ? "Stop recording" : "Voice input"}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "size-9 rounded-full",
            isRecording && "bg-red-500 text-white hover:bg-red-600"
          )}
          onClick={onVoiceRecording}
        >
          <Mic size={18} />
        </Button>
      </PromptInputAction>

      <Button
        size="icon"
        disabled={isSubmitDisabled}
        onClick={onSubmit}
        className="size-9 rounded-full"
      >
        {(status === 'streaming' || status === 'submitted') ? (
          <div className="size-4 animate-spin rounded-full border-[3px] border-black/90 border-t-transparent" />
        ) : (
          <ArrowUp size={18} />
        )}
      </Button>
    </div>
  );
}