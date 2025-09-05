"use client";
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

const PromptInputContext = createContext({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
  textareaRef: React.createRef(),
})

function usePromptInput() {
  const context = useContext(PromptInputContext)
  if (!context) {
    throw new Error("usePromptInput must be used within a PromptInput")
  }
  return context
}

function PromptInput({
  className,
  isLoading = false,
  maxHeight = 240,
  value,
  onValueChange,
  onSubmit,
  children
}) {
  const [internalValue, setInternalValue] = useState(value || "")
  const textareaRef = useRef(null)

  const handleChange = (newValue) => {
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <TooltipProvider>
      <PromptInputContext.Provider
        value={{
          isLoading,
          value: value ?? internalValue,
          setValue: onValueChange ?? handleChange,
          maxHeight,
          onSubmit,
          textareaRef,
        }}>
        <div
          className={cn(
            "border-input bg-background cursor-text rounded-3xl border p-2 shadow-xs",
            className
          )}
          onClick={() => textareaRef.current?.focus()}>
          {children}
        </div>
      </PromptInputContext.Provider>
    </TooltipProvider>
  );
}

function PromptInputTextarea({
  className,
  onKeyDown,
  disableAutosize = false,
  ...props
}) {
  const { value, setValue, maxHeight, onSubmit, disabled, textareaRef } =
    usePromptInput()

  useEffect(() => {
    if (disableAutosize) return

    if (!textareaRef.current) return
    textareaRef.current.style.height = "auto"
    textareaRef.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`
  }, [value, maxHeight, disableAutosize])

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit?.()
    }
    onKeyDown?.(e)
  }

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "text-primary min-h-[44px] w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        className
      )}
      rows={1}
      disabled={disabled}
      {...props} />
  );
}

function PromptInputActions({
  children,
  className,
  ...props
}) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  );
}

function PromptInputAction({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}) {
  const { disabled } = usePromptInput()

  if (!tooltip) {
    return (
      <div onClick={(e) => e.stopPropagation()} className={className}>
        {children}
      </div>
    );
  }

  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled} onClick={event => event.stopPropagation()}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
}
