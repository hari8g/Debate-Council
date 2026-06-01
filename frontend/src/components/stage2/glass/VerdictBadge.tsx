import type { ChallengeEvaluation } from '../../../types/report';
import { cn } from '../../../lib/utils';

const STYLES: Record<ChallengeEvaluation['verdict'], string> = {
  accept: 'bg-[var(--color-danger)]/12 text-[var(--color-danger)] border-[var(--color-danger)]/25',
  partial: 'bg-[var(--color-warning)]/12 text-[var(--color-warning)] border-[var(--color-warning)]/25',
  reject: 'bg-[var(--color-success)]/12 text-[var(--color-success)] border-[var(--color-success)]/25',
};

export function VerdictBadge({ verdict }: { verdict: ChallengeEvaluation['verdict'] }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        STYLES[verdict],
      )}
    >
      {verdict}
    </span>
  );
}
