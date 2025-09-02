import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Markdown } from "./markdown"

const Message = ({
  children,
  className,
  ...props
}) => (
  <div className={cn("flex gap-3", className)} {...props}>
    {children}
  </div>
)

const MessageAvatar = ({
  src,
  alt,
  fallback,
  delayMs,
  className
}) => {
  return (
    <Avatar className={cn("h-8 w-8 shrink-0", className)}>
      <AvatarImage src={src} alt={alt} />
      {fallback && (
        <AvatarFallback delayMs={delayMs}>{fallback}</AvatarFallback>
      )}
    </Avatar>
  );
}

const MessageContent = ({
  children,
  markdown = false,
  className,
  ...props
}) => {
  // Do not apply prose by default to avoid unintended spacing/line-height
  const base = "rounded-lg p-2 text-foreground bg-secondary break-words whitespace-normal";
  const classNames = cn(base, className);

  return markdown ? (
    <Markdown className={classNames} {...props}>
      {children}
    </Markdown>
  ) : (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
}

const MessageActions = ({
  children,
  className,
  ...props
}) => (
  <div
    className={cn("text-muted-foreground flex items-center gap-2", className)}
    {...props}>
    {children}
  </div>
)

const MessageAction = ({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}) => {
  return (
    <TooltipProvider>
      <Tooltip {...props}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} className={className}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { Message, MessageAvatar, MessageContent, MessageActions, MessageAction }
