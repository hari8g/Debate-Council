import { InfoPopover } from '../shared/InfoPopover';

export function QualityScoreInfo() {
  return (
    <InfoPopover
      title="How it's calculated"
      ariaLabel="How is the quality score calculated?"
      iconSize="md"
      buttonClassName="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-accent)]/40 text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
    >
      <p className="mb-2">
        A 0–100% score of how completely we captured raw Instagram data for this profile.
        It is computed deterministically from capture metrics — not a model estimate.
      </p>
      <ul className="mb-2 list-inside list-disc space-y-0.5">
        <li>Post volume (up to 22%)</li>
        <li>Profile fields — bio, name, media count (up to 28%)</li>
        <li>Comments per enriched post (up to 18%)</li>
        <li>Liker samples per enriched post (up to 10%)</li>
        <li>Active stories &amp; highlights (up to 17%)</li>
        <li>Posts with view counts (up to 15%)</li>
      </ul>
      <p>
        <strong className="font-medium text-[var(--color-text)]">Significance:</strong> higher
        scores mean richer evidence for persona analysis. Scores below ~60% often reflect rate
        limits, hidden engagement, or accounts with limited public data.
      </p>
    </InfoPopover>
  );
}
