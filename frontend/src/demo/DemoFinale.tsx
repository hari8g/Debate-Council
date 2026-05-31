import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Brain, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { advanceDemoStep, getDemoFinaleState, subscribeDemoCallout } from './demoRunner';

export function DemoFinale() {
  const [finale, setFinale] = useState(getDemoFinaleState);

  useEffect(() => {
    return subscribeDemoCallout(() => setFinale(getDemoFinaleState()));
  }, []);

  const isDebate = finale.kind === 'debate';

  return (
    <AnimatePresence>
      {finale.visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="demo-cinema-finale fixed inset-0 z-[55] flex items-center justify-center px-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="demo-cinema-finale-card max-w-lg rounded-3xl border border-[var(--color-border-subtle)] p-8 text-center shadow-[var(--shadow-soft)]"
          >
            <div
              className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                isDebate ? 'bg-[var(--color-chart-2)]/15 text-[var(--color-chart-2)]' : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
              }`}
            >
              {isDebate ? <Brain className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {isDebate ? 'Debate council complete' : 'Analysis complete'}
            </div>
            <h2 className="mb-2 text-3xl font-semibold tracking-tight text-[var(--color-text)]">
              {isDebate ? 'Persona synthesized' : 'Persona Dynamics Report'}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {isDebate
                ? 'Six agents · 30 cross-examinations · opinion revision · unified PersonaModel — the epistemic core of North Star.'
                : '72 posts · 6-agent debate council · OU + SIR + 10,000-path Monte Carlo · horizon narratives & strategic goals'}
            </p>
            {!isDebate && (
              <div className="mb-6 grid grid-cols-3 gap-2 text-left text-xs">
                {[
                  ['Stage 1', 'Signal matrix locked'],
                  ['Stage 2', 'Persona synthesized'],
                  ['Stage 3', 'Future state projected'],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-xl bg-[var(--color-bg-muted)]/80 px-3 py-2">
                    <p className="font-semibold text-[var(--color-text)]">{t}</p>
                    <p className="text-[var(--color-text-muted)]">{d}</p>
                  </div>
                ))}
              </div>
            )}
            {isDebate && (
              <div className="mb-6 grid grid-cols-2 gap-2 text-left text-xs sm:grid-cols-4">
                {[
                  ['Round 0', '6 hypotheses'],
                  ['Round 1', '30 challenges'],
                  ['Round 2', '6 revisions'],
                  ['Round 3', 'Synthesis → Persona'],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-xl bg-[var(--color-bg-muted)]/80 px-3 py-2">
                    <p className="font-semibold text-[var(--color-text)]">{t}</p>
                    <p className="text-[var(--color-text-muted)]">{d}</p>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => advanceDemoStep()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-dim)]"
            >
              {isDebate ? 'Explore Persona Model' : 'Open Full Report'}
              <ArrowRight className="h-4 w-4" />
            </button>
            {finale.autoAdvanceSec != null && (
              <p className="mt-3 text-[10px] text-[var(--color-text-muted)]">Auto-opens in {finale.autoAdvanceSec}s · click to skip</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
