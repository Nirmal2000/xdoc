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
  speed = 40,
  markdown = true,
}) {
  const [displayed, setDisplayed] = useState(animate ? "" : (text || ""));

  // Target full text to render (latest prop)
  const targetRef = useRef(text || "");
  // Current typed index into targetRef
  const indexRef = useRef(0);
  // RAF handle + last timestamp
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const animatingRef = useRef(false);

  const stopAnimation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    animatingRef.current = false;
  }, []);

  const step = useCallback(
    (time) => {
      const full = targetRef.current;
      const typewriterDelay = Math.max(10, 120 - speed); // higher speed -> shorter delay

      if (indexRef.current < full.length) {
        if (time - lastTimeRef.current > typewriterDelay) {
          indexRef.current += 1;
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

    if (!animate) {
      // Show full immediately when not animating
      setDisplayed(targetRef.current);
      indexRef.current = targetRef.current.length;
      stopAnimation();
      return;
    }

    // If target shrank, clamp index
    if (indexRef.current > targetRef.current.length) {
      indexRef.current = targetRef.current.length;
    }

    // Start animation if not already running and there is remaining text
    if (!animatingRef.current && indexRef.current < targetRef.current.length) {
      animatingRef.current = true;
      rafRef.current = requestAnimationFrame((t) => {
        lastTimeRef.current = t;
        step(t);
      });
    }

    return () => {
      // Do not stop on prop change; only on unmount or when animate is false
    };
  }, [text, animate, step, stopAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAnimation();
  }, [stopAnimation]);

  const content = useMemo(() => displayed, [displayed]);

  if (markdown) return <Markdown>{content}</Markdown>;
  return <>{content}</>;
});

