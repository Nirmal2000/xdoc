"use client";

import React from "react";
import {
  Edit3,
  RefreshCw,
  Image as ImageIcon,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function TweetToolbox({
  className,
  onPost,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  value = "",
  onChange = () => {},
  onAIClick = () => {},
  onRegen = () => {},
  isAILoading = false,
  isRegenLoading = false,
}) {
  if (isEditing) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 w-full",
          className,
        )}
      >
        <button
          onClick={onSave}
          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
          title="Save changes"
        >
          <Check className="w-5 h-5" />
        </button>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center w-full gap-3", className)}>
      {/* Left: icons and overlay inputs */}
      <ToolboxControls
        onEdit={onEdit}
        onRegen={onRegen}
        onAIClick={onAIClick}
        isRegenLoading={isRegenLoading}
        isAILoading={isAILoading}
        value={value}
        onChange={onChange}
      />

      {/* Right: Post button */}
      <button
        onClick={onPost}
        className="px-3 h-8 rounded-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-sm font-medium transition-colors"
      >
        Post
      </button>
    </div>
  );
}

function ToolboxControls({
  onEdit,
  onRegen,
  onAIClick,
  isRegenLoading,
  isAILoading,
  value,
  onChange,
}) {
  const [showRegenBox, setShowRegenBox] = React.useState(false);
  const [showImageBox, setShowImageBox] = React.useState(false);
  const [regenFocused, setRegenFocused] = React.useState(false);
  const [imageFocused, setImageFocused] = React.useState(false);
  const wrapperRef = React.useRef(null);
  const regenRef = React.useRef(null);
  const imageRef = React.useRef(null);

  // Close both overlays
  const closeAll = () => {
    setShowRegenBox(false);
    setShowImageBox(false);
  };

  // Close when clicking outside of the controls/overlays
  React.useEffect(() => {
    function handleDocClick(e) {
      const el = wrapperRef.current;
      if (!el) return;
      if (showRegenBox || showImageBox) {
        if (!el.contains(e.target)) {
          closeAll();
        }
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [showRegenBox, showImageBox]);

  return (
    <div
      ref={wrapperRef}
      className="relative flex items-center gap-2 flex-1"
      onMouseDown={(e) => {
        // If a pill is open and the click is somewhere in the toolbox
        // but not inside the pill itself, close it.
        if (showRegenBox || showImageBox) {
          const inRegen = regenRef.current?.contains(e.target);
          const inImage = imageRef.current?.contains(e.target);
          if (!inRegen && !inImage) {
            closeAll();
          }
        }
      }}
    >
      {/* Icon buttons */}
      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
        <button
          onClick={onEdit}
          className="p-1 hover:text-foreground"
          title="Edit Tweet"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            // open regen input overlay
            setShowRegenBox((s) => !s);
            setShowImageBox(false);
          }}
          className="p-1 hover:text-foreground"
          title="Regen Tweet"
          disabled={isRegenLoading}
        >
          {isRegenLoading ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>

        {/* Replaced AI with Image icon */}
        <button
          onClick={() => {
            setShowImageBox((s) => !s);
            setShowRegenBox(false);
          }}
          className="p-1 hover:text-foreground"
          title="generate image"
          disabled={isAILoading}
        >
          {isAILoading ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Overlay: Regen instructions */}
      {showRegenBox && (
        <div ref={regenRef} className="absolute top-full left-0 mt-2 z-30">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full bg-black text-white border border-zinc-700 shadow-md transition-all duration-200",
              regenFocused ? "w-[360px] px-3 py-1.5" : "w-[240px] px-3 py-1",
            )}
            role="dialog"
            aria-label="Regenerate Tweet"
          >
            <RefreshCw className="w-4 h-4 text-zinc-400" />
            <input
              type="text"
              autoFocus
              placeholder="Optional instructions to regen tweet"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setRegenFocused(true)}
              onBlur={() => setRegenFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRegen(value);
                  closeAll();
                } else if (e.key === "Escape") {
                  closeAll();
                }
              }}
              className="flex-1 h-8 bg-transparent placeholder:text-zinc-400 focus:outline-none"
            />
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                onRegen(value);
                closeAll();
              }}
              className="p-1 text-gray-300 hover:text-green-500"
              title="Apply"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                closeAll();
              }}
              className="p-1 text-gray-300 hover:text-red-500"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Overlay: Image generation instructions */}
      {showImageBox && (
        <div ref={imageRef} className="absolute top-full left-0 mt-2 z-30">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full bg-black text-white border border-zinc-700 shadow-md transition-all duration-200",
              imageFocused ? "w-[360px] px-3 py-1.5" : "w-[240px] px-3 py-1",
            )}
            role="dialog"
            aria-label="Generate Image"
          >
            <ImageIcon className="w-4 h-4 text-zinc-400" />
            <input
              type="text"
              autoFocus
              placeholder="Optional instructions to generate image"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setImageFocused(true)}
              onBlur={() => setImageFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAIClick();
                  closeAll();
                } else if (e.key === "Escape") {
                  closeAll();
                }
              }}
              className="flex-1 h-8 bg-transparent placeholder:text-zinc-400 focus:outline-none"
            />
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                onAIClick();
                closeAll();
              }}
              className="p-1 text-gray-300 hover:text-green-500"
              title="Generate"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                closeAll();
              }}
              className="p-1 text-gray-300 hover:text-red-500"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
