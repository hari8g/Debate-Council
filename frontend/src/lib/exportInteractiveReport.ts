import { buildConfidenceEvolution } from './debateUtils';
import type {
  AgentHypothesis,
  Challenge,
  DerivedSignals,
  FutureStateDistribution,
  FutureStateNarrative,
  OuParameters,
  PersonaDynamicsReport,
  PersonaModel,
  PersonalR0Estimate,
  ProfileSignalMatrix,
  RevisedHypothesis,
  SignalSummary,
} from '../types/report';
import { AGENT_LABELS } from '../types/report';

export interface InteractiveReportPayload {
  report: PersonaDynamicsReport;
  derivedSignals?: DerivedSignals;
  signalSummary?: SignalSummary;
  signalMatrix?: ProfileSignalMatrix;
  agentHypotheses: AgentHypothesis[];
  challenges: Challenge[];
  revisedHypotheses: RevisedHypothesis[];
  personaModel?: PersonaModel;
  ouParams?: OuParameters;
  beliefStrains: PersonalR0Estimate[];
  futureState?: FutureStateDistribution;
  futureNarrative?: FutureStateNarrative;
}

export function downloadInteractiveReport(payload: InteractiveReportPayload): void {
  const html = buildInteractiveReportHtml(payload);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `northstar-report-${payload.report.username}-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function buildInteractiveReportHtml(payload: InteractiveReportPayload): string {
  const { report, personaModel, beliefStrains, futureState, futureNarrative } = payload;
  const username = report.username;
  const confidenceEvolution = buildConfidenceEvolution(
    payload.agentHypotheses,
    payload.revisedHypotheses,
    personaModel,
  );

  const engagementData =
    payload.signalMatrix?.engagement_rates.map((r, i) => ({ i: i + 1, rate: r })) ?? [];
  const strainCharts = beliefStrains.map((s) => ({
    id: s.strain_type,
    label: s.label || s.strain_type,
    data: (s.activation_history || []).map((v, i) => ({ i: i + 1, v })),
  }));
  const mcPathData = (futureState?.simulation_audit?.sample_valence_paths ?? []).map((p) => ({
    sim_index: p.sim_index,
    values: p.valence_every_30d,
  }));
  const scenarios = futureState?.scenario_paths ?? [];

  const personaSections = personaModel
    ? [
        'core_identity',
        'psychological_profile',
        'social_strategy',
        'narrative_self_model',
        'revealed_preferences',
        'cultural_identity',
        'temporal_state',
      ].map((key) => {
        const section = personaModel[key as keyof PersonaModel];
        if (!section || typeof section !== 'object' || !('summary' in section)) return null;
        return { key, title: key.replace(/_/g, ' '), section };
      }).filter(Boolean)
    : [];

  const embedded = JSON.stringify({
    engagementData,
    strainCharts,
    mcPathData,
    confidenceEvolution,
    debateRounds: ['Round 1', 'Round 2', 'Round 3'],
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>North Star — @${esc(username)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"><\/script>
  <style>
    :root {
      --bg: #ffffff; --card: #ffffff; --muted: #f5f5f7; --border: #d2d2d7;
      --text: #1d1d1f; --sub: #86868b; --accent: #0071e3; --success: #34c759; --danger: #ff3b30;
    }
    * { box-sizing: border-box; margin: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
    h1,h2,h3 { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.022em; }
    .layout { display: flex; min-height: 100vh; }
    nav { width: 220px; background: var(--card); border-right: 1px solid var(--border); padding: 1.5rem 0; position: sticky; top: 0; height: 100vh; }
    nav .brand { padding: 0 1.25rem 1.5rem; border-bottom: 1px solid var(--border); margin-bottom: 1rem; }
    nav .brand h1 { font-size: 1.1rem; }
    nav .brand p { font-size: 0.75rem; color: var(--sub); margin-top: 0.25rem; }
    nav button { display: block; width: 100%; text-align: left; padding: 0.6rem 1.25rem; border: none; background: none; color: var(--sub); cursor: pointer; font-size: 0.875rem; transition: all 0.2s; }
    nav button:hover { background: var(--muted); color: var(--text); }
    nav button.active { background: rgba(139,115,85,0.1); color: var(--accent); border-right: 2px solid var(--accent); }
    main { flex: 1; padding: 2rem 2.5rem; max-width: 960px; }
    .panel { display: none; animation: fade 0.35s ease; }
    .panel.active { display: block; }
    @keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.25rem; box-shadow: 0 1px 3px rgba(42,40,37,0.05); }
    .hero { font-size: 2rem; margin-bottom: 0.25rem; }
    .sub { color: var(--sub); font-size: 0.875rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit,minmax(120px,1fr)); gap: 1rem; margin-top: 1.25rem; }
    .stat label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sub); }
    .stat val { display: block; font-size: 1.35rem; color: var(--accent); font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
    .insight { border-color: rgba(139,115,85,0.35); background: rgba(139,115,85,0.06); }
    .chart-box { height: 220px; margin-top: 1rem; }
    .chart-sm { height: 140px; }
    details { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 0.5rem; background: var(--card); }
    summary { padding: 0.75rem 1rem; cursor: pointer; font-size: 0.875rem; list-style: none; }
    summary::-webkit-details-marker { display: none; }
    summary::before { content: '▸ '; color: var(--accent); }
    details[open] summary::before { content: '▾ '; }
    .detail-body { padding: 0 1rem 1rem; font-size: 0.8125rem; color: var(--sub); border-top: 1px solid var(--border); }
    .tag { display: inline-block; background: var(--muted); padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; margin: 0.15rem; }
    .pill { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.7rem; font-weight: 500; }
    .pill-grow { background: rgba(196,92,74,0.12); color: var(--danger); }
    .pill-fade { background: rgba(61,139,106,0.12); color: var(--success); }
    .pill-steady { background: var(--muted); color: var(--sub); }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 768px) { .layout { flex-direction: column; } nav { width: 100%; height: auto; position: relative; display: flex; flex-wrap: wrap; gap: 0; } nav button { width: auto; flex: 1; min-width: 100px; } main { padding: 1rem; } .grid2 { grid-template-columns: 1fr; } }
    .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--sub); }
  </style>
</head>
<body>
  <div class="layout">
    <nav id="nav">
      <div class="brand">
        <h1>North Star</h1>
        <p>@${esc(username)} · ${report.posts_analysed} posts</p>
      </div>
      <button type="button" class="active" data-panel="overview">Overview</button>
      <button type="button" data-panel="signals">Signals</button>
      <button type="button" data-panel="debate">Debate Council</button>
      <button type="button" data-panel="persona">Persona</button>
      <button type="button" data-panel="themes">Themes</button>
      <button type="button" data-panel="future">Future Outlook</button>
    </nav>
    <main>
      <section id="overview" class="panel active">
        <div class="card">
          <h2 class="hero">@${esc(username)}</h2>
          <p class="sub">${esc(report.profile_url)}</p>
          <div class="stats">
            <div class="stat"><label>Posts analysed</label><val>${report.posts_analysed}</val></div>
            <div class="stat"><label>Period</label><val>${report.analysis_period_days}d</val></div>
            <div class="stat"><label>Data quality</label><val>${pct(report.data_quality_score)}</val></div>
            <div class="stat"><label>Model fit</label><val>${report.model_fit_r_squared.toFixed(3)}</val></div>
          </div>
        </div>
        ${
          personaModel?.key_insight
            ? `<div class="card insight"><h3>Key insight</h3><p style="margin-top:0.75rem">${esc(personaModel.key_insight)}</p></div>`
            : ''
        }
        ${
          personaModel?.summary
            ? `<div class="card"><h3>Summary</h3><p style="margin-top:0.75rem;color:var(--sub)">${esc(personaModel.summary)}</p></div>`
            : ''
        }
        <div class="card">
          <h3>Projection confidence</h3>
          <div class="stats">
            ${Object.entries(report.projection_confidence)
              .map(([h, c]) => `<div class="stat"><label>T+${h} days</label><val>${pct(c)}</val></div>`)
              .join('')}
          </div>
        </div>
      </section>

      <section id="signals" class="panel">
        <div class="card">
          <h3>Engagement over posts</h3>
          <p class="sub">Chronological — older to newer</p>
          <div class="chart-box"><canvas id="chart-engagement"></canvas></div>
        </div>
        ${
          payload.derivedSignals
            ? `<div class="card"><h3>Derived signals</h3>
          <div class="stats">
            <div class="stat"><label>Regularity</label><val>${payload.derivedSignals.posting_regularity.toFixed(2)}</val></div>
            <div class="stat"><label>Volatility</label><val>${payload.derivedSignals.emotional_volatility.toFixed(2)}</val></div>
            <div class="stat"><label>Engagement slope</label><val>${payload.derivedSignals.engagement_slope.toFixed(4)}</val></div>
            <div class="stat"><label>Topic drift</label><val>${payload.derivedSignals.topic_drift_score.toFixed(2)}</val></div>
          </div></div>`
            : ''
        }
        ${
          payload.signalSummary?.post_samples?.length
            ? `<div class="card"><h3>Sample posts</h3>${payload.signalSummary.post_samples
                .slice(0, 6)
                .map(
                  (p) =>
                    `<details><summary>${esc(p.post_type || 'post')} · engagement ${(p.engagement_rate * 100).toFixed(2)}%</summary><div class="detail-body">${esc(p.caption_excerpt || '')}</div></details>`,
                )
                .join('')}</div>`
            : ''
        }
      </section>

      <section id="debate" class="panel">
        <div class="card">
          <h3>Confidence evolution</h3>
          <p class="sub">Round 1 → 2 → 3 synthesis by agent</p>
          <div class="chart-box"><canvas id="chart-debate"></canvas></div>
        </div>
        <div class="card">
          <h3>Cross-examinations (${payload.challenges.length})</h3>
          ${payload.challenges
            .slice(0, 20)
            .map((ch) => {
              const text =
                typeof ch.challenge_text === 'string'
                  ? ch.challenge_text
                  : JSON.stringify(ch.challenge_text);
              return `<details><summary>${esc(AGENT_LABELS[ch.challenger] || ch.challenger)} → ${esc(AGENT_LABELS[ch.target] || ch.target)}</summary><div class="detail-body">${esc(text.slice(0, 500))}</div></details>`;
            })
            .join('')}
        </div>
      </section>

      <section id="persona" class="panel">
        ${
          personaSections
            .map((item) => {
              if (!item) return '';
              const sec = item.section as { summary?: string; claims?: { claim: string; confidence: number; evidence?: string }[] };
              const claims = (sec.claims || [])
                .map(
                  (c) =>
                    `<div style="margin:0.5rem 0;padding:0.5rem;background:var(--muted);border-radius:6px"><strong>${esc(c.claim)}</strong> <span class="tag">${pct(c.confidence)}</span>${c.evidence ? `<br/><span style="font-size:0.75rem">${esc(c.evidence.slice(0, 200))}</span>` : ''}</div>`,
                )
                .join('');
              return `<div class="card"><h3>${esc(item.title)}</h3><p class="sub" style="margin:0.5rem 0">${esc(sec.summary || '')}</p>${claims}</div>`;
            })
            .join('') || '<div class="card"><p class="sub">No persona model available.</p></div>'
        }
      </section>

      <section id="themes" class="panel">
        ${beliefStrains
          .map((s) => {
            const trend = s.trend_label || s.trajectory;
            const pill =
              trend === 'growing' || s.trajectory === 'expanding'
                ? 'pill-grow'
                : trend === 'fading' || s.trajectory === 'contracting'
                  ? 'pill-fade'
                  : 'pill-steady';
            const trendText =
              trend === 'growing' || s.trajectory === 'expanding'
                ? 'Growing'
                : trend === 'fading' || s.trajectory === 'contracting'
                  ? 'Fading'
                  : 'Steady';
            return `<div class="card">
              <div style="display:flex;justify-content:space-between;align-items:start">
                <h3>${esc(s.label || s.strain_type.replace(/_/g, ' '))}</h3>
                <span class="pill ${pill}">${trendText}</span>
              </div>
              <p class="sub" style="margin:0.75rem 0">${esc(s.plain_summary || s.interpretation || '')}</p>
              ${(s.keywords || []).slice(0, 8).map((k) => `<span class="tag">${esc(k)}</span>`).join('')}
              <div class="chart-sm"><canvas id="chart-strain-${esc(s.strain_type)}"></canvas></div>
              ${(s.evidence_captions || []).map((c) => `<p style="font-size:0.75rem;color:var(--sub);margin-top:0.5rem;border-left:2px solid var(--accent);padding-left:0.5rem">${esc(c)}</p>`).join('')}
            </div>`;
          })
          .join('') || '<div class="card"><p class="sub">No narrative themes detected.</p></div>'}
      </section>

      <section id="future" class="panel">
        ${
          mcPathData.length
            ? `<div class="card"><h3>Monte Carlo sample paths</h3><p class="sub">${futureState?.simulation_audit?.n_simulations?.toLocaleString() ?? ''} simulations · valence projection</p><div class="chart-box"><canvas id="chart-monte"></canvas></div></div>`
            : ''
        }
        ${
          scenarios.length
            ? `<div class="card"><h3>Scenario paths</h3>${scenarios
                .map(
                  (sc) =>
                    `<div style="margin:0.75rem 0"><strong>${esc(sc.name)}</strong> <span class="tag">${pct(sc.probability)}</span><p class="sub">${esc(sc.description)}</p></div>`,
                )
                .join('')}</div>`
            : ''
        }
        ${
          futureNarrative
            ? `<div class="card insight"><h3>Next 30 days</h3><p style="margin-top:0.5rem">${esc(futureNarrative.next_30_days)}</p></div>
               <div class="card"><h3>Next 90 days</h3><p style="margin-top:0.5rem;color:var(--sub)">${esc(futureNarrative.next_90_days)}</p></div>
               <div class="card"><h3>6-month horizon</h3><p style="margin-top:0.5rem;color:var(--sub)">${esc(futureNarrative.six_month_horizon)}</p></div>
               <div class="card"><h3>What we cannot know</h3><p style="margin-top:0.5rem;color:var(--sub)">${esc(futureNarrative.epistemic_limits)}</p></div>`
            : ''
        }
      </section>

      <p class="footer">Generated ${new Date().toLocaleString()} · North Star · Open this file in any browser — fully self-contained.</p>
    </main>
  </div>

  <script type="application/json" id="report-charts">${embedded}<\/script>
  <script>
    const DATA = JSON.parse(document.getElementById('report-charts').textContent);
    const ACCENT = '#0071e3';
    const COLORS = ['#0071e3', '#5856d6', '#34c759', '#ff9500', '#ff3b30', '#86868b'];

    document.querySelectorAll('#nav button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#nav button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.panel).classList.add('active');
      });
    });

    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#7a736c', font: { size: 11 } } } },
      scales: {
        x: { grid: { color: '#ebe7e1' }, ticks: { color: '#7a736c', font: { size: 10 } } },
        y: { grid: { color: '#ebe7e1' }, ticks: { color: '#7a736c', font: { size: 10 } } },
      },
    };

    if (DATA.engagementData.length && document.getElementById('chart-engagement')) {
      new Chart(document.getElementById('chart-engagement'), {
        type: 'line',
        data: {
          labels: DATA.engagementData.map(d => d.i),
          datasets: [{ label: 'Engagement rate', data: DATA.engagementData.map(d => d.rate), borderColor: ACCENT, tension: 0.3, fill: false, pointRadius: 2 }],
        },
        options: chartDefaults,
      });
    }

    if (DATA.confidenceEvolution.length && document.getElementById('chart-debate')) {
      const rounds = DATA.debateRounds;
      new Chart(document.getElementById('chart-debate'), {
        type: 'line',
        data: {
          labels: rounds,
          datasets: DATA.confidenceEvolution.map((e, i) => ({
            label: e.label,
            data: [e.round1, e.round2 ?? e.round1, e.round3 ?? e.round2 ?? e.round1],
            borderColor: COLORS[i % COLORS.length],
            tension: 0.3,
            pointRadius: 4,
          })),
        },
        options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0, max: 1 } } },
      });
    }

    DATA.strainCharts.forEach((s) => {
      const el = document.getElementById('chart-strain-' + s.id);
      if (!el || !s.data.length) return;
      new Chart(el, {
        type: 'line',
        data: { labels: s.data.map(d => d.i), datasets: [{ label: 'Theme presence', data: s.data.map(d => d.v), borderColor: ACCENT, tension: 0.3, pointRadius: 0 }] },
        options: { ...chartDefaults, plugins: { legend: { display: false } } },
      });
    });

    if (DATA.mcPathData.length && document.getElementById('chart-monte')) {
      const labels = DATA.mcPathData[0].values.map((_, i) => i * 30);
      new Chart(document.getElementById('chart-monte'), {
        type: 'line',
        data: {
          labels,
          datasets: DATA.mcPathData.slice(0, 8).map((p, i) => ({
            label: 'Path ' + p.sim_index,
            data: p.values,
            borderColor: COLORS[i % COLORS.length],
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.2,
          })),
        },
        options: chartDefaults,
      });
    }
  <\/script>
</body>
</html>`;
}
