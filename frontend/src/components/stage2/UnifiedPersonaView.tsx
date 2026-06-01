import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';
import type { PersonaModel, PersonaSection, PsychologicalState } from '../../types/report';
import { confidenceColor, formatConfidence, cn } from '../../lib/utils';
import { chartPolarGrid, chartTickSm } from '../../lib/chartTheme';
import { GlassPanel } from './glass/GlassPanel';
import { ConfidenceHelp } from '../shared/MetricHelp';

const SECTIONS: { key: keyof PersonaModel; title: string; short: string }[] = [
  { key: 'core_identity', title: 'Core Identity', short: 'Identity' },
  { key: 'psychological_profile', title: 'Psychological Profile', short: 'Psychology' },
  { key: 'social_strategy', title: 'Social Strategy', short: 'Social' },
  { key: 'narrative_self_model', title: 'Narrative Self-Model', short: 'Narrative' },
  { key: 'revealed_preferences', title: 'Revealed Preferences', short: 'Preferences' },
  { key: 'cultural_identity', title: 'Cultural Identity', short: 'Culture' },
  { key: 'temporal_state', title: 'Temporal State', short: 'Temporal' },
  { key: 'genuine_uncertainties', title: 'Genuine Uncertainties', short: 'Uncertainties' },
];

const STATE_LABELS: { key: keyof PsychologicalState; label: string }[] = [
  { key: 'valence', label: 'Valence' },
  { key: 'arousal', label: 'Arousal' },
  { key: 'stability', label: 'Stability' },
  { key: 'connectivity', label: 'Connectivity' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'ideological', label: 'Ideological' },
];

export function UnifiedPersonaView({ persona }: { persona: PersonaModel }) {
  const [activeSection, setActiveSection] = useState<keyof PersonaModel>('core_identity');
  const [expandedClaim, setExpandedClaim] = useState<number | null>(0);

  const section = persona[activeSection] as PersonaSection | undefined;
  const avgBySection = useMemo(() => {
    return SECTIONS.map(({ key, title, short }) => {
      const s = persona[key] as PersonaSection | undefined;
      const claims = s?.claims ?? [];
      const avg =
        claims.length > 0
          ? claims.reduce((a, c) => a + c.confidence, 0) / claims.length
          : 0.55;
      return { key, title, short, avg, count: claims.length };
    });
  }, [persona]);

  const stateRadar = useMemo(() => {
    const st = persona.current_state;
    if (!st) return [];
    return STATE_LABELS.map(({ key, label }) => ({
      dim: label,
      value: Math.max(0, Math.min(1, (Number(st[key]) + 1) / 2)),
    }));
  }, [persona.current_state]);

  const bigFiveData = useMemo(() => {
    const b5 = persona.big_five;
    if (!b5) return [];
    return Object.entries(b5).map(([trait, value]) => ({
      trait: trait.charAt(0).toUpperCase() + trait.slice(1),
      value: Number(value),
    }));
  }, [persona.big_five]);

  return (
    <div className="debate-stage-root space-y-4">
      <GlassPanel strong className="overflow-hidden">
        <div className="p-6 sm:p-8">
          <p className="section-eyebrow-accent">Unified output</p>
          <h2 className="mt-1 text-2xl sm:text-3xl">Persona model</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--color-text-muted)]">
            {persona.summary}
          </p>
          {persona.key_insight && (
            <div className="mt-5 flex gap-3 rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/6 p-4">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">Key insight</p>
                <p className="mt-1 text-sm leading-relaxed">{persona.key_insight}</p>
              </div>
            </div>
          )}
        </div>
      </GlassPanel>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,26%)] xl:grid-cols-[minmax(0,1fr)_280px]">
        <GlassPanel className="min-h-[420px] min-w-0">
          <div className="border-b border-white/40 px-2 py-2">
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
              {avgBySection.map(({ key, short, avg, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveSection(key);
                    setExpandedClaim(0);
                  }}
                  className={cn(
                    'shrink-0 rounded-lg border px-3 py-2 text-left transition-all',
                    activeSection === key
                      ? 'persona-section-active border'
                      : 'border-transparent hover:bg-white/50',
                  )}
                >
                  <span className="block text-xs font-medium">{short}</span>
                  <span className="mt-0.5 block text-[10px] tabular-nums text-[var(--color-text-muted)]">
                    {formatConfidence(avg)} · {count} claims
                  </span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="p-5 sm:p-6"
            >
              <h3 className="text-lg font-semibold">
                {SECTIONS.find((s) => s.key === activeSection)?.title}
              </h3>
              {section?.summary && (
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{section.summary}</p>
              )}
              <div className="mt-4 space-y-2">
                {section?.claims?.map((claim, i) => {
                  const open = expandedClaim === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setExpandedClaim(open ? null : i)}
                      className={cn(
                        'w-full rounded-xl border text-left transition-all',
                        open
                          ? 'border-[var(--color-accent)]/35 bg-white/70 shadow-sm'
                          : 'border-white/50 bg-white/40 hover:bg-white/60',
                      )}
                    >
                      <div className="flex items-start gap-3 p-4">
                        <p className="flex-1 text-sm leading-relaxed">{claim.claim}</p>
                        <span
                          className={cn(
                            'flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs',
                            confidenceColor(claim.confidence),
                          )}
                        >
                          {formatConfidence(claim.confidence)}
                          <ConfidenceHelp />
                        </span>
                        {claim.speculative && (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                        )}
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform',
                            open && 'rotate-90',
                          )}
                        />
                      </div>
                      <AnimatePresence>
                        {open && claim.evidence && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-white/50 px-4 pb-4"
                          >
                            <p className="pt-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
                              <span className="font-medium text-[var(--color-text)]">Evidence · </span>
                              {claim.evidence}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </GlassPanel>

        <div className="space-y-4">
          {stateRadar.length >= 4 && (
            <GlassPanel>
              <div className="p-4">
                <p className="mb-2 text-sm font-medium">Current psychological state</p>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={stateRadar} cx="50%" cy="50%" outerRadius="68%">
                    <PolarGrid stroke={chartPolarGrid} />
                    <PolarAngleAxis dataKey="dim" tick={chartTickSm} />
                    <Radar
                      dataKey="value"
                      stroke="var(--color-chart-1)"
                      fill="rgba(0, 113, 227, 0.2)"
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>
          )}

          {bigFiveData.length > 0 && (
            <GlassPanel>
              <div className="p-4">
                <p className="mb-3 text-sm font-medium">Big Five profile</p>
                <div className="space-y-2.5">
                  {bigFiveData.map(({ trait, value }) => (
                    <div key={trait}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-[var(--color-text-muted)]">{trait}</span>
                        <span className="tabular-nums font-medium">{value.toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]/50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--color-chart-1)] to-[var(--color-chart-2)]"
                          style={{ width: `${Math.min(100, (value / 10) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassPanel>
          )}

          <GlassPanel>
            <div className="p-4">
              <p className="mb-3 text-sm font-medium">Section confidence</p>
              <div className="space-y-2">
                {avgBySection.map(({ short, avg, key }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveSection(key)}
                    className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-white/50"
                  >
                    <span className="w-16 shrink-0 text-[10px] text-[var(--color-text-muted)]">{short}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]/40">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)]/70"
                        style={{ width: `${avg * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[10px] tabular-nums">{Math.round(avg * 100)}</span>
                  </button>
                ))}
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
