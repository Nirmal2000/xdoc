"use client"

import { Edit3, RefreshCw, Image as ImageIcon, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TweetToolbox({ className, onPost }) {
  return (
    <div className={cn('flex items-center w-full gap-3', className)}>
      {/* Group: icons then textbox */}
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <button className="p-1 hover:text-foreground" title="Edit">
            <Edit3 className="w-4 h-4" />
          </button>
          <button className="p-1 hover:text-foreground" title="Regen">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="p-1 hover:text-foreground" title="Image">
            <ImageIcon className="w-4 h-4" />
          </button>
          <button className="p-1 hover:text-foreground" title="AI">
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
        <input
          type="text"
          placeholder="Add a note or instruction"
          className="flex-1 h-8 rounded-md bg-black text-white placeholder:text-zinc-400 px-2 border border-zinc-700 focus:outline-none focus:ring-0"
        />
      </div>

      {/* Right: Post button */}
      <button
        onClick={onPost}
        className="px-3 h-8 rounded-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-sm font-medium transition-colors"
      >
        Post
      </button>
    </div>
  )
}
