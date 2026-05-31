import { useEffect, useRef, useState } from 'react';
import type { PhasePortrait, PhasePortraitSlice } from '../../types/report';

export function PhasePortraitCanvas({ portrait }: { portrait: PhasePortrait }) {
  const slices = portrait.slices?.length ? portrait.slices : [portraitAsSlice(portrait)];
  const [activeIdx, setActiveIdx] = useState(0);
  const active = slices[activeIdx];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {slices.map((s, i) => (
          <button
            key={`${s.dim1}-${s.dim2}`}
            type="button"
            onClick={() => setActiveIdx(i)}
            className={`rounded-full px-3 py-1 text-xs ${
              i === activeIdx
                ? 'bg-[var(--color-accent)] text-white'
                : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            {s.dim1_label} × {s.dim2_label}
          </button>
        ))}
      </div>
      <SliceCanvas slice={active} />
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        Equilibrium: ({active.equilibrium_v.toFixed(2)}, {active.equilibrium_a.toFixed(2)}) · α_v:{' '}
        {active.mean_reversion_rate_v.toFixed(3)} · half-life v:{' '}
        {formatHalfLife(active.half_life_v_days)} · fixed point: {active.fixed_point_type ?? portrait.fixed_point_type ?? 'stable_node'}
        {portrait.cyclicality_detected && (
          <span className="ml-2 text-[var(--color-warning)]">· cyclical mood pattern detected</span>
        )}
      </p>
    </div>
  );
}

function formatHalfLife(days?: number) {
  if (days == null || !Number.isFinite(days)) return '—';
  return `${days.toFixed(0)}d`;
}

function portraitAsSlice(portrait: PhasePortrait): PhasePortraitSlice {
  return {
    dim1: 0,
    dim2: 1,
    dim1_label: 'Valence',
    dim2_label: 'Arousal',
    v_grid: portrait.v_grid,
    a_grid: portrait.a_grid,
    dv: portrait.dv,
    da: portrait.da,
    equilibrium_v: portrait.equilibrium_v,
    equilibrium_a: portrait.equilibrium_a,
    mean_reversion_rate_v: portrait.mean_reversion_rate_v,
    mean_reversion_rate_a: portrait.mean_reversion_rate_a,
    historical_trajectory: portrait.historical_trajectory,
    fixed_point_type: portrait.fixed_point_type,
  };
}

function SliceCanvas({ slice }: { slice: PhasePortraitSlice }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#f5f5f7';
    ctx.fillRect(0, 0, w, h);

    const rows = slice.dv.length;
    const cols = slice.dv[0]?.length || 0;
    if (!rows || !cols) return;

    const maxMag = Math.max(
      ...slice.dv.flat().map((v, i) => Math.hypot(v, slice.da.flat()[i] || 0)),
      0.01,
    );

    const cellW = w / cols;
    const cellH = h / rows;
    const vMin = slice.dim1 === 0 ? -1 : 0;
    const vMax = slice.dim1 === 0 ? 1 : 1;
    const aMin = slice.dim2 === 0 ? -1 : 0;
    const aMax = slice.dim2 === 0 ? 1 : 1;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const dvx = slice.dv[i][j];
        const dvy = slice.da[i][j];
        const mag = Math.hypot(dvx, dvy) / maxMag;
        const angle = Math.atan2(dvy, dvx);
        const cx = j * cellW + cellW / 2;
        const cy = i * cellH + cellH / 2;
        const len = Math.min(cellW, cellH) * 0.35 * mag;

        ctx.strokeStyle = `rgba(0, 113, 227, ${0.35 + mag * 0.45})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
        ctx.stroke();
      }
    }

    const eqX = ((slice.equilibrium_v - vMin) / (vMax - vMin)) * w;
    const eqY = (1 - (slice.equilibrium_a - aMin) / (aMax - aMin)) * h;
    ctx.fillStyle = '#0071e3';
    ctx.beginPath();
    ctx.arc(eqX, eqY, 5, 0, Math.PI * 2);
    ctx.fill();

    if (slice.historical_trajectory.length > 1) {
      ctx.strokeStyle = '#34c759';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      slice.historical_trajectory.forEach(([v, a], idx) => {
        const x = ((v - vMin) / (vMax - vMin)) * w;
        const y = (1 - (a - aMin) / (aMax - aMin)) * h;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [slice]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      className="w-full max-w-lg rounded-lg border border-[var(--color-border)]"
    />
  );
}
