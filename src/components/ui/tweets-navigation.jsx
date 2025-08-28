import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function TweetsNavigation({ experienceId = null, className = "" }) {
  const tweetsUrl = experienceId ? `/experiences/${experienceId}/tweets` : '/tweets';
  
  return (
    <Link href={tweetsUrl} className={className}>
      <Button variant="outline" size="sm" className="flex items-center space-x-2">
        <span>🐦</span>
        <span>X Tweets</span>
      </Button>
    </Link>
  );
}