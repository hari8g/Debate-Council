# North Star

**The first answer is not the verdict. It is the opening statement.**

*North Star* is a transparent, three-stage **Persona Dynamics Engine** — part of the [Theatre of Reasoning](https://github.com/hari8g/Debate-Council) research line — that treats a single LLM output as a *hypothesis to be cross-examined*, not a conclusion to be trusted.

Given a public Instagram profile, North Star does not ask one model for the story and stop. It:

1. **Extracts** a longitudinal signal matrix from posts, engagement, and temporal patterns — the shared evidence base.
2. **Puts the first answer on trial** — six specialist agents, each seeded with a different theoretical lens, form independent hypotheses, issue 30 structured cross-examinations, revise under challenge, and synthesize a persona model where **surviving disagreement is preserved as signal**, not averaged away.
3. **Hands the future to mathematics** — Ornstein–Uhlenbeck mean-reversion, narrative belief strains (SIR-style momentum), and 10,000-path Monte Carlo simulation project where the profile may be headed, with confidence that **decays honestly with horizon distance**.

Every substep streams live to a React dashboard via Server-Sent Events. You watch hypotheses form, get challenged, change, merge, and finally give way to dynamical projection — observability is a first-class output, not an afterthought.

Built by Hariprasad Gowrisankar · **Repository:** [github.com/hari8g/Debate-Council](https://github.com/hari8g/Debate-Council)

> For end-to-end event flow, mathematical formulations, and module maps, see **[ARCHITECTURE_FLOW.md](./ARCHITECTURE_FLOW.md)**.  
> For the idealized mathematical specification (worked examples, full 6×6 OU theory), see **[persona_dynamics_engine_methadology.md](./persona_dynamics_engine_methadology.md)**.

---

## Table of Contents

- [Getting Started](#getting-started)
  - [1. Clone or fork the repository](#1-clone-or-fork-the-repository)
  - [2. Requirements](#2-requirements)
  - [3. Configure the backend](#3-configure-the-backend)
  - [4. Build and run](#4-build-and-run)
  - [5. See results](#5-see-results)
    - [5A — Interactive demo (no backend)](#5a-interactive-demo-no-backend)
    - [5B — Live analysis (real profile)](#5b-live-analysis-real-instagram-profile)
- [What North Star Does](#what-north-star-does)
- [Key Features](#key-features)
- [Architecture at a Glance](#architecture-at-a-glance)
- [Repository Structure](#repository-structure)
- [Interactive Demo](#interactive-demo)
  - [Experience modes](#experience-modes)
  - [Demo UI layers](#demo-ui-layers)
  - [Launch URLs](#launch-urls)
  - [Demo profile fixture](#demo-profile-fixture)
  - [How replay works](#how-replay-works)
  - [Controls & troubleshooting](#controls--troubleshooting)
  - [Source files](#demo-source-files)
- [Instagram Authentication](#instagram-authentication)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Pipeline Stages](#pipeline-stages)
- [Frontend Dashboard](#frontend-dashboard)
- [Stage Rerun](#stage-rerun)
- [Mathematical Methods (Summary)](#mathematical-methods-summary)
- [Ethical Constraints](#ethical-constraints)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)

---

## Getting Started

Follow these steps in order. If you only want to explore the UI without API keys, skip to **[5A — Interactive demo](#5a-interactive-demo-no-backend)** after step 4 (frontend only).

### 1. Clone or fork the repository

**Option A — Fork (recommended for your own copy)**

1. Open [https://github.com/hari8g/Debate-Council](https://github.com/hari8g/Debate-Council).
2. Click **Fork** (top right) and create the fork under your GitHub account.
3. Clone **your fork**:

```bash
git clone https://github.com/YOUR_USERNAME/Debate-Council.git
cd Debate-Council
```

**Option B — Clone directly**

```bash
git clone https://github.com/hari8g/Debate-Council.git
cd Debate-Council
```

You should see `backend/`, `frontend/`, and `README.md` at the project root.

---

### 2. Requirements

Install the tools below **before** building. What you need depends on which path you take:

| Requirement | Version | Demo only (`?demo=1`) | Live analysis (real Instagram profile) |
|-------------|---------|----------------------|----------------------------------------|
| **Git** | Any recent | ✅ | ✅ |
| **Node.js** | 20+ | ✅ | ✅ |
| **npm** | 9+ | ✅ | ✅ |
| **Python** | 3.11+ | ❌ | ✅ |
| **pip / venv** | — | ❌ | ✅ |
| **LLM API key** | OpenAI-compatible | ❌ | ✅ (Stage 2 & 3) |
| **Instagram session** | Logged-in browser account | ❌ | ✅ (recommended for real scraping) |
| **Public Instagram profile** | URL or @handle | ❌ | ✅ (target for analysis) |

**Check your versions:**

```bash
node -v    # expect v20.x or higher
npm -v     # expect 9.x or higher
python3 --version   # expect 3.11+ (live analysis only)
```

**Accounts and keys you must obtain (live analysis only):**

1. **LLM API key** — from [OpenAI](https://platform.openai.com/) or any OpenAI-compatible provider (Anthropic via proxy, Azure OpenAI, local LiteLLM, etc.). Set `LLM_BASE_URL` and `LLM_MODEL` if not using OpenAI directly.
2. **Instagram account** — a real account you control, used only to authenticate scraping (see [Instagram Authentication](#instagram-authentication)). Log into Instagram in **Firefox** before importing the session.

---

### 3. Configure the backend

> **Skip this section** if you are running the [interactive demo only](#5a-interactive-demo-no-backend).

#### Step 3.1 — Create the environment file

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e .
cp .env.example .env
```

#### Step 3.2 — Set required variables in `backend/.env`

Open `backend/.env` in an editor. At minimum, set:

```env
# Required for Stage 2 (debate council) and Stage 3 (narrative)
LLM_API_KEY=sk-your-key-here

# Required for reliable Instagram scraping (recommended)
INSTAGRAM_USERNAME=your_ig_username
```

| Variable | Required? | What to put |
|----------|-----------|-------------|
| `LLM_API_KEY` | **Yes** (live run) | Your API key |
| `LLM_BASE_URL` | No | Default `https://api.openai.com/v1` — change for other providers |
| `LLM_MODEL` | No | Default `gpt-4o` — use a model your provider supports |
| `INSTAGRAM_USERNAME` | **Strongly recommended** | Instagram handle used for scraping session |
| `INSTAGRAM_SESSION` | No | Only if session file is not in the default path |

See [Environment Variables](#environment-variables) for the full list (timeouts, Monte Carlo size, fetch limits).

#### Step 3.3 — Import Instagram session (recommended)

Without a valid session, Instagram often returns `403 Forbidden` and post fetch fails.

1. Log into Instagram in **Firefox** as the same user as `INSTAGRAM_USERNAME`.
2. With the venv still active:

```bash
python scripts/import_instagram_session.py
```

3. Confirm the script reports a saved session under `~/.config/instaloader/session-{username}`.
4. Keep `INSTAGRAM_USERNAME` in `.env` matching that account.

Alternative (often fails): `instaloader --login=YOUR_USERNAME` — if you see `Unexpected null login result`, use the Firefox import script above.

---

### 4. Build and run

You need **two terminals** for live analysis (one backend, one frontend). The demo needs **only the frontend terminal**.

#### Terminal 1 — Backend (live analysis only)

```bash
cd backend
source .venv/bin/activate          # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

**Verify the backend is up:** open [http://localhost:8000/api/health](http://localhost:8000/api/health). You should see JSON like:

```json
{"status":"ok","mock_mode":false,...}
```

Leave this terminal running.

#### Terminal 2 — Frontend (required for all paths)

```bash
cd frontend
npm install
npm run dev
```

**Verify the frontend is up:** open [http://localhost:5173](http://localhost:5173). You should see the North Star landing page with an Instagram URL form.

The Vite dev server proxies `/api` requests to `localhost:8000` automatically.

#### Optional — Production build

```bash
cd frontend
npm run build      # outputs to frontend/dist/
npm run preview    # serves dist/ locally
```

For production you must also deploy the FastAPI backend and point the frontend API base URL accordingly.

---

### 5. See results

There are two ways to see North Star in action. Both use the **same dashboard UI** (pipeline timeline on the left, detail panels on the right).

#### 5A. Interactive demo (no backend)

**Best for:** exploring the full pipeline UI with zero configuration — recommended starting point.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Ensure **Terminal 2** (`npm run dev`) is running | Frontend at [http://localhost:5173](http://localhost:5173) |
| 2 | Open [http://localhost:5173/?demo=1](http://localhost:5173/?demo=1) | Demo landing page for `@demo_creator` with four experience cards |
| 3 | Select **Interactive demo** (recommended) and click **Start interactive demo** | Top narration bar appears; Stage 1 streams in the timeline |
| 4 | Read callouts (intro auto-advances; review steps wait for you) | Rich panels explain what to watch and why; Round 2/3 and Stage 3 get extra dwell time |
| 5 | Optionally try **Debate council** (`?demo=debate`) for Stage 2 only | Six-agent flow with council rail and manual round-by-round pauses |
| 6 | At completion, click **Open Full Report** on the finale overlay | **Full Report** tab with the consolidated `PersonaDynamicsReport` |

No `LLM_API_KEY`, Instagram session, or backend required. Full details: [Interactive Demo](#interactive-demo).

---

#### 5B. Live analysis (real Instagram profile)

**Best for:** running the full pipeline on a public profile with LLM + Instagram.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Confirm **both terminals** are running (backend `:8000`, frontend `:5173`) | Health check OK; landing page loads |
| 2 | Open [http://localhost:5173](http://localhost:5173) | URL form with post window selector (All / 90d / 360d / 730d) |
| 3 | Paste a **public** Instagram profile URL or `@username` | e.g. `https://www.instagram.com/somepublicuser/` |
| 4 | Choose post collection (**All posts** recommended for richest signal) | Default is full archive |
| 5 | Click **Begin analysis** | View switches to split dashboard; status shows **running** |
| 6 | Watch the **Pipeline** sidebar (left) | Substages light up: Stage 1 (8 substeps) → Stage 2 (debate) → Stage 3 (projection) |
| 7 | Click any completed substep in the timeline | Matching detail panel on the right (signal matrix, debate rounds, Monte Carlo charts, etc.) |
| 8 | Wait for Stage 3 Monte Carlo (~60–90s for 10k paths) | Progress ticks in timeline; fan chart builds in detail panel |
| 9 | When status shows **complete**, open the **Full Report** tab | Consolidated report with all sections; export available |

**What a successful run looks like:**

- **Stage 1 complete** — post count, signal matrix, derived metrics visible when clicking substeps.
- **Stage 2 complete** — six agent cards, 30 challenges in Round 1, persona tab populated.
- **Stage 3 complete** — phase portrait, strain cards, 10,000-path Monte Carlo fan chart, future narrative + goals.
- **Error Console tab** — empty (or warnings only); red errors mean something failed — see [Troubleshooting](#troubleshooting).

**If Stage 1 fails on Instagram:** re-check `INSTAGRAM_USERNAME` and session import ([§3.3](#step-33--import-instagram-session-recommended)). If `INSTAGRAM_USERNAME` is unset and fetch fails, the backend may fall back to synthetic demo data instead of live posts.

---

#### Quick reference — URLs

| URL | Purpose |
|-----|---------|
| [http://localhost:5173](http://localhost:5173) | Landing page / live analysis |
| [http://localhost:5173/?demo=1](http://localhost:5173/?demo=1) | Demo landing — pick experience mode |
| [http://localhost:5173/?demo=debate](http://localhost:5173/?demo=debate) | Jump straight into Stage 2 debate council demo |
| [http://localhost:8000/api/health](http://localhost:8000/api/health) | Backend health check |
| [http://localhost:8000/docs](http://localhost:8000/docs) | FastAPI Swagger UI |

---

## What North Star Does

Most AI pipelines treat the first coherent answer as the answer. North Star treats it as **Round Zero**.

The core question: *given how someone presents themselves publicly on Instagram, what can we defensibly infer about their persona — and where might they be heading?*

Instagram is deliberately chosen as the proving ground. The data is rich but radically underdetermined — the same posting pattern could mean a dozen different psychological drivers. A single model picks one interpretation and sounds certain. North Star is built to surface the alternatives and force each one to earn trust.

### Three epistemic layers

| Layer | Stage | What happens |
|-------|-------|--------------|
| **Empirical** | Stage 1 | Ingest post history into a temporal signal matrix — captions, hashtags, engagement, posting rhythm, derived behavioural metrics. No persona inference yet; only structured evidence. |
| **Interpretive** | Stage 2 | Six agents (psychographer, sociologist, narrative analyst, behavioural economist, temporal analyst, cultural analyst) read the same evidence independently, cross-examine in three debate rounds (30 challenges → 6 revisions → synthesis), and produce a unified `PersonaModel`. ~35–45% of initial claims are typically revised after challenge — that revision rate is itself a signal of how ambiguous the data is. |
| **Dynamical** | Stage 3 | Map posts onto a 6D psychological state vector; fit calendar-aware Ornstein–Uhlenbeck dynamics (mean reversion toward a personal baseline); discover narrative belief strains with SIR-style momentum; run **10,000 Monte Carlo paths** coupling both models; narrate horizons (30d / 90d / 180d / 365d) with explicit epistemic limits. The LLM's job ends where the mathematics begins. |

### Why the architecture matters

Peer review, adversarial courts, and red teams exist for one reason: **to force a second opinion structurally motivated to disagree with the first.** North Star is that institution, implemented as software — a debate council for the first answer, followed by dynamical systems that project forward without asking a language model to guess the future in prose.

The goal is not to make AI sound more uncertain. The goal is to stop it from mistaking a good story for the truth.

Every substep emits SSE events so inference unfolds in real time on the dashboard — you see the trial, not just the verdict.

---

## Key Features

| Area | Capability |
|------|------------|
| **Data ingestion** | Full-archive fetch (default) or bounded windows (90 / 360 / 730 days); multi-source Instagram pagination (timeline, feed, clips); deduplication by media ID |
| **Enrichment** | Comments, liker samples, stories, highlights; capture quality score with explainer |
| **Debate council** | 6 agents × 3 rounds; confidence calibration against measurable signals |
| **Projection** | Calendar-aware OU fit; adaptive SIR belief strains; coupled Monte Carlo; fan charts and scenario clusters |
| **Narrative** | Horizon narratives (30d / 90d / 6mo / long) + strategic future-goals agent |
| **Live UI** | Pipeline timeline, substep detail panels, interactive math explainers, consolidated report + HTML export |
| **Interactive demo** | Four experience modes at `?demo=1` — full production UI replayed from fixture; narration bar, rich callouts, debate council rail, stage-weighted pacing (~7 min default mode) |
| **Stage rerun** | Re-execute Stage 1, 2, or 3 independently without restarting the full job |
| **Resilience** | LLM retries, Instagram session bypass for revoked GraphQL, error console with full tracebacks |

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│  React + Vite (localhost:5173)                                  │
│  UrlForm → analysisStore (Zustand) ← SSE ← PipelineTimeline     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP / SSE
┌────────────────────────────▼────────────────────────────────────┐
│  FastAPI (localhost:8000)                                       │
│  POST /api/analyze  ·  POST /api/analyze/{id}/rerun/{stage}     │
│  GET  /api/analyze/{id}/stream  ·  GET /api/analyze/{id}        │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   Instagram            OpenAI-compat LLM     NumPy/SciPy
   (Instaloader +       (Stage 2 debate,      (OU fit, Monte
    REST v1 API)          Stage 3 narrative)    Carlo, SIR)
```

**Final artifact:** `PersonaDynamicsReport` — JSON containing signal matrix, debate record, persona model, OU parameters, phase portrait, belief strains, Monte Carlo distributions, and future narrative.

---

## Repository Structure

```
persona/
├── README.md                          ← This file
├── ARCHITECTURE_FLOW.md               ← Detailed event flow + math references
├── persona_dynamics_engine_methadology.md  ← Full mathematical specification
│
├── backend/
│   ├── app/
│   │   ├── main.py                    ← FastAPI routes
│   │   ├── config.py                  ← Settings from .env
│   │   ├── jobs/store.py              ← Job state, SSE pub/sub, rerun
│   │   ├── streaming/events.py        ← Pipeline event types
│   │   ├── llm/client.py              ← Async LLM with retries
│   │   ├── models/                    ← Pydantic schemas (stage1/2/3, report)
│   │   └── pipeline/
│   │       ├── orchestrator.py        ← run_pipeline, rerun_stage, build_report
│   │       ├── stage1_extract.py      ← Profile signal extraction
│   │       ├── instagram_client.py    ← REST pagination (bypasses GraphQL 403)
│   │       ├── profile_enrichment.py  ← Comments, likers, quality score
│   │       ├── stage2_debate.py       ← Multi-agent debate council
│   │       ├── confidence_calibration.py
│   │       ├── stage3_project.py      ← Stage 3 orchestration
│   │       ├── stage3_state.py        ← 6D state history + fusion
│   │       ├── stage3_ou.py           ← OU parameter fit + phase portrait
│   │       ├── stage3_monte.py        ← Monte Carlo (10k+ paths)
│   │       ├── belief_strain_engine.py
│   │       └── behavioral_taxonomy.py
│   ├── scripts/import_instagram_session.py
│   ├── .env.example
│   └── pyproject.toml
│
└── frontend/
    ├── src/
    │   ├── demo/                      ← Interactive demo — see [Interactive Demo](#interactive-demo)
    │   │   ├── NorthStarDemo.tsx      ← Landing + experience picker + shell
    │   │   ├── DemoTopChrome.tsx      ← In-flow narration + debate rail (no overlap)
    │   │   ├── DemoNarrationBar.tsx   ← “What’s happening” / “Why this step” bar
    │   │   ├── DebateCouncilRail.tsx  ← Stage 2 round tracker + agent revision dots
    │   │   ├── DemoCalloutOverlay.tsx ← Rich intro/review callout panels
    │   │   ├── DemoStageCurtain.tsx   ← Light stage transition cards
    │   │   ├── DemoFinale.tsx         ← Completion overlay → Full Report
    │   │   ├── demoExperience.ts      ← Modes, pacing, spotlight checkpoints
    │   │   ├── demoNarration.ts       ← Live narration copy per pipeline event
    │   │   ├── demoCallouts.ts        ← Callout copy + guided moment ordering
    │   │   ├── demoRunner.ts          ← Replay engine (pause, modes, highlights)
    │   │   ├── buildDemoFixture.ts    ← @demo_creator report fixture
    │   │   └── buildDemoEvents.ts     ← Ordered PipelineEvent script
    │   ├── App.tsx                    ← Routes ?demo=1 / ?demo=debate → NorthStarDemo
    │   ├── api/client.ts              ← REST client
    │   ├── lib/
    │   │   ├── analysisStreamManager.ts  ← Shared SSE for analyze + rerun
    │   │   ├── exportInteractiveReport.ts
    │   │   └── substepExplain.ts
    │   ├── store/analysisStore.ts     ← Zustand SSE reducer
    │   ├── hooks/useAnalysisStream.ts
    │   └── components/
    │       ├── input/UrlForm.tsx
    │       ├── pipeline/              ← Timeline, DetailPanel, ErrorConsole
    │       ├── stage1/                ← Signal extraction UI
    │       ├── stage2/                ← Debate council UI
    │       ├── stage3/                ← Projection UI + MathExplainer
    │       ├── report/                ← Consolidated report
    │       └── shared/InfoPopover.tsx ← Viewport-safe ⓘ tooltips
    └── package.json
```

---

## Interactive Demo

The interactive demo replays the **full North Star dashboard** — the same `AnalysisShell`, pipeline timeline, substep detail panels, debate council, phase portraits, Monte Carlo charts, goals outlook, and consolidated report — **without** a running backend, LLM API key, or Instagram session.

It uses the **same UI components** as live analysis. Events are replayed from a fixture via `analysisStore.handleEvent()`, not a simplified mock.

### Experience modes

Choose a mode on the landing page at `?demo=1`:

| Mode | Duration | Best for |
|------|----------|----------|
| **Interactive demo** *(recommended)* | ~7 min | Auto-paced tour with rich callouts, top narration bar, and extra dwell on **Stage 2 Rounds 2–3** and **all Stage 3 phases** |
| **Debate council** | ~8–12 min | Stage 2 only — how agents form hypotheses, cross-examine, revise opinions, and synthesize a persona (`?demo=debate` skips landing) |
| **Deep dive** | ~15–25 min | Intro + review pause at **every** canonical substep (45 guided moments) — you control every step |
| **Free run** | ~3–8 min | No callouts; continuous replay at your chosen speed |

**Interactive demo** (default) highlights:

- **Stage-weighted pacing** — Stage 1 moves briskly; Stage 2 challenges/revisions and Stage 3 math/MC run slower so you can follow agent interaction and Monte Carlo integration.
- **Intro spotlights** — Auto-advancing callouts (with countdown) before hero substeps: signal matrix, debate rounds, OU fit, strains, Monte Carlo, narratives, etc.
- **Review pauses** — Manual **“I've reviewed this — continue”** after Round 1 completes, **each Round 2 agent revision**, Round 3 synthesis, persona model, and **every Stage 3 substep** (including per-strain cards).
- **Full callout panels** — Inputs, outputs, “look for in the UI”, and expandable deep dives (auto-expanded on review steps).

**Debate council** mode pre-seeds Stage 1 instantly, then runs only Stage 2 with the council rail and manual round-by-round pauses.

### Demo UI layers

All demo chrome sits **in-flow below the header** (not fixed over the pipeline), so the timeline and detail panels stay readable.

| Layer | Role |
|-------|------|
| **`DemoTopChrome`** | Stacks narration bar + debate rail without overlapping |
| **`DemoNarrationBar`** | Live **What’s happening** / **Why this step** copy; stage progress + timer in interactive mode; minimizable |
| **`DebateCouncilRail`** | Stage 2 only — R0→Persona phase tracker, challenge/revision counters, agent dots (amber = opinion revised); hides after Stage 2 |
| **`DemoCalloutOverlay`** | Bottom intro/review dialog with full explanatory content |
| **`DemoStageCurtain`** | Light frosted card when each stage begins (pipeline remains visible behind) |
| **`DemoFinale`** | Completion overlay → **Open Full Report** |

While a callout is open, the timeline spotlights the target substep (amber = up next, green = review), the detail panel gets a focus ring, and the relevant substep is auto-selected.

### Launch URLs

| Entry point | URL / action |
|-------------|--------------|
| Demo landing (pick mode) | [http://localhost:5173/?demo=1](http://localhost:5173/?demo=1) |
| Debate council only | [http://localhost:5173/?demo=debate](http://localhost:5173/?demo=debate) |
| From live app | Link on `UrlForm` landing page |
| Query params | `?demo=1` or `?demo=debate` (handled in `App.tsx`) |

Requires only `npm run dev` in `frontend/`. The backend can be stopped.

### Demo profile fixture

| Field | Value |
|-------|-------|
| Username | `@demo_creator` |
| Profile URL | `https://www.instagram.com/demo_creator/` |
| Posts analysed | 72 (full archive) |
| Debate council | 6 agents, 30 challenges, 6 defenses, synthesis → persona |
| Belief strains | 3 narrative themes (politics, institutional justice, wellness) |
| Monte Carlo | 10,000 integrated paths (10 progress milestones in replay) |
| Job ID | `demo-walkthrough` |

Fixture data is in `frontend/src/demo/buildDemoFixture.ts` and matches the production `PersonaDynamicsReport` schema.

### How replay works

```
buildDemoFixture()     →  full report + intermediate payloads
buildDemoEvents()      →  ordered PipelineEvent[] (~136 events)
demoRunner.ts          →  timing, pause/resume, mode-specific checkpoints
demoNarration.ts       →  live top-bar copy synced to each event
analysisStore          →  same reducer as live SSE
AnalysisShell          →  same timeline + detail panel as production
```

Individual agent hypotheses, challenges (`s2_ch_*`), defenses, MC progress ticks, and strain cards stream between pauses exactly as in a live run.

**Deep dive mode** adds 45 guided moments (stage intro, substep intro, substep review, stage wrap-up, job complete) — see `GUIDED_MOMENT_IDS` in `demoCallouts.ts`.

### Controls & troubleshooting

| Control | Description |
|---------|-------------|
| **Start interactive demo** | Default recommended path from landing |
| **Continue now / I've reviewed this** | Advance intro (auto or manual) or review callout · **Enter** / **Space** |
| **Run without pauses** | Switches to free-run for the rest of the session |
| **Pause / Resume** | Pauses event replay; resume continues from the same event index |
| **Minimize** (narration bar) | Collapse top chrome to give more room to the pipeline |
| **Exit demo** | Clears store and removes `?demo` from the URL |
| **Stage Rerun (↺)** | Replays that stage’s fixture events via `rerunDemoStage()` |

Header badge shows active mode (e.g. **Interactive demo · ~7 min**, **Debate council**, **Deep dive**).

| Issue | Fix |
|-------|-----|
| Callout stuck | Click **Continue** / **Resume**, or reload `?demo=1` |
| Timeline not highlighting | Ensure you’re not in **Free run**; interactive/deep dive modes spotlight during callouts |
| Panels felt overlapping (older builds) | Update to latest — chrome is in-flow via `DemoTopChrome` |

### Demo vs live analysis

| | Demo | Live |
|---|------|------|
| Backend | Not required | FastAPI on `:8000` |
| LLM / Instagram | Not required | Required for real profiles |
| Data source | `buildDemoFixture.ts` | Instagram + LLM APIs |
| Event transport | In-process replay | SSE from `/api/analyze/{id}/stream` |
| UI components | Identical | Identical |
| Stage rerun | Replays fixture events | `POST /api/analyze/{id}/rerun/{stage}` |

### Demo source files

| File | Role |
|------|------|
| `frontend/src/demo/NorthStarDemo.tsx` | Landing, experience picker, wraps `AnalysisShell` + overlays |
| `frontend/src/demo/DemoTopChrome.tsx` | In-flow stack for narration + debate rail |
| `frontend/src/demo/DemoNarrationBar.tsx` | Top narration + interactive progress HUD |
| `frontend/src/demo/DebateCouncilRail.tsx` | Stage 2 council phase tracker |
| `frontend/src/demo/DemoCalloutOverlay.tsx` | Intro/review callout dialog |
| `frontend/src/demo/DemoStageCurtain.tsx` | Stage transition overlay |
| `frontend/src/demo/DemoFinale.tsx` | Analysis-complete overlay |
| `frontend/src/demo/demoExperience.ts` | Mode config, pacing gaps, spotlight checkpoints |
| `frontend/src/demo/demoNarration.ts` | Event-driven narration copy |
| `frontend/src/demo/demoCallouts.ts` | Callout copy, pipeline state strings, guided ordering |
| `frontend/src/demo/demoRunner.ts` | Replay engine: modes, pause, highlights, debate seeding |
| `frontend/src/demo/buildDemoFixture.ts` | Full `@demo_creator` fixture |
| `frontend/src/demo/buildDemoEvents.ts` | SSE-like event script |
| `frontend/src/components/AnalysisShell.tsx` | Shared layout; accepts `topSlot` for demo chrome |
| `frontend/src/App.tsx` | Routes `?demo=1` / `?demo=debate` → `NorthStarDemo` |

---

## Instagram Authentication

Instagram frequently blocks programmatic login and revoked GraphQL `doc_id`s. This project **bypasses GraphQL** by using Instagram's v1 REST endpoints in `instagram_client.py` (`/api/v1/feed/user/`, `/api/v1/clips/user/`).

### Option A — Import browser session (recommended)

1. Log into Instagram in **Firefox** as the account you will use for scraping.
2. Run:

```bash
cd backend
source .venv/bin/activate
python scripts/import_instagram_session.py
```

3. Add to `.env`:

```env
INSTAGRAM_USERNAME=your_ig_username
```

4. Restart uvicorn.

Session file: `~/.config/instaloader/session-{username}`

### Option B — CLI login (often fails)

```bash
instaloader --login=YOUR_USERNAME
```

If you see `Unexpected null login result`, use Option A.

### Without Instagram session

If extraction fails and `INSTAGRAM_USERNAME` is **not** set, the pipeline falls back to **demo data**. If `INSTAGRAM_USERNAME` **is** set, extraction errors propagate (no silent demo).

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`.

### LLM

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_API_KEY` | — | OpenAI-compatible API key (**required** for debate + narrative) |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | API base URL |
| `LLM_MODEL` | `gpt-4o` | Model name |
| `LLM_CONNECT_TIMEOUT` | `45` | Connect timeout (seconds) |
| `LLM_READ_TIMEOUT` | `180` | Read timeout (seconds) |
| `LLM_MAX_RETRIES` | `4` | Retry attempts on failure (negative values clamped to 4) |

### Instagram

| Variable | Default | Description |
|----------|---------|-------------|
| `INSTAGRAM_USERNAME` | — | Account used for authenticated scraping |
| `INSTAGRAM_SESSION` | — | Optional full path to session file |
| `INSTAGRAM_ENRICH_POSTS` | `10` | Recent posts deep-scanned for comments/likers |
| `INSTAGRAM_MAX_COMMENTS_PER_POST` | `30` | Comment cap per enriched post |
| `INSTAGRAM_MAX_LIKERS_PER_POST` | `24` | Liker sample cap per post |
| `INSTAGRAM_FEED_PAGE_SIZE` | `50` | Posts per pagination page |
| `INSTAGRAM_MAX_FEED_PAGES` | `120` | Max pages for lookback-window fetch (~6k posts/source) |
| `INSTAGRAM_MAX_FEED_PAGES_ALL` | `500` | Max pages for full-archive fetch |

### Projection / Monte Carlo

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECTION_HORIZONS_DAYS` | `30,90,180,365` | Comma-separated horizon days |
| `PROJECTION_CONFIDENCE_TAU` | `90` | Exponential confidence decay constant (days) |
| `MONTE_CARLO_SIMULATIONS` | `10000` | Paths per run (clamped 10,000–25,000) |

---

## API Reference

Base URL: `http://localhost:8000`

| Method | Path | Body / params | Description |
|--------|------|---------------|-------------|
| `GET` | `/api/health` | — | Liveness; returns `mock_mode` flag |
| `POST` | `/api/analyze` | `{ url, fetch_all_posts?, lookback_days? }` | Start full pipeline; returns `{ job_id }` |
| `POST` | `/api/analyze/{job_id}/rerun/{stage}` | — | Re-run stage `1`, `2`, or `3`; returns `{ job_id }` |
| `GET` | `/api/analyze/{job_id}/stream` | — | SSE stream of `PipelineEvent` JSON |
| `GET` | `/api/analyze/{job_id}` | — | Job status + full report when complete |

### Analyze request

```json
{
  "url": "https://www.instagram.com/username/",
  "fetch_all_posts": true,
  "lookback_days": 365
}
```

- `fetch_all_posts: true` (default) — paginate until exhausted (up to `INSTAGRAM_MAX_FEED_PAGES_ALL` pages per source).
- `fetch_all_posts: false` — only posts within `lookback_days` (90–730).

### SSE event types

| Event | Purpose |
|-------|---------|
| `STAGE_START` | Stage begins |
| `STAGE_RERUN_START` | Stage rerun initiated |
| `SUBSTEP_START` / `SUBSTEP_PROGRESS` / `SUBSTEP_COMPLETE` | Substep lifecycle |
| `STAGE_COMPLETE` | Stage summary payload |
| `REPORT_UPDATE` | Updated report after stage rerun (SSE stays open) |
| `ERROR` | Failure with stage, substep, traceback |
| `JOB_COMPLETE` | Full report; closes SSE stream |

---

## Pipeline Stages

### Stage 1 — Profile Signal Extraction

| Substep | Description |
|---------|-------------|
| `s1_resolve` | Parse username from URL |
| `s1_metadata` | Profile bio, counts, verification |
| `s1_posts` | Paginated post fetch (lookback or full archive) |
| `s1_stories` | Active stories + highlights |
| `s1_engagement` | Comment/liker enrichment on recent posts |
| `s1_matrix` | Chronological `ProfileSignalMatrix` |
| `s1_derived` | Posting regularity, slopes, topic drift, bursts |
| `s1_summary` | Human-readable summary + post samples |

**Outputs:** `ProfileSignalMatrix`, `DerivedSignals`, `SignalSummary`

### Stage 2 — Multi-Agent Debate Council

| Substep | Description |
|---------|-------------|
| `s2_agents` | Six parallel agent hypotheses |
| `s2_challenge` | 30 cross-examinations (6×5 directed pairs) |
| `s2_defense` | Each agent revises under criticism |
| `s2_synthesis` | Synthesis claim cards + debate trajectory charts |
| `s2_persona` | Unified persona model (separate UI tab) |

**Agents:** Psychographer, Sociologist, Narrative Analyst, Behavioural Economist, Temporal Analyst, Cultural Analyst.

**Outputs:** `AgentHypothesis[]`, `DebateRecord`, `PersonaModel`

### Stage 3 — Future State Projection

| Substep | Description |
|---------|-------------|
| `s3_state` | 6D state vector per post; fused simulation anchor |
| `s3_ou` | Ornstein–Uhlenbeck parameter fit |
| `s3_portrait` | Phase portrait (valence×arousal, etc.) |
| `s3_strains` | Adaptive narrative themes + SIR momentum |
| `s3_monte` | 10,000+ Monte Carlo paths with entropy injection |
| `s3_narrative` | Future narrative + strategic goals outlook |

**Outputs:** `OuParameters`, `PhasePortrait`, `PersonalR0Estimate[]`, `FutureStateDistribution`, `FutureStateNarrative`

---

## Frontend Dashboard

### Layout

- **Landing** — URL form with segmented post-collection control (All / 90d / 360d / 730d) and link to the [interactive demo](#interactive-demo).
- **Analysis view** — Split panel: **Pipeline timeline** (left) + **Detail panel** (right).
- **Detail tabs** — Live (substep views), Full Report (when complete), Error Console.
- **Demo view** (`?demo=1` / `?demo=debate`) — Same analysis layout with in-flow narration bar, optional debate council rail, callout overlays, and timeline spotlighting (see [Interactive Demo](#interactive-demo)).

### Notable UI components

| Component | Purpose |
|-----------|---------|
| `SignalMatrixFlow` | Interactive 3-step matrix builder explainer |
| `EngagementDepthPanel` | Phased enrichment walkthrough |
| `AgentCouncilIntroPanel` | Six-agent council rationale |
| `Round1LivePanel` | Live challenge matrix (30 cross-examinations) |
| `MathExplainer` | Expandable step-by-step math for each Stage 3 substep |
| `MonteCarloCharts` | Fan chart, audit panel, entropy source list, scenarios |
| `FutureNarrative` | Horizon narratives + strategic goals agent output |
| `InfoPopover` | Viewport-clamped ⓘ tooltips (no off-screen popovers) |

### Report export

When analysis completes, the **Full Report** tab and `exportInteractiveReport.ts` produce a standalone interactive HTML artifact.

---

## Stage Rerun

Each stage in the pipeline sidebar exposes a **Rerun** button (↺) when that stage has completed and no job is currently running.

| Stage | What rerun does | Downstream effect |
|-------|-------------------|-------------------|
| **1** | Re-fetch profile, posts, matrix, derived signals | Clears Stage 2 & 3 data in report |
| **2** | Re-run full debate council | Clears Stage 3 projection data |
| **3** | Re-run OU, strains, Monte Carlo, narrative | Keeps Stage 1 & 2 |

**Flow:**

1. User clicks **Rerun** → `POST /api/analyze/{job_id}/rerun/{stage}`
2. Backend emits `STAGE_RERUN_START`, then normal substep events
3. On completion → `REPORT_UPDATE` with merged report (SSE **stays open**)
4. Frontend `analysisStreamManager` reconnects SSE if needed after initial `JOB_COMPLETE`

**Prerequisites:** Stage 2 rerun requires Stage 1 complete; Stage 3 requires Stage 2 (persona model present).

In **demo mode** (`?demo=1`), rerun buttons call `rerunDemoStage()` and replay fixture events for that stage instead of hitting the API.

---

## Mathematical Methods (Summary)

| Method | Role |
|--------|------|
| **Derived signals** | CV-based posting regularity, linear slopes, Jaccard topic drift, burst detection |
| **6D state vector** | Valence, arousal, stability, connectivity, engagement, ideological — per post with calendar Δt |
| **OU process** | \(d\mathbf{x} = -\boldsymbol{\alpha}(\mathbf{x}-\mathbf{x}^*)dt + \mathbf{B}\mathbf{u}\,dt + \boldsymbol{\sigma}\,d\mathbf{W}\) |
| **Belief strains** | Hashtag/caption theme discovery; momentum + optional SIR fit (\(R_0 = \beta/\gamma\)) |
| **Monte Carlo** | ≥10,000 paths; lognormal perturbation of α, σ, inputs; Gaussian anchor noise; coupled SIR; engagement shocks |
| **Projection quality** | \(Q(H) = Q_{\text{overall}} \cdot e^{-H/\tau}\) from data coverage, OU R², strain stability, state agreement |

Full derivations: **[ARCHITECTURE_FLOW.md](./ARCHITECTURE_FLOW.md)** §4–6 and **[persona_dynamics_engine_methadology.md](./persona_dynamics_engine_methadology.md)**.

---

## Ethical Constraints

North Star is **interpretive intelligence**, not clinical diagnosis.

- **Public profiles only** — no private account access without authorization
- **No clinical diagnostic language** — ethical flag enforced in every report
- **Explicit uncertainty** — confidence scores, epistemic limits, projection quality decay
- **Speculative claims flagged** — confidence floors and `genuine_uncertainties` section
- **In-memory processing** — job state is not persisted to disk by default
- **Automatic warnings** when data quality is low (`limited_data_warning`, sparse post flags)

---

## Development

### Backend tests

```bash
cd backend
source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

### Frontend build

```bash
cd frontend
npm run build      # tsc + vite production build
npm run preview    # serve dist/
```

### Proxy

Vite dev server proxies `/api` to `localhost:8000` (see `frontend/vite.config.ts`).

### Key design principles

1. **Observability first** — every substep streams progress to the UI
2. **Separation of epistemic layers** — empirical → interpretive → dynamical
3. **Honest uncertainty** — Monte Carlo ensembles, confidence decay, quality scores
4. **Modular stages** — independent rerun without full pipeline restart

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `403 Forbidden` on Instagram | Missing/expired session or GraphQL block | Import Firefox session; project uses REST bypass |
| `LLM API unreachable after -5 attempts` | Negative `LLM_MAX_RETRIES` in `.env` | Set `LLM_MAX_RETRIES=4` (or 1–10) |
| `ConnectTimeout` on LLM | Slow network/VPN | Increase `LLM_CONNECT_TIMEOUT=60` |
| Few posts collected vs profile total | API restrictions or rate limits | Use authenticated session; try fetch-all mode |
| Monte Carlo slow (~60–90s) | 10k paths × 365 days is CPU-intensive | Expected; progress streams in UI |
| Stage rerun returns 409 | Another stage already running | Wait for current run to finish |
| ⓘ popover clipped | Old build | Ensure latest `InfoPopover` (portal + viewport clamp) |
| Demo callout stuck / won't advance | Paused replay or aborted mid-step | Click **Continue** / **Resume**; reload `?demo=1` to restart |
| Demo panels overlapping pipeline | Outdated build | Pull latest — demo chrome uses in-flow `DemoTopChrome` below the header |
| Demo timeline not highlighting | Free run mode or between callouts | Use **Interactive demo** or **Deep dive**; spotlight appears during callouts |

---

## Related Documentation

| Document | Contents |
|----------|----------|
| [ARCHITECTURE_FLOW.md](./ARCHITECTURE_FLOW.md) | End-to-end event flow, SSE architecture, per-stage math, module map, rerun flow |
| [persona_dynamics_engine_methadology.md](./persona_dynamics_engine_methadology.md) | Full mathematical specification with worked examples |
| [backend/.env.example](./backend/.env.example) | All configurable environment variables |
| [frontend/src/demo/](./frontend/src/demo/) | Interactive demo implementation (`?demo=1`) |

---

*North Star · Persona Dynamics Engine · v0.1.0*
