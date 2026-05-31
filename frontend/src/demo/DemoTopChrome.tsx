import { useEffect, useState } from 'react';
import { DebateCouncilRail } from './DebateCouncilRail';
import { DemoNarrationBar } from './DemoNarrationBar';
import {
  getDebateRailState,
  getDemoNarrationState,
  subscribeDemoCallout,
} from './demoRunner';

/** In-flow demo panels below the app header — avoids fixed-position overlap. */
export function DemoTopChrome() {
  const [, bump] = useState(0);

  useEffect(() => {
    return subscribeDemoCallout(() => bump((n) => n + 1));
  }, []);

  const narration = getDemoNarrationState();
  const rail = getDebateRailState();
  const showNarration = narration.visible;
  const showRail = rail.active;

  if (!showNarration && !showRail) return null;

  return (
    <div className="demo-top-chrome shrink-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]/35 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        {showNarration && <DemoNarrationBar embedded />}
        {showRail && <DebateCouncilRail embedded />}
      </div>
    </div>
  );
}
