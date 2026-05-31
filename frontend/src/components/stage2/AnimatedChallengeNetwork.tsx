import { useEffect, useMemo, useState } from 'react';
import type { Challenge } from '../../types/report';
import { AGENT_LABELS } from '../../types/report';
import type { AgentConfidencePoint } from '../../lib/debateUtils';
import { ROUND_CHART_COLORS } from '../../lib/chartTheme';

type ActiveRound = 'round1' | 'round2' | 'round3';

const ROUND_COLORS = ROUND_CHART_COLORS;

const NODE_POS: Record<string, { x: number; y: number }> = {
  psychographer: { x: 50, y: 12 },
  sociologist: { x: 85, y: 32 },
  narrative_analyst: { x: 85, y: 68 },
  behavioural_economist: { x: 50, y: 88 },
  temporal_analyst: { x: 15, y: 68 },
  cultural_analyst: { x: 15, y: 32 },
};

const AGENT_RING = [
  'psychographer',
  'sociologist',
  'narrative_analyst',
  'behavioural_economist',
  'temporal_analyst',
  'cultural_analyst',
];

function edgeKey(ch: Challenge) {
  return `${ch.challenger}→${ch.target}`;
}

function ChallengeEdge({
  from,
  to,
  color,
  opacity,
  width,
  animate,
  delayMs,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  opacity: number;
  width: number;
  animate: boolean;
  delayMs: number;
}) {
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      pathLength={100}
      stroke={color}
      strokeWidth={width}
      strokeOpacity={opacity}
      className={animate ? 'debate-edge-enter' : 'debate-edge-settled'}
      style={animate ? { animationDelay: `${delayMs}ms` } : undefined}
    />
  );
}

export function AnimatedChallengeNetwork({
  round1Edges,
  round2Edges,
  activeRound,
  evolution,
  selectedAgent,
  onSelectAgent,
  hasSynthesis,
}: {
  round1Edges: Challenge[];
  round2Edges: Challenge[];
  activeRound: ActiveRound;
  evolution: AgentConfidencePoint[];
  selectedAgent: string | null;
  onSelectAgent: (agent: string | null) => void;
  hasSynthesis: boolean;
}) {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [activeRound]);

  const uniqueR1 = useMemo(() => {
    const seen = new Set<string>();
    return round1Edges.filter((ch) => {
      const k = edgeKey(ch);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [round1Edges]);

  const uniqueR2 = useMemo(() => {
    const seen = new Set<string>();
    return round2Edges.filter((ch) => {
      const k = edgeKey(ch);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [round2Edges]);

  const synthesisRing = useMemo(() => {
    if (!hasSynthesis) return [];
    const pts = AGENT_RING.map((a) => NODE_POS[a]).filter(Boolean);
    return pts.map((from, i) => ({
      from,
      to: pts[(i + 1) % pts.length],
    }));
  }, [hasSynthesis]);

  const showR1 = activeRound === 'round1' || activeRound === 'round2' || activeRound === 'round3';
  const showR2 = activeRound === 'round2' || activeRound === 'round3';
  const showRing = activeRound === 'round3' && hasSynthesis;

  const r1Opacity = activeRound === 'round1' ? 0.75 : activeRound === 'round2' ? 0.35 : 0.2;
  const r2Opacity = activeRound === 'round2' ? 0.85 : activeRound === 'round3' ? 0.35 : 0;

  return (
    <div className="relative">
      <p className="mb-1 text-xs text-[var(--color-text-muted)]">
        Agent challenge network
        <span className="ml-2 text-[10px]">
          {activeRound === 'round1' && '— cross-examination arrows'}
          {activeRound === 'round2' && '— defense phase (R1 context faded)'}
          {activeRound === 'round3' && '— synthesis consensus ring + debate history'}
        </span>
      </p>
      <svg viewBox="0 0 100 100" className="h-[200px] w-full rounded bg-[var(--color-bg-elevated)]">
        <g key={`edges-${animKey}`}>
          {showR1 &&
            uniqueR1.map((ch, i) => {
              const from = NODE_POS[ch.challenger];
              const to = NODE_POS[ch.target];
              if (!from || !to) return null;
              const highlight = selectedAgent === ch.challenger || selectedAgent === ch.target;
              return (
                <ChallengeEdge
                  key={`r1-${edgeKey(ch)}`}
                  from={from}
                  to={to}
                  color={highlight ? ROUND_COLORS.round1 : 'var(--color-chart-1)'}
                  opacity={highlight ? Math.min(1, r1Opacity + 0.25) : r1Opacity}
                  width={highlight ? 0.95 : 0.45}
                  animate={activeRound === 'round1'}
                  delayMs={i * 25}
                />
              );
            })}

          {showR2 &&
            uniqueR2.map((ch, i) => {
              const from = NODE_POS[ch.challenger];
              const to = NODE_POS[ch.target];
              if (!from || !to) return null;
              const highlight = selectedAgent === ch.challenger || selectedAgent === ch.target;
              return (
                <ChallengeEdge
                  key={`r2-${edgeKey(ch)}`}
                  from={from}
                  to={to}
                  color={highlight ? ROUND_COLORS.round2 : 'var(--color-chart-2)'}
                  opacity={highlight ? Math.min(1, r2Opacity + 0.25) : r2Opacity}
                  width={highlight ? 1.05 : 0.55}
                  animate={activeRound === 'round2'}
                  delayMs={i * 30}
                />
              );
            })}

          {showRing &&
            synthesisRing.map(({ from, to }, i) => (
              <ChallengeEdge
                key={`ring-${i}`}
                from={from}
                to={to}
                color={ROUND_COLORS.round3}
                opacity={0.55}
                width={0.65}
                animate
                delayMs={i * 80}
              />
            ))}
        </g>

        {showRing && (
          <circle
            cx={50}
            cy={50}
            r={4}
            fill="#5a7a9e"
            fillOpacity={0.15}
            stroke="#5a7a9e"
            strokeWidth={0.4}
            className="debate-hub-pulse"
          />
        )}

        {Object.entries(NODE_POS).map(([agent, pos]) => {
          const ev = evolution.find((e) => e.agent === agent);
          const conf =
            activeRound === 'round1'
              ? ev?.round1
              : activeRound === 'round2'
                ? ev?.round2 ?? ev?.round1
                : ev?.round3 ?? ev?.round2 ?? ev?.round1;
          const active = selectedAgent === agent;
          const nodeColor =
            activeRound === 'round1'
              ? ROUND_COLORS.round1
              : activeRound === 'round2'
                ? ROUND_COLORS.round2
                : ROUND_COLORS.round3;

          return (
            <g key={agent} onClick={() => onSelectAgent(active ? null : agent)} style={{ cursor: 'pointer' }}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={active ? 7.5 : 5.5}
                fill={active ? nodeColor : '#ffffff'}
                stroke={active ? nodeColor : '#b8b0a8'}
                strokeWidth={active ? 1.2 : 0.8}
                className={active ? 'debate-node-active' : undefined}
              />
              <text
                x={pos.x}
                y={pos.y + 0.5}
                textAnchor="middle"
                fontSize="3.2"
                fill={active ? '#ffffff' : nodeColor}
              >
                {conf != null ? `${Math.round(conf * 100)}` : '?'}
              </text>
              <text
                x={pos.x}
                y={pos.y + (pos.y > 50 ? 11 : -8)}
                textAnchor="middle"
                fontSize="2.8"
                fill="#7a736c"
              >
                {(AGENT_LABELS[agent] || agent).split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-[var(--color-chart-1)]" /> Round 1 challenges
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-[var(--color-chart-2)]" /> Round 2 defenses
        </span>
        {hasSynthesis && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 bg-[#5a7a9e]" /> Round 3 consensus
          </span>
        )}
      </div>
    </div>
  );
}
