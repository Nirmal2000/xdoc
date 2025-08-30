"use client"

import * as React from "react"
import { Bot, Check, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ModelSelector = React.forwardRef(({ 
  value, 
  onValueChange, 
  className,
  ...props 
}, ref) => {
  const [isCustomMode, setIsCustomMode] = React.useState(false)
  const [customValue, setCustomValue] = React.useState("")
  const [isMounted, setIsMounted] = React.useState(false)

  // Ensure component only renders after hydration to prevent mismatch
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const predefinedModels = [
    { value: "xai/grok-3-mini", label: "xai/grok-3-mini" },
    { value: "openai/gpt-4o", label: "openai/gpt-4o" }
  ]

  // Check if current value is a predefined model
  React.useEffect(() => {
    const isPredefined = predefinedModels.some(model => model.value === value)
    if (!isPredefined && value) {
      setIsCustomMode(true)
      setCustomValue(value)
    }
  }, [value])

  // Don't render until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className={cn("h-9 min-w-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm", className)}>
        <div className="flex items-center gap-2">
          <Bot className="h-3 w-3" />
          <span className="text-muted-foreground">Select model</span>
        </div>
      </div>
    )
  }

  const handleValueChange = (newValue) => {
    if (newValue === "custom") {
      setIsCustomMode(true)
      setCustomValue("")
    } else {
      setIsCustomMode(false)
      onValueChange(newValue)
    }
  }

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onValueChange(customValue.trim())
      setIsCustomMode(false)
    }
  }

  const handleCustomCancel = () => {
    setIsCustomMode(false)
    setCustomValue("")
    // Revert to first predefined model
    onValueChange(predefinedModels[0].value)
  }

  const handleCustomInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCustomSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCustomCancel()
    }
  }

  if (isCustomMode) {
    return (
      <div className="flex items-center gap-1 h-9">
        <Input
          ref={ref}
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={handleCustomInputKeyDown}
          placeholder="Enter custom model..."
          className={cn("h-9 min-w-[120px] text-sm", className)}
          autoFocus
          {...props}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleCustomSubmit}
          disabled={!customValue.trim()}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleCustomCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={handleValueChange} {...props}>
      <SelectTrigger ref={ref} className={cn("h-9 min-w-[120px]", className)}>
        <div className="flex items-center gap-2">
          <Bot className="h-3 w-3" />
          <SelectValue placeholder="Select model" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {predefinedModels.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            {model.label}
          </SelectItem>
        ))}
        <SelectItem value="custom">Custom model...</SelectItem>
      </SelectContent>
    </Select>
  )
})

ModelSelector.displayName = "ModelSelector"

export { ModelSelector }