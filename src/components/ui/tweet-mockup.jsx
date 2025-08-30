"use client"

import { motion } from 'framer-motion'
import { ChevronsLeft, User, ExternalLink } from 'lucide-react'
import { memo } from 'react'
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

// Props interface for the TweetMockup component
export const TweetMockup = memo(
  ({
    children,
    index,
    text,
    threads,
    isConnectedBefore,
    isConnectedAfter,
    isLoading = false,
    isLineClampEnabled = false,
    showPostButton = false,
    account = {
      name: 'Demo User',
      username: 'demo_user',
      verified: false
    },
    onApply,
    className
  }) => {

    const containerVariants = {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: 'spring',
          duration: 0.6,
          bounce: 0.1,
          staggerChildren: 0.1,
          delayChildren: 0.2,
        },
      },
    }

    const handleApply = () => {
      if (onApply) {
        onApply(text, threads, index)
      }
    }

    const handlePostToX = () => {
      let tweetText = text
      
      // If no text prop, try to extract from children
      if (!tweetText && children) {
        if (typeof children === 'string') {
          tweetText = children
        } else if (children.props && children.props.text) {
          // For StreamingMessage components
          tweetText = children.props.text
        } else if (typeof children === 'object' && children.props && children.props.children) {
          // For div elements with text content
          tweetText = children.props.children
        }
      }
      
      if (tweetText) {
        const encodedText = encodeURIComponent(tweetText.trim())
        window.open(`https://x.com/compose/post?text=${encodedText}`, '_blank')
      }
    }

    return (
      <motion.div
        variants={isLoading ? containerVariants : undefined}
        initial={isLoading ? 'hidden' : false}
        animate={isLoading ? 'visible' : false}
        className={cn(
          'w-full grid grid-cols-[40px,1fr] gap-3 min-w-0 py-3 px-4 rounded-2xl relative',
          {
            'p-6': threads?.length === 1 || isLoading,
            'border border-border bg-card shadow-lg': !isConnectedAfter && !isConnectedBefore,
          },
          className
        )}
      >
        {/* Avatar Column */}
        <div className="relative z-50 w-10 h-14 bg-card flex -top-2.5 items-center justify-center">
          <Avatar className="relative !z-50 size-10">
            {account.avatar ? (
              <img src={account.avatar} alt={account.name} className="aspect-square h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                {account.name ? (
                  <span className="text-sm font-medium">{account.name[0]?.toUpperCase()}</span>
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
            )}
          </Avatar>
        </div>

        {/* Content Column */}
        <div className="w-full flex flex-col items-start">
          {/* Header with name, handle, and apply button */}
          <div className="w-full flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm leading-[1.2]">
                {account.name}
                {account.verified && (
                  <span className="ml-1 text-blue-500">✓</span>
                )}
              </span>
              <span className="text-muted-foreground text-sm leading-[1.2]">
                @{account.username}
              </span>
            </div>

            {/* {!isLoading && !isConnectedBefore && onApply && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute right-4 top-4 flex items-center gap-2"
              >
                <Button
                  onClick={handleApply}
                  variant="outline"
                  size="sm"
                  className="text-sm w-fit h-8 px-2"
                >
                  <ChevronsLeft className="size-4 mr-1" /> Apply
                </Button>
              </motion.div>
            )} */}
          </div>

          {/* Content Area */}
          <div className="w-full flex-1 pt-0.5">
            <div className="mt-1 text-foreground text-[15px] space-y-3 whitespace-pre-wrap">
              {isLoading ? (
                <div className="space-y-2">
                  <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="h-4 bg-muted rounded animate-pulse"
                    style={{ width: '85%' }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="h-4 bg-muted rounded animate-pulse"
                    style={{ width: '92%' }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="h-4 bg-muted rounded animate-pulse"
                    style={{ width: '78%' }}
                  />
                </div>
              ) : (
                children || (
                  <div 
                    className={cn(
                      isLineClampEnabled && "overflow-hidden"
                    )}
                    style={isLineClampEnabled ? {
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    } : {}}
                  >
                    {text}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Blue Post Button - Bottom Right */}
        {!isLoading && showPostButton && (text || children) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="absolute bottom-3 right-3 z-10"
          >
            <Button
              onClick={handlePostToX}
              className="bg-[#1DA1F2] hover:bg-[#1a91da] text-white border-0 h-8 px-3 rounded-full font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-xl"
              size="sm"
            >
              <ExternalLink className="w-3 h-3 mr-1.5" />
              Post
            </Button>
          </motion.div>
        )}
      </motion.div>
    )
  }
)

TweetMockup.displayName = 'TweetMockup'