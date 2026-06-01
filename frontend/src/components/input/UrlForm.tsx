import { motion } from 'framer-motion';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAnalysisStream } from '../../hooks/useAnalysisStream';
import { parseInstagramUrl } from '../../lib/utils';

const COLLECTION_OPTIONS = [
  { id: 'all' as const, label: 'All posts', shortLabel: 'All', hint: 'Full archive — every post we can reach' },
  { id: 90 as const, label: '90 days', shortLabel: '90d', hint: 'Recent voice and current themes' },
  { id: 360 as const, label: '360 days', shortLabel: '360d', hint: 'Seasonal rhythm and annual arc' },
  { id: 730 as const, label: '730 days', shortLabel: '730d', hint: 'Longer narrative evolution' },
];

type WindowChoice = (typeof COLLECTION_OPTIONS)[number]['id'];

export function UrlForm() {
  const [url, setUrl] = useState('');
  const [windowChoice, setWindowChoice] = useState<WindowChoice>('all');
  const [error, setError] = useState('');
  const { analyze } = useAnalysisStream();

  const selectedHint = useMemo(
    () => COLLECTION_OPTIONS.find((o) => o.id === windowChoice)?.hint ?? '',
    [windowChoice],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parseInstagramUrl(url)) {
      setError('Enter a valid Instagram profile URL or username');
      return;
    }
    setError('');
    try {
      const fetchAll = windowChoice === 'all';
      const lookback = fetchAll ? 365 : windowChoice;
      await analyze(url, lookback, fetchAll);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl text-center"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-4 py-1.5 text-sm text-[var(--color-accent)]">
        <Sparkles className="h-4 w-4" />
        Narrative intelligence from public profiles
      </div>

      <h1 className="hero-headline mb-4 text-5xl text-[var(--color-text)] md:text-6xl">
        North Star
      </h1>
      <p className="mb-10 text-lg leading-relaxed text-[var(--color-text-muted)]">
        A thoughtful reading of how someone presents themselves online — their themes, tensions, and
        likely trajectories — built transparently from public posts and streamed as the analysis unfolds.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        <div>
          <label htmlFor="profile-url" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
            Instagram profile
          </label>
          <input
            id="profile-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="instagram.com/username"
            className="w-full rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-4 py-3.5 text-[var(--color-text)] shadow-[var(--shadow-soft)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)]/12"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">Post collection</label>
          <div
            className="rounded-2xl bg-[var(--color-bg-muted)] p-1"
            role="radiogroup"
            aria-label="Post collection window"
          >
            <div className="grid grid-cols-4 gap-1">
              {COLLECTION_OPTIONS.map((opt) => {
                const selected = windowChoice === opt.id;
                return (
                  <button
                    key={String(opt.id)}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setWindowChoice(opt.id)}
                    className={`relative rounded-xl px-2 py-2.5 text-center transition-all duration-200 sm:px-3 sm:py-3 ${
                      selected
                        ? 'bg-[var(--color-bg)] text-[var(--color-text)] shadow-[var(--shadow-soft)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    <span className="block text-sm font-medium sm:hidden">{opt.shortLabel}</span>
                    <span className="hidden text-sm font-medium sm:block">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-2 min-h-[1.25rem] text-center text-xs text-[var(--color-text-muted)] sm:text-left">
            {selectedHint}
          </p>
        </div>

        {error && <p className="text-center text-sm text-[var(--color-danger)]">{error}</p>}

        <div className="pt-1">
          <button
            type="submit"
            className="w-full rounded-2xl bg-[var(--color-accent)] py-3.5 text-[15px] font-medium tracking-[-0.01em] text-[var(--color-on-accent)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-accent-dim)] active:scale-[0.995]"
          >
            Begin analysis
          </button>
        </div>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm">
        <a href="?demo=1" className="text-[var(--color-accent)] underline-offset-2 hover:underline">
          Detailed walkthrough demo
        </a>
        <a href="?demo=debate" className="text-[var(--color-accent)] underline-offset-2 hover:underline">
          Debate council demo (Stage 2)
        </a>
        <span className="text-xs text-[var(--color-text-muted)]">No API key or backend required</span>
      </div>

      <div className="mt-10 flex items-start gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]/60 p-4 text-left text-sm text-[var(--color-text-muted)]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
        <div>
          <strong className="text-[var(--color-text)]">A note on use:</strong> Public profiles only.
          This is interpretive insight, not clinical diagnosis. Uncertainty is surfaced explicitly —
          download the interactive report to explore evidence behind each claim.
        </div>
      </div>
    </motion.div>
  );
}
