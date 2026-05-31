import type { AgentHypothesis } from '../../types/report';
import { AGENT_LABELS } from '../../types/report';
import { AgentCouncil } from './AgentCouncil';
import { ConfidenceHelp } from '../shared/MetricHelp';
import { formatConfidence, parseConfidence } from '../../lib/utils';
import { Brain, BookOpen, Users, TrendingUp, Clock, Globe } from 'lucide-react';

const AGENTS = [
  {
    id: 'psychographer',
    icon: Brain,
    lens: 'Big Five, attachment style, identity status',
    role: 'Maps inner drives and emotional patterns visible in self-presentation.',
  },
  {
    id: 'sociologist',
    icon: Users,
    lens: 'Bourdieu, Goffman, social capital',
    role: 'Reads status signalling, audience management, and network positioning.',
  },
  {
    id: 'narrative_analyst',
    icon: BookOpen,
    lens: 'McAdams narrative identity, frame analysis',
    role: 'Extracts the story they tell about who they are and where they are going.',
  },
  {
    id: 'behavioural_economist',
    icon: TrendingUp,
    lens: 'Revealed preferences, incentive structures',
    role: 'Infers priorities from what they consistently invest time and engagement in.',
  },
  {
    id: 'temporal_analyst',
    icon: Clock,
    lens: 'Change points, trajectories, regime shifts',
    role: 'Detects inflection points and whether the profile is stable, accelerating, or pivoting.',
  },
  {
    id: 'cultural_analyst',
    icon: Globe,
    lens: 'Digital semiotics, subcultural affiliation',
    role: 'Places them in cultural conversations, aesthetics, and community codes.',
  },
];

export function AgentCouncilIntroPanel({ hypotheses }: { hypotheses: AgentHypothesis[] }) {
  const complete = hypotheses.length;
  const isRunning = complete > 0 && complete < 6;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-5 shadow-[var(--shadow-soft)]">
        <p className="section-eyebrow-accent">{isRunning ? 'In progress' : complete === 6 ? 'Complete' : 'Starting'}</p>
        <h2 className="mt-1 text-2xl">The Debate Council — six lenses, one profile</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          No single theory explains a person. We organise six specialists who read the same signal matrix
          through different disciplines, then cross-examine each other. Disagreement is the point — it
          surfaces blind spots before anything is unified in Round 3.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <FlowStep n={1} title="Parallel hypotheses" desc="Each agent forms an independent reading" />
          <FlowStep n={2} title="Cross-examination" desc="30 directed challenges in Round 1" />
          <FlowStep n={3} title="Revision & synthesis" desc="Defenses refine claims; council merges" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {AGENTS.map(({ id, icon: Icon, lens, role }) => {
          const hyp = hypotheses.find((h) => h.agent === id);
          const conf = hyp ? parseConfidence(hyp.analysis?.confidence, 0.5) : null;
          return (
            <div
              key={id}
              className={`rounded-xl border p-4 transition ${
                hyp
                  ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--color-accent)]" />
                  <span className="font-medium">{AGENT_LABELS[id] || id}</span>
                </div>
                {conf != null && (
                  <span className="flex items-center text-xs text-[var(--color-accent)]">
                    {formatConfidence(conf)}
                    <ConfidenceHelp />
                  </span>
                )}
              </div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{lens}</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{role}</p>
              {hyp?.analysis?.key_claim && (
                <p className="mt-3 rounded-lg bg-[var(--color-bg-muted)] px-3 py-2 text-xs leading-relaxed">
                  {String(hyp.analysis.key_claim).slice(0, 200)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {hypotheses.length > 0 && (
        <AgentCouncil hypotheses={hypotheses} roundLabel="Live hypothesis cards" />
      )}
    </div>
  );
}

function FlowStep({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-2">
      <span className="text-[10px] font-medium text-[var(--color-accent)]">Step {n}</span>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{desc}</p>
    </div>
  );
}
