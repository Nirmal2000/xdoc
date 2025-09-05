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
  Mic,
  Users,
} from "lucide-react";
import { ModelSelector } from "@/components/ui/model-selector";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

/**
 * Component for handling prompt input, voice recording, and actions
 */
export function ChatInput({
  prompt,
  onPromptChange,
  onSubmit,
  status,
  personas = [],
  selectedPersona,
  onPersonaChange,
  isRecording,
  isVoiceStarting,
  onVoiceRecording,
  isSubmitDisabled,
  isInputDisabled,
  placeholder,
  selectedModel,
  onModelChange,
  rateLimitInfo
}) {
  return (
    <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
      <div className="mx-auto max-w-3xl">
        {/* Rate Limit Info */}
        {/* {rateLimitInfo && (
          <div className="mb-2 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground">
              <span>
                {rateLimitInfo.allowed ? (
                  `${rateLimitInfo.remainingMessages} messages remaining (12h limit)`
                ) : (
                  <span className="text-red-500 font-medium">
                    Rate limit reached - {rateLimitInfo.resetInHours}h until reset
                  </span>
                )}
              </span>
            </div>
          </div>
        )} */}
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
                personas={personas}
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                selectedPersona={selectedPersona}
                onPersonaChange={onPersonaChange}
              />
              <InputRightActions
                isRecording={isRecording}
                isVoiceStarting={isVoiceStarting}
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

function InputLeftActions({ personas, selectedModel, onModelChange, selectedPersona, onPersonaChange }) {
  const hasPersonas = Array.isArray(personas) && personas.length > 0;
  return (
    <div className="flex items-center gap-2">
      <PromptInputAction>
        <div>
          <ModelSelector
            value={selectedModel}
            onValueChange={onModelChange}
          />
        </div>
      </PromptInputAction>

      {hasPersonas ? (
        <PromptInputAction>
          <div>
            <Select
              value={selectedPersona ? selectedPersona.name : undefined}
              onValueChange={(val) => {
                if (selectedPersona && selectedPersona.name === val) {
                  onPersonaChange(null); // toggle off if same selected
                } else {
                  const p = personas.find((x) => x.name === val);
                  onPersonaChange(p || null);
                }
              }}
            >
              <SelectTrigger className="h-9 min-w-[140px] rounded-full">
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <SelectValue placeholder="Personas" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {personas.map((p) => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PromptInputAction>
      ) : (
        <PromptInputAction tooltip="Create one by chatting!">
          <div>
            <Select value={undefined}>
              <SelectTrigger className="h-9 min-w-[140px] rounded-full" disabled>
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <SelectValue placeholder="Personas" />
                </div>
              </SelectTrigger>
            </Select>
          </div>
        </PromptInputAction>
      )}
    </div>
  );
}

function InputRightActions({ 
  isRecording,
  isVoiceStarting,
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
          disabled={isVoiceStarting}
        >
          {isVoiceStarting ? (
            <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Mic size={18} />
          )}
        </Button>
      </PromptInputAction>

      <Button
        size="icon"
        disabled={isSubmitDisabled}
        onClick={onSubmit}
        className="size-9 rounded-full"
      >
        {(status === 'streaming' || status === 'submitted') ? (
          <div className="size-4 animate-spin rounded-full border-2 border-black/90 border-t-transparent" />
        ) : (
          <ArrowUp size={18} />
        )}
      </Button>
    </div>
  );
}
