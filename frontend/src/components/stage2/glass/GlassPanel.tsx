import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

export function GlassPanel({
  children,
  className,
  strong,
  live,
  fill,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  live?: boolean;
  /** Stretch inner content for flex + scroll layouts (portal / feed columns) */
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        'glass-panel relative overflow-hidden',
        strong && 'glass-panel-strong',
        live && 'glass-live-pulse',
        fill && 'flex h-full min-h-0 min-w-0 flex-col',
        className,
      )}
    >
      <div className={cn('relative z-[1]', fill && 'flex min-h-0 min-w-0 flex-1 flex-col')}>{children}</div>
    </div>
  );
}
