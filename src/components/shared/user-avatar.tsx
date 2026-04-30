import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/format';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function UserAvatar({ src, name, size = 'md', className }: UserAvatarProps) {
  const initials = getInitials(name);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {src && <AvatarImage src={src} alt={name || 'User avatar'} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
