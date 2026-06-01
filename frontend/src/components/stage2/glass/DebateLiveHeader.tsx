import { cn } from '../../../lib/utils';

export function DebateLiveHeader({
  live,
  complete,
  title,
  subtitle,
  count,
  total,
  message,
  progress,
}: {
  live: boolean;
  complete: boolean;
  title: string;
  subtitle: string;
  count: number;
  total: number;
  message?: string;
  progress: number;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
      <div className="min-w-0 flex-1">
        <p className={cn('section-eyebrow', live && 'text-[var(--color-accent)]')}>
          {live ? '● Live stream' : complete ? 'Complete' : 'Stage 2'}
        </p>
        <h2 className="mt-1 text-2xl tracking-tight">{title}</h2>
        <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-[var(--color-text-muted)]">{subtitle}</p>
        {message && live && (
          <p className="mt-2 truncate text-xs text-[var(--color-accent)]">{message}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-3xl font-semibold tabular-nums tracking-tight text-[var(--color-accent)]">
          {count}
          <span className="text-lg font-normal text-[var(--color-text-muted)]">/{total}</span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">{Math.round(progress)}%</p>
      </div>
      <div className="w-full">
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]/60">
          <div
            className={cn('glass-progress-fill h-full rounded-full', !live && complete && 'opacity-90')}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
