import { InfoPopover } from './InfoPopover';

export function MetricHelp({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex align-middle">
      <InfoPopover title={title}>{children}</InfoPopover>
    </span>
  );
}

export function ConfidenceHelp() {
  return (
    <MetricHelp title="Confidence score">
      How strongly the model stands behind this claim after cross-examining evidence (0–100%). Blends
      measurable signal alignment with LLM assessment; drops when an agent revises under criticism.
    </MetricHelp>
  );
}
