import { motion } from 'framer-motion'
import { ChevronsLeft, User } from 'lucide-react'
import { PropsWithChildren, memo } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility function for class merging
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

// Simple Avatar Component
function Avatar({ src, fallback, className }: { 
  src?: string; 
  fallback?: string; 
  className?: string 
}) {
  return (
    <div className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}>
      {src ? (
        <img src={src} alt="Avatar" className="aspect-square h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          {fallback ? (
            <span className="text-sm font-medium">{fallback}</span>
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>
      )}
    </div>
  )
}

// Simple Button Component
function Button({ 
  children, 
  onClick, 
  variant = 'secondary',
  size = 'sm',
  className,
  ...props 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  className?: string;
  [key: string]: any;
}) {
  const baseStyles = 'font-semibold rounded-lg relative transition-transform active:translate-y-0.5 active:shadow-none focus:outline-none flex items-center justify-center'
  
  const variantStyles = {
    primary: 'bg-blue-600 text-white border border-b-2 border-blue-700 hover:bg-blue-500 shadow-[0_3px_0_#1d4ed8]',
    secondary: 'bg-white border text-stone-800 border-b-2 border-gray-300 hover:bg-gray-50 shadow-[0_3px_0_#d1d5db]'
  }
  
  const sizeStyles = {
    sm: 'text-sm py-2 px-4 h-8',
    md: 'text-base py-3 px-6'
  }

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

// Props interface
interface TweetMockupProps {
  isLoading?: boolean
  text?: string
  threads?: string[]
  isConnectedBefore?: boolean
  isConnectedAfter?: boolean
  index: number
  // Account details
  account?: {
    name: string
    username: string
    avatar?: string
    verified?: boolean
  }
  // Callbacks
  onApply?: (text?: string, threads?: string[], index?: number) => void
  // Styling
  className?: string
}

export const TweetMockup = memo(
  ({
    children,
    index,
    text,
    threads,
    isConnectedBefore,
    isConnectedAfter,
    isLoading = false,
    account = {
      name: 'Demo User',
      username: 'demo_user',
      verified: false
    },
    onApply,
    className
  }: PropsWithChildren<TweetMockupProps>) => {

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

    return (
      <motion.div
        variants={isLoading ? containerVariants : undefined}
        initial={isLoading ? 'hidden' : false}
        animate={isLoading ? 'visible' : false}
        className={cn(
          'w-full grid grid-cols-[40px,1fr] gap-3 min-w-0 py-3 px-4 rounded-2xl',
          {
            'p-6': threads?.length === 1 || isLoading,
            'border border-black border-opacity-[0.01] bg-clip-padding group bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]':
              !isConnectedAfter && !isConnectedBefore,
          },
          className
        )}
      >
        {/* Avatar Column */}
        <div className="relative z-50 w-10 h-14 bg-white flex -top-2.5 items-center justify-center">
          <Avatar 
            src={account.avatar}
            fallback={account.name[0]?.toUpperCase()}
            className="relative !z-50 size-10" 
          />
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
              <span className="text-stone-400 text-sm leading-[1.2]">
                @{account.username}
              </span>
            </div>

            {!isLoading && !isConnectedBefore && onApply && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute right-4 top-4 flex items-center gap-2"
              >
                <Button
                  onClick={handleApply}
                  variant="secondary"
                  size="sm"
                  className="text-sm w-fit h-8 px-2"
                >
                  <ChevronsLeft className="size-4 mr-1" /> Apply
                </Button>
              </motion.div>
            )}
          </div>

          {/* Content Area */}
          <div className="w-full flex-1 pt-0.5">
            <div className="mt-1 text-slate-800 text-[15px] space-y-3 whitespace-pre-wrap">
              {isLoading ? (
                <div className="space-y-2">
                  <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ width: '85%' }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ width: '92%' }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ width: '78%' }}
                  />
                </div>
              ) : (
                children || <div>{text}</div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }
)

TweetMockup.displayName = 'TweetMockup'

// Example usage component
export function TweetMockupExample() {
  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {/* Loading state */}
      <TweetMockup 
        index={0}
        isLoading={true}
      />
      
      {/* With content */}
      <TweetMockup
        index={0}
        account={{
          name: 'John Doe',
          username: 'johndoe',
          verified: true,
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'
        }}
        onApply={(text, threads, index) => {
          console.log('Apply clicked:', { text, threads, index })
        }}
      >
        <div>Just shipped a new feature! 🚀 Really excited to see how the community responds to this one.</div>
      </TweetMockup>

      {/* Thread example */}
      <div className="relative">
        <TweetMockup
          index={0}
          isConnectedAfter={true}
          account={{
            name: 'Jane Smith',
            username: 'janesmith',
            verified: false
          }}
        >
          <div>This is the first tweet in a thread. Let me explain something important... 1/3</div>
        </TweetMockup>

        {/* Thread connector line */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: '100%' }}
          transition={{ duration: 0.5 }}
          className="absolute z-10 left-[35px] top-[44px] w-0.5 bg-gray-200/75 h-full"
        />

        <TweetMockup
          index={1}
          isConnectedBefore={true}
          isConnectedAfter={true}
          account={{
            name: 'Jane Smith',
            username: 'janesmith',
            verified: false
          }}
        >
          <div>Here's the second part of my explanation. This builds on what I said above... 2/3</div>
        </TweetMockup>

        <TweetMockup
          index={2}
          isConnectedBefore={true}
          account={{
            name: 'Jane Smith',
            username: 'janesmith',
            verified: false
          }}
        >
          <div>And finally, here's my conclusion. Thanks for reading! 3/3</div>
        </TweetMockup>
      </div>
    </div>
  )
}