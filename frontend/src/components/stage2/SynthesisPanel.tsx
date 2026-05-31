import { AlertTriangle } from 'lucide-react';
import type { PersonaModel, PersonaSection } from '../../types/report';
import { confidenceColor, formatConfidence } from '../../lib/utils';
import { ConfidenceHelp } from '../shared/MetricHelp';

const SECTIONS: { key: keyof PersonaModel; title: string }[] = [
  { key: 'core_identity', title: 'Core Identity' },
  { key: 'psychological_profile', title: 'Psychological Profile' },
  { key: 'social_strategy', title: 'Social Strategy' },
  { key: 'narrative_self_model', title: 'Narrative Self-Model' },
  { key: 'revealed_preferences', title: 'Revealed Preferences' },
  { key: 'cultural_identity', title: 'Cultural Identity' },
  { key: 'temporal_state', title: 'Temporal State' },
  { key: 'genuine_uncertainties', title: 'Genuine Uncertainties' },
];

export function SynthesisPanel({ persona }: { persona: PersonaModel }) {
  return (
    <div>
      <h3 className="mb-2 text-xl">Synthesis — Unified Persona Model</h3>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">{persona.summary}</p>

      {persona.key_insight && (
        <div className="mb-6 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-4">
          <h4 className="mb-1 text-sm font-medium text-[var(--color-accent)]">Key Insight</h4>
          <p className="text-sm">{persona.key_insight}</p>
        </div>
      )}

      <div className="space-y-2">
        {SECTIONS.map(({ key, title }) => {
          const section = persona[key] as PersonaSection;
          if (!section) return null;
          return <SectionAccordion key={key} title={title} section={section} />;
        })}
      </div>
    </div>
  );
}

function SectionAccordion({ title, section }: { title: string; section: PersonaSection }) {
  return (
    <details className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
      <summary className="cursor-pointer px-4 py-3 font-medium hover:bg-[var(--color-bg-elevated)]">
        {title}
      </summary>
      <div className="border-t border-[var(--color-border)] px-4 py-3">
        {section.summary && <p className="mb-3 text-sm text-[var(--color-text-muted)]">{section.summary}</p>}
        <div className="space-y-2">
          {section.claims?.map((claim, i) => (
            <div key={i} className="rounded-md bg-[var(--color-bg-elevated)] p-3 text-sm">
              <div className="flex items-start gap-2">
                <p className="flex-1">{claim.claim}</p>
                <span className={`flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs ${confidenceColor(claim.confidence)}`}>
                  {formatConfidence(claim.confidence)}
                  <ConfidenceHelp />
                </span>
                {claim.speculative && <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />}
              </div>
              {claim.evidence && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Evidence: {claim.evidence}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
