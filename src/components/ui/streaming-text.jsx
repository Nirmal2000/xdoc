"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/ui/markdown";

// Lightweight typewriter streaming without cursor/blink.
// - Streams only when `animate` is true
// - Continues smoothly as `text` grows
// - Renders Markdown when `markdown` is true
// - `speed` controls typing pace (higher is faster)
export const StreamingText = memo(function StreamingText({
  text = "",
  animate = true,
  speed = 80,
  markdown = true,
}) {
  // Show whatever text we already have immediately on mount
  // to avoid re-typing previously streamed content (e.g., after reconnect).
  const [displayed, setDisplayed] = useState(text || "");

  // Target full text to render (latest prop)
  const targetRef = useRef(text || "");
  // Current typed index into targetRef
  const indexRef = useRef(0);
  // RAF handle + last timestamp
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const animatingRef = useRef(false);
  const mountedRef = useRef(false);

  const stopAnimation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    animatingRef.current = false;
  }, []);

  const step = useCallback(
    (time) => {
      const full = targetRef.current;
      // Tighter mapping: faster delay and larger stride for high speeds
      const typewriterDelay = Math.max(5, 100 - speed); // higher speed -> shorter delay
      const stride = Math.min(8, Math.max(1, Math.floor(speed / 20))); // type multiple chars per tick at higher speeds

      if (indexRef.current < full.length) {
        if (time - lastTimeRef.current > typewriterDelay) {
          indexRef.current = Math.min(full.length, indexRef.current + stride);
          setDisplayed(full.slice(0, indexRef.current));
          lastTimeRef.current = time;
        }
        rafRef.current = requestAnimationFrame(step);
      } else {
        // Typed to completion of current target
        setDisplayed(full);
        stopAnimation();
      }
    },
    [speed, stopAnimation]
  );

  // Sync on text/animate changes
  useEffect(() => {
    targetRef.current = text || "";

    if (!mountedRef.current) {
      // On first mount, snap to whatever we already have (no typing).
      // This prevents re-typing on Redis replay or when resuming.
      setDisplayed(targetRef.current);
      indexRef.current = targetRef.current.length;
      stopAnimation();
      mountedRef.current = true;
      return;
    }

    // If target shrank, clamp index
    if (indexRef.current > targetRef.current.length) {
      indexRef.current = targetRef.current.length;
    }

    // If animation is disabled, only snap if not mid-typing.
    // If currently animating and not caught up, continue to finish to target (no jump).
    if (!animate) {
      if (!animatingRef.current || indexRef.current >= targetRef.current.length) {
        setDisplayed(targetRef.current);
        indexRef.current = targetRef.current.length;
        stopAnimation();
      }
      return;
    }

    // Start animation if not already running and there is remaining text.
    if (indexRef.current < targetRef.current.length && !animatingRef.current) {
      animatingRef.current = true;
      rafRef.current = requestAnimationFrame((t) => {
        lastTimeRef.current = t;
        step(t);
      });
    }

    // No cleanup on prop change; only on unmount.
  }, [text, animate, step, stopAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAnimation();
  }, [stopAnimation]);

  const content = useMemo(() => displayed, [displayed]);

  if (markdown) return <Markdown>{content}</Markdown>;
  return <>{content}</>;
});
