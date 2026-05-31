import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { chartPolarGrid, chartTickSm } from '../../lib/chartTheme';
import type { AgentHypothesis } from '../../types/report';
import { AGENT_LABELS } from '../../types/report';
import { confidenceColor, formatConfidence, formatEvidence, parseConfidence } from '../../lib/utils';
import { Brain, Users, BookOpen, TrendingUp, Clock, Globe } from 'lucide-react';

const AGENT_ICONS: Record<string, React.ReactNode> = {
  psychographer: <Brain className="h-5 w-5" />,
  sociologist: <Users className="h-5 w-5" />,
  narrative_analyst: <BookOpen className="h-5 w-5" />,
  behavioural_economist: <TrendingUp className="h-5 w-5" />,
  temporal_analyst: <Clock className="h-5 w-5" />,
  cultural_analyst: <Globe className="h-5 w-5" />,
};

export function AgentCouncil({
  hypotheses,
  roundLabel = 'Agent Hypotheses',
}: {
  hypotheses: AgentHypothesis[];
  roundLabel?: string;
}) {
  return (
    <div>
      <h3 className="mb-1 text-xl">{roundLabel}</h3>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Confidence blends LLM assessment with measurable signal alignment — agents with stronger post-data support score higher.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hypotheses.map((hyp, i) => (
          <AgentCard key={hyp.agent} hypothesis={hyp} index={i} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ hypothesis, index }: { hypothesis: AgentHypothesis; index: number }) {
  const a = hypothesis.analysis;
  const confidence = parseConfidence(a.confidence, 0.5);
  const llmConf = parseConfidence(a.confidence_llm, confidence);
  const signalConf = parseConfidence(a.confidence_signal, confidence);
  const bigFive = a.big_five as Record<string, number> | undefined;

  const radarData = bigFive
    ? Object.entries(bigFive).map(([trait, value]) => ({
        trait: trait.charAt(0).toUpperCase() + trait.slice(1),
        value: Number(value),
      }))
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[var(--color-accent)]">{AGENT_ICONS[hypothesis.agent]}</span>
        <span className="font-medium">{AGENT_LABELS[hypothesis.agent] || hypothesis.agent}</span>
        <span className={`ml-auto rounded-full border px-2 py-0.5 text-xs ${confidenceColor(confidence)}`}>
          {formatConfidence(confidence)}
        </span>
      </div>

      {(a.confidence_llm != null || a.confidence_signal != null) && (
        <div className="mb-2 flex flex-wrap gap-2 text-[10px] text-[var(--color-text-muted)]">
          <span className="rounded bg-[var(--color-bg-elevated)] px-1.5 py-0.5">
            LLM: {formatConfidence(llmConf)}
          </span>
          <span className="rounded bg-[var(--color-bg-elevated)] px-1.5 py-0.5">
            Signal: {formatConfidence(signalConf)}
          </span>
        </div>
      )}

      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
        {(a.key_hypothesis || a.key_claim || a.revised_hypothesis || '') as string}
      </p>

      {radarData.length > 0 && hypothesis.agent === 'psychographer' && (
        <ResponsiveContainer width="100%" height={140}>
          <RadarChart data={radarData}>
            <PolarGrid stroke={chartPolarGrid} />
            <PolarAngleAxis dataKey="trait" tick={chartTickSm} />
            <Radar dataKey="value" stroke="#c9a962" fill="#c9a96244" />
          </RadarChart>
        </ResponsiveContainer>
      )}

      {Boolean(a.evidence) && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          <strong>Evidence:</strong> {formatEvidence(a.evidence).slice(0, 200)}
          {formatEvidence(a.evidence).length > 200 ? '...' : ''}
        </p>
      )}

      {Boolean(a.confidence_rationale) && (
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">{String(a.confidence_rationale)}</p>
      )}
    </motion.div>
  );
}
