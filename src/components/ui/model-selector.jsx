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
  const [customModels, setCustomModels] = React.useState([])

  // Ensure component only renders after hydration to prevent mismatch
  React.useEffect(() => {
    setIsMounted(true)
    // Load custom models from localStorage
    const saved = localStorage.getItem('custom-models')
    if (saved) {
      try {
        setCustomModels(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load custom models:', error)
      }
    }
  }, [])

  const predefinedModels = [
    { value: "xai/grok-4", label: "xai/grok-4" },
    { value: "openai/gpt-4o", label: "openai/gpt-4o" }
  ]

  // All available models (predefined + custom)
  const allModels = [...predefinedModels, ...customModels]

  // Check if current value is a predefined model
  React.useEffect(() => {
    const isPredefined = allModels.some(model => model.value === value)
    if (!isPredefined && value) {
      setIsCustomMode(true)
      setCustomValue(value)
    }
  }, [value, allModels])

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
      const trimmedValue = customValue.trim()
      
      // Add to custom models if it doesn't exist
      const exists = allModels.some(model => model.value === trimmedValue)
      if (!exists) {
        const newCustomModels = [...customModels, { value: trimmedValue, label: trimmedValue }]
        setCustomModels(newCustomModels)
        // Save to localStorage
        localStorage.setItem('custom-models', JSON.stringify(newCustomModels))
      }
      
      onValueChange(trimmedValue)
      setIsCustomMode(false)
      setCustomValue("")
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
        {customModels.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Custom Models</div>
            {customModels.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </>
        )}
        <SelectItem value="custom">Custom model...</SelectItem>
      </SelectContent>
    </Select>
  )
})

ModelSelector.displayName = "ModelSelector"

export { ModelSelector }