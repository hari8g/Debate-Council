import { motion } from 'framer-motion';
import type { AgentHypothesis } from '../../types/report';
import { AGENT_LABELS } from '../../types/report';
import { confidenceColor, formatConfidence, formatEvidence, parseConfidence, cn } from '../../lib/utils';
import { Brain, Users, BookOpen, TrendingUp, Clock, Globe } from 'lucide-react';

const AGENT_ICONS: Record<string, React.ReactNode> = {
  psychographer: <Brain className="h-4 w-4" />,
  sociologist: <Users className="h-4 w-4" />,
  narrative_analyst: <BookOpen className="h-4 w-4" />,
  behavioural_economist: <TrendingUp className="h-4 w-4" />,
  temporal_analyst: <Clock className="h-4 w-4" />,
  cultural_analyst: <Globe className="h-4 w-4" />,
};

export function AgentCouncil({
  hypotheses,
  roundLabel = 'Agent hypotheses',
  compact,
}: {
  hypotheses: AgentHypothesis[];
  roundLabel?: string;
  compact?: boolean;
}) {
  return (
    <div>
      <h3 className={cn('font-semibold', compact ? 'text-base' : 'text-xl')}>{roundLabel}</h3>
      {!compact && (
        <p className="mt-1 mb-4 text-sm text-[var(--color-text-muted)]">
          Confidence blends model assessment with signal alignment from the profile matrix.
        </p>
      )}
      <div className={cn('grid gap-3', compact ? 'md:grid-cols-2 xl:grid-cols-3' : 'gap-4 md:grid-cols-2 xl:grid-cols-3')}>
        {hypotheses.map((hyp, i) => (
          <AgentCard key={hyp.agent} hypothesis={hyp} index={i} compact={compact} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({
  hypothesis,
  index,
  compact,
}: {
  hypothesis: AgentHypothesis;
  index: number;
  compact?: boolean;
}) {
  const a = hypothesis.analysis;
  const confidence = parseConfidence(a.confidence, 0.5);
  const claim = String(a.key_hypothesis || a.key_claim || a.revised_hypothesis || '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn(
        'rounded-xl border border-white/55 bg-white/45 p-3.5 backdrop-blur-sm',
        compact && 'p-3',
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[var(--color-accent)]">{AGENT_ICONS[hypothesis.agent]}</span>
        <span className="text-sm font-medium">{AGENT_LABELS[hypothesis.agent] || hypothesis.agent}</span>
        <span className={cn('ml-auto rounded-full border px-2 py-0.5 text-xs', confidenceColor(confidence))}>
          {formatConfidence(confidence)}
        </span>
      </div>
      <p className={cn('leading-relaxed text-[var(--color-text-muted)]', compact ? 'text-xs line-clamp-4' : 'text-sm')}>
        {claim}
      </p>
      {!compact && Boolean(a.evidence) && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)] line-clamp-2">
          {formatEvidence(a.evidence)}
        </p>
      )}
    </motion.div>
  );
}
