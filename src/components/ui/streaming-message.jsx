"use client"

import { useEffect, useRef, useState, useCallback } from 'react'

// Typewriter that "finishes to target":
// - For older messages (animate=false on first mount), snaps to full text.
// - If animation is in progress and animate flips to false (e.g., tool status -> complete),
//   it continues typing locally until it reaches the target, then stops (no jump).
export function StreamingMessage({ text = '', animate = true, speed = 20 }) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  const targetRef = useRef('') // latest full text target
  const indexRef = useRef(0) // current typed index into target
  const rafRef = useRef(null)
  const lastTimeRef = useRef(0)
  const animatingRef = useRef(false)
  const mountedRef = useRef(false)

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    animatingRef.current = false
  }, [])

  const step = useCallback((t) => {
    const full = targetRef.current
    const delay = Math.max(10, 100 - speed)
    // Dynamic stride: type more chars at higher speeds for faster catch-up
    const stride = Math.min(8, Math.max(1, Math.floor(speed / 20)))
    if (indexRef.current < full.length) {
      if (t - lastTimeRef.current > delay) {
        indexRef.current = Math.min(full.length, indexRef.current + stride)
        setDisplayedText(full.slice(0, indexRef.current))
        lastTimeRef.current = t
      }
      rafRef.current = requestAnimationFrame(step)
    } else {
      setDisplayedText(full)
      setIsComplete(true)
      stop()
    }
  }, [speed, stop])

  // Sync to new text / animate changes
  useEffect(() => {
    targetRef.current = text || ''

    if (!mountedRef.current) {
      // On first mount, snap if not animating for live stream
      if (!animate) {
        setDisplayedText(targetRef.current)
        indexRef.current = targetRef.current.length
        setIsComplete(true)
        stop()
      } else {
        // Start animating from 0 toward target
        indexRef.current = 0
        setIsComplete(false)
        animatingRef.current = true
        rafRef.current = requestAnimationFrame((t) => { lastTimeRef.current = t; step(t) })
      }
      mountedRef.current = true
      return
    }

    // If target shrank, clamp
    if (indexRef.current > targetRef.current.length) indexRef.current = targetRef.current.length

    if (!animate) {
      // If we are currently animating and not caught up, continue to finish to target.
      if (animatingRef.current && indexRef.current < targetRef.current.length) {
        // Do nothing: keep RAF running to finish, then stop.
      } else {
        // Not animating or already caught up: snap to full.
        setDisplayedText(targetRef.current)
        indexRef.current = targetRef.current.length
        setIsComplete(true)
        stop()
      }
      return
    }

    // animate=true: ensure animation is running if there is remaining text
    if (indexRef.current < targetRef.current.length && !animatingRef.current) {
      setIsComplete(false)
      animatingRef.current = true
      rafRef.current = requestAnimationFrame((t) => { lastTimeRef.current = t; step(t) })
    }
  }, [text, animate, step, stop])

  // Cleanup
  useEffect(() => () => stop(), [stop])

  // Render (caret only while incomplete)
  return (
    <div className="min-h-[1em]">
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-current ml-1 animate-pulse" />
      )}
    </div>
  )
}
