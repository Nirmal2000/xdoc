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

  // Close both overlays
  const closeAll = () => {
    setShowRegenBox(false);
    setShowImageBox(false);
  };

  return (
    <div className="relative flex items-center gap-2 flex-1">
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
        <div className="absolute top-full left-0 mt-2 z-30 w-[min(420px,90%)]">
          <div className="flex items-center gap-2 rounded-xl bg-black text-white px-2 py-1 border border-zinc-700 shadow-lg">
            <input
              type="text"
              autoFocus
              placeholder="Optional instructions to regen tweet"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 h-8 bg-transparent placeholder:text-zinc-400 focus:outline-none"
            />
            <button
              onClick={() => {
                onRegen(value);
                closeAll();
              }}
              className="p-1 text-gray-300 hover:text-green-500"
              title="Apply"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
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
        <div className="absolute top-full left-0 mt-2 z-30 w-[min(420px,90%)]">
          <div className="flex items-center gap-2 rounded-xl bg-black text-white px-2 py-1 border border-zinc-700 shadow-lg">
            <input
              type="text"
              autoFocus
              placeholder="Optional instructions to generate image"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 h-8 bg-transparent placeholder:text-zinc-400 focus:outline-none"
            />
            <button
              onClick={() => {
                onAIClick();
                closeAll();
              }}
              className="p-1 text-gray-300 hover:text-green-500"
              title="Generate"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
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
