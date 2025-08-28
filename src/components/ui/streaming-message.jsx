"use client"

import { useEffect, useRef, useState, useCallback } from 'react'

export function StreamingMessage({ text, animate = true, speed = 20 }) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  
  const contentRef = useRef('')
  const streamIndexRef = useRef(0)
  const animationRef = useRef(null)
  const lastTimeRef = useRef(0)

  const addPart = useCallback((newText) => {
    if (!animate) {
      setDisplayedText(text)
      setIsComplete(true)
      return
    }

    // Add new text to the content that needs to be streamed
    contentRef.current += newText
    
    // Start animation if not already running
    if (!animationRef.current) {
      const startAnimation = (time) => {
        lastTimeRef.current = time
        animateText(time)
      }
      animationRef.current = requestAnimationFrame(startAnimation)
    }
  }, [animate, text])

  const animateText = useCallback((time) => {
    const typewriterSpeed = Math.max(10, 100 - speed) // Convert speed to delay
    const fullText = contentRef.current

    if (streamIndexRef.current < fullText.length) {
      if (time - lastTimeRef.current > typewriterSpeed) {
        streamIndexRef.current++
        setDisplayedText(fullText.slice(0, streamIndexRef.current))
        lastTimeRef.current = time
      }
      animationRef.current = requestAnimationFrame(animateText)
    } else {
      setIsComplete(true)
      animationRef.current = null
    }
  }, [speed])

  // Handle text changes
  useEffect(() => {
    if (!text || !animate) {
      setDisplayedText(text || '')
      setIsComplete(true)
      return
    }

    if (contentRef.current !== text) {
      const delta = text.slice(contentRef.current.length)
      if (delta) {
        addPart(delta)
      }
      contentRef.current = text
    }
  }, [text, animate, addPart])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // If not animating, just show the full text
  if (!animate) {
    return <div>{text}</div>
  }

  return (
    <div className="min-h-[1em]">
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-current ml-1 animate-pulse" />
      )}
    </div>
  )
}