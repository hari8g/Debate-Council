import { create } from 'zustand';
import type {
  AgentHypothesis,
  Challenge,
  DerivedSignals,
  ErrorLogEntry,
  FutureStateDistribution,
  FutureStateNarrative,
  OuParameters,
  PersonaDynamicsReport,
  PersonaModel,
  PhasePortrait,
  PersonalR0Estimate,
  PipelineEvent,
  ProfileSignalMatrix,
  RevisedHypothesis,
  SignalSummary,
  StageState,
  SubstepState,
} from '../types/report';

interface AnalysisStore {
  jobId: string | null;
  status: 'idle' | 'running' | 'complete' | 'error';
  error: string | null;
  startedAt: number | null;
  selectedSubstepId: string | null;
  stages: Record<number, StageState>;
  signalSummary?: SignalSummary;
  derivedSignals?: DerivedSignals;
  signalMatrix?: ProfileSignalMatrix;
  agentHypotheses: AgentHypothesis[];
  challenges: Challenge[];
  revisedHypotheses: RevisedHypothesis[];
  personaModel?: PersonaModel;
  ouParams?: OuParameters;
  phasePortrait?: PhasePortrait;
  beliefStrains: PersonalR0Estimate[];
  futureState?: FutureStateDistribution;
  futureNarrative?: FutureStateNarrative;
  report?: PersonaDynamicsReport;
  activeTab: string;
  detailPanelTab: 'live' | 'errors' | 'report';
  errorLog: ErrorLogEntry[];
  rerunningStage: number | null;
  isDemoMode: boolean;

  reset: () => void;
  setActiveTab: (tab: string) => void;
  setDetailPanelTab: (tab: 'live' | 'errors' | 'report') => void;
  appendErrorLog: (entry: Omit<ErrorLogEntry, 'id'>) => void;
  clearErrorLog: () => void;
  setSelectedSubstep: (id: string | null) => void;
  prepareStageRerun: (stage: number) => void;
  handleEvent: (event: PipelineEvent) => void;
}

const STAGE_SUBSTEPS: Record<number, { id: string; label: string }[]> = {
  1: [
    { id: 's1_resolve', label: 'Resolve profile' },
    { id: 's1_metadata', label: 'Fetch profile metadata' },
    { id: 's1_posts', label: 'Fetch posts' },
    { id: 's1_stories', label: 'Stories & highlights' },
    { id: 's1_engagement', label: 'Post engagement depth' },
    { id: 's1_matrix', label: 'Build signal matrix' },
    { id: 's1_derived', label: 'Compute derived signals' },
    { id: 's1_summary', label: 'Signal summary' },
  ],
  2: [
    { id: 's2_agents', label: 'Agent hypotheses' },
    { id: 's2_challenge', label: 'Round 1: Challenges' },
    { id: 's2_defense', label: 'Round 2: Defenses' },
    { id: 's2_synthesis', label: 'Round 3: Synthesis' },
    { id: 's2_persona', label: 'Unified persona model' },
  ],
  3: [
    { id: 's3_state', label: 'State vector estimation' },
    { id: 's3_ou', label: 'OU parameter fitting' },
    { id: 's3_portrait', label: 'Phase portrait' },
    { id: 's3_strains', label: 'Narrative themes' },
    { id: 's3_monte', label: 'Monte Carlo simulation' },
    { id: 's3_narrative', label: 'Future narrative' },
  ],
};

const CANONICAL_SUBSTEP_IDS = new Set(
  Object.values(STAGE_SUBSTEPS).flatMap((list) => list.map((s) => s.id)),
);

const STAGE_DEFAULTS: Record<number, { title: string; description: string }> = {
  1: { title: 'Profile Signal Extraction', description: 'Extracting temporal signal matrix from Instagram profile' },
  2: { title: 'Multi-Agent Debate Council', description: 'Six agents debate to stress-test persona hypotheses' },
  3: { title: 'Future State Projection', description: 'Dynamical systems modelling and Monte Carlo simulation' },
};

function initStages(): Record<number, StageState> {
  const stages: Record<number, StageState> = {};
  for (const [stageNum, substeps] of Object.entries(STAGE_SUBSTEPS)) {
    const n = Number(stageNum);
    const defaults = STAGE_DEFAULTS[n];
    const subMap: Record<string, SubstepState> = {};
    for (const s of substeps) {
      subMap[s.id] = { id: s.id, stage: n, label: s.label, status: 'pending' };
    }
    stages[n] = {
      stage: n,
      title: defaults?.title ?? '',
      description: defaults?.description ?? '',
      status: 'pending',
      substeps: subMap,
    };
  }
  return stages;
}

function substepLabel(stages: Record<number, StageState>, stage?: number, substepId?: string): string | undefined {
  if (stage == null || !substepId) return undefined;
  return stages[stage]?.substeps[substepId]?.label;
}

const AGENT_LABELS_STORE: Record<string, string> = {
  psychographer: 'Psychographer',
  sociologist: 'Sociologist',
  narrative_analyst: 'Narrative Analyst',
  behavioural_economist: 'Behavioural Economist',
  temporal_analyst: 'Temporal Analyst',
  cultural_analyst: 'Cultural Context Analyst',
};

function dynamicSubstepLabel(id: string, payload: Record<string, unknown>): string {
  if (id.startsWith('s2_agent_')) {
    const agent = id.replace('s2_agent_', '');
    return `${AGENT_LABELS_STORE[agent] || agent} hypothesis`;
  }
  if (id.startsWith('s2_ch_')) {
    const parts = id.replace('s2_ch_', '').split('_');
    const challenger = parts[0];
    const target = parts.slice(1).join('_');
    return `Challenge: ${AGENT_LABELS_STORE[challenger] || challenger} → ${AGENT_LABELS_STORE[target] || target}`;
  }
  if (id.startsWith('s2_defense_')) {
    const agent = id.replace('s2_defense_', '');
    return `${AGENT_LABELS_STORE[agent] || agent} defense`;
  }
  if (id.startsWith('s3_strain_')) {
    const label = payload.label as string | undefined;
    return label ? `Theme: ${label}` : `Theme: ${id.replace('s3_strain_', '').replace(/_/g, ' ')}`;
  }
  for (const list of Object.values(STAGE_SUBSTEPS)) {
    const match = list.find((s) => s.id === id);
    if (match) return match.label;
  }
  return id;
}

function nextErrorId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const WARNING_PATTERN = /\b(failed|failure|error|warn|warning|403|401|timeout|rate.?limit)\b/i;

const initialState = {
  jobId: null as string | null,
  status: 'idle' as const,
  error: null as string | null,
  startedAt: null as number | null,
  selectedSubstepId: null as string | null,
  stages: initStages(),
  agentHypotheses: [] as AgentHypothesis[],
  challenges: [] as Challenge[],
  revisedHypotheses: [] as RevisedHypothesis[],
  beliefStrains: [] as PersonalR0Estimate[],
  activeTab: 'overview',
  detailPanelTab: 'live' as const,
  errorLog: [] as ErrorLogEntry[],
  rerunningStage: null as number | null,
  isDemoMode: false,
};

function resetStagesFrom(stageNum: number, stages: Record<number, StageState>): Record<number, StageState> {
  const next = { ...stages };
  for (let s = stageNum; s <= 3; s++) {
    const defaults = STAGE_DEFAULTS[s];
    const subMap: Record<string, SubstepState> = {};
    for (const sub of STAGE_SUBSTEPS[s]) {
      subMap[sub.id] = { id: sub.id, stage: s, label: sub.label, status: 'pending' };
    }
    next[s] = {
      stage: s,
      title: defaults?.title ?? '',
      description: defaults?.description ?? '',
      status: 'pending',
      substeps: subMap,
    };
  }
  return next;
}

function clearDomainFromStage(stage: number): Partial<AnalysisStore> {
  if (stage === 1) {
    return {
      signalSummary: undefined,
      derivedSignals: undefined,
      signalMatrix: undefined,
      agentHypotheses: [],
      challenges: [],
      revisedHypotheses: [],
      personaModel: undefined,
      ouParams: undefined,
      phasePortrait: undefined,
      beliefStrains: [],
      futureState: undefined,
      futureNarrative: undefined,
      report: undefined,
    };
  }
  if (stage === 2) {
    return {
      agentHypotheses: [],
      challenges: [],
      revisedHypotheses: [],
      personaModel: undefined,
      ouParams: undefined,
      phasePortrait: undefined,
      beliefStrains: [],
      futureState: undefined,
      futureNarrative: undefined,
    };
  }
  return {
    ouParams: undefined,
    phasePortrait: undefined,
    beliefStrains: [],
    futureState: undefined,
    futureNarrative: undefined,
  };
}

export function hydrateFromReport(report: PersonaDynamicsReport): Partial<AnalysisStore> {
  return {
    report,
    signalSummary: report.signal_summary,
    derivedSignals: report.derived_signals,
    signalMatrix: report.signal_matrix,
    agentHypotheses: report.agent_hypotheses ?? [],
    challenges: report.debate_record?.challenges ?? [],
    revisedHypotheses: report.debate_record?.revised_hypotheses ?? [],
    personaModel: report.persona_model,
    ouParams: report.ou_parameters,
    phasePortrait: report.phase_portrait,
    beliefStrains: report.belief_strain_profiles ?? [],
    futureState: report.future_state,
    futureNarrative: report.future_narrative,
  };
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  ...initialState,

  reset: () => set({ ...initialState, stages: initStages() }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setDetailPanelTab: (tab) => set({ detailPanelTab: tab }),

  appendErrorLog: (entry) =>
    set((state) => ({
      errorLog: [...state.errorLog, { ...entry, id: nextErrorId() }],
      detailPanelTab: entry.severity === 'error' ? 'errors' : state.detailPanelTab,
    })),

  clearErrorLog: () => set({ errorLog: [] }),

  setSelectedSubstep: (id) => set({ selectedSubstepId: id }),

  prepareStageRerun: (stage) => {
    const stages = resetStagesFrom(stage, get().stages);
    set({
      stages,
      status: 'running',
      error: null,
      rerunningStage: stage,
      detailPanelTab: 'live',
      ...clearDomainFromStage(stage),
    });
  },

  handleEvent: (event) => {
    const { type, data } = event;
    const stages = { ...get().stages };

    switch (type) {
      case 'STAGE_RERUN_START': {
        const stage = data.stage as number;
        get().prepareStageRerun(stage);
        break;
      }

      case 'STAGE_START': {
        const stage = data.stage as number;
        stages[stage] = {
          ...stages[stage],
          title: data.title as string,
          description: data.description as string,
          status: 'running',
        };
        set({ stages, status: 'running' });
        break;
      }

      case 'SUBSTEP_START': {
        const stage = data.stage as number;
        const id = data.id as string;
        if (stages[stage]?.substeps[id]) {
          stages[stage] = {
            ...stages[stage],
            substeps: {
              ...stages[stage].substeps,
              [id]: { ...stages[stage].substeps[id], status: 'running', label: (data.label as string) || stages[stage].substeps[id].label },
            },
          };
        } else if (stages[stage]) {
          stages[stage].substeps[id] = {
            id,
            stage,
            label: data.label as string,
            status: 'running',
          };
        }
        set({
          stages,
          ...(CANONICAL_SUBSTEP_IDS.has(id) ? { selectedSubstepId: id } : {}),
        });
        break;
      }

      case 'SUBSTEP_PROGRESS': {
        const stage = data.stage as number;
        const id = data.id as string;
        const message = data.message as string | undefined;
        if (stages[stage]?.substeps[id]) {
          stages[stage].substeps[id] = {
            ...stages[stage].substeps[id],
            message,
            percent: data.percent as number | undefined,
          };
        }
        const updates: Partial<AnalysisStore> = { stages };
        const percent = data.percent as number | undefined;
        if (message && percent == null && WARNING_PATTERN.test(message)) {
          updates.errorLog = [
            ...get().errorLog,
            {
              id: nextErrorId(),
              timestamp: event.timestamp * 1000,
              source: 'pipeline',
              severity: 'warning',
              message,
              stage,
              substepId: id,
              substepLabel: substepLabel(stages, stage, id),
            },
          ];
        }
        set(updates);
        break;
      }

      case 'SUBSTEP_COMPLETE': {
        const stage = data.stage as number;
        const id = data.id as string;
        const payload = data.payload as Record<string, unknown>;
        const dynamicLabel = dynamicSubstepLabel(id, payload);
        if (stages[stage]?.substeps[id]) {
          stages[stage].substeps[id] = {
            ...stages[stage].substeps[id],
            status: 'complete',
            payload,
            label: stages[stage].substeps[id].label || dynamicLabel,
          };
        } else if (stages[stage]) {
          stages[stage].substeps[id] = {
            id,
            stage,
            label: dynamicLabel,
            status: 'complete',
            payload,
          };
        }
        const updates: Partial<AnalysisStore> = { stages };

        if (id === 's1_derived' && payload) updates.derivedSignals = payload as unknown as DerivedSignals;
        if (id === 's1_matrix' && payload?.captions) {
          updates.signalMatrix = payload as unknown as ProfileSignalMatrix;
        }
        if (id === 's1_summary' && payload) updates.signalSummary = payload as unknown as SignalSummary;
        if (id.startsWith('s2_agent_') && payload?.hypothesis) {
          const hyp = payload.hypothesis as AgentHypothesis;
          updates.agentHypotheses = [...get().agentHypotheses.filter((h) => h.agent !== hyp.agent), hyp];
        }
        if (id.startsWith('s2_ch_') && payload) {
          updates.challenges = [...get().challenges, payload as unknown as Challenge];
        }
        if (id.startsWith('s2_defense_') && payload) {
          const rev = payload as unknown as RevisedHypothesis;
          updates.revisedHypotheses = [...get().revisedHypotheses.filter((r) => r.agent !== rev.agent), rev];
        }
        if (id === 's2_synthesis' && payload) {
          updates.personaModel = payload as unknown as PersonaModel;
        }
        if (id === 's2_persona' && payload) {
          updates.personaModel = payload as unknown as PersonaModel;
        }
        if (id === 's3_ou' && payload) updates.ouParams = payload as unknown as OuParameters;
        if (id === 's3_portrait' && payload) updates.phasePortrait = payload as unknown as PhasePortrait;
        if (id.startsWith('s3_strain_') && payload) {
          const strain = payload as unknown as PersonalR0Estimate;
          const merged = [...get().beliefStrains.filter((s) => s.strain_type !== strain.strain_type), strain];
          updates.beliefStrains = merged;
          if (merged.length >= 4 && stages[3]?.substeps.s3_strains) {
            stages[3].substeps.s3_strains = {
              ...stages[3].substeps.s3_strains,
              status: 'complete',
            };
            updates.stages = stages;
          }
        }
        if (id === 's3_strains' && payload) {
          const strainList = payload.strains as PersonalR0Estimate[] | undefined;
          if (strainList?.length) {
            updates.beliefStrains = strainList;
          }
        }
        if (id === 's3_monte' && payload) updates.futureState = payload as unknown as FutureStateDistribution;
        if (id === 's3_narrative' && payload) updates.futureNarrative = payload as unknown as FutureStateNarrative;

        set(updates);
        break;
      }

      case 'STAGE_COMPLETE': {
        const stage = data.stage as number;
        stages[stage] = { ...stages[stage], status: 'complete' };
        const payload = data.payload as Record<string, unknown>;
        const updates: Partial<AnalysisStore> = { stages };
        if (stage === 1 && payload?.derived_signals) updates.derivedSignals = payload.derived_signals as DerivedSignals;
        if (stage === 1 && payload?.signal_summary) updates.signalSummary = payload.signal_summary as SignalSummary;
        if (stage === 2 && payload?.persona_model) updates.personaModel = payload.persona_model as PersonaModel;
        set(updates);
        break;
      }

      case 'ERROR': {
        const stage = data.stage as number | undefined;
        const substepId = data.substep_id as string | undefined;
        const errorType = data.error_type as string | undefined;
        const traceback = data.traceback as string | undefined;
        const message = (data.message as string) || 'Unknown error';

        if (stage != null && substepId && stages[stage]?.substeps[substepId]) {
          stages[stage].substeps[substepId] = {
            ...stages[stage].substeps[substepId],
            status: 'error',
            message,
          };
        }

        const entry: ErrorLogEntry = {
          id: nextErrorId(),
          timestamp: event.timestamp * 1000,
          source: 'pipeline',
          severity: 'error',
          message,
          errorType,
          stage,
          substepId,
          substepLabel: substepLabel(stages, stage, substepId),
          traceback,
          raw: data,
        };

        set({
          status: 'error',
          error: errorType ? `${errorType}: ${message}` : message,
          rerunningStage: null,
          errorLog: [...get().errorLog, entry],
          detailPanelTab: 'errors',
        });
        break;
      }

      case 'REPORT_UPDATE': {
        const report = data.report as PersonaDynamicsReport;
        const stage = data.stage as number | undefined;
        set({
          status: 'complete',
          rerunningStage: null,
          error: null,
          ...hydrateFromReport(report),
          detailPanelTab: 'live',
          selectedSubstepId: stage === 1 ? 's1_resolve' : stage === 2 ? 's2_agents' : stage === 3 ? 's3_state' : get().selectedSubstepId,
        });
        break;
      }

      case 'JOB_COMPLETE': {
        const report = data.report as PersonaDynamicsReport;
        set({
          status: 'complete',
          rerunningStage: null,
          report,
          signalSummary: report.signal_summary,
          derivedSignals: report.derived_signals,
          signalMatrix: report.signal_matrix,
          agentHypotheses: report.agent_hypotheses,
          challenges: report.debate_record?.challenges || get().challenges,
          revisedHypotheses: report.debate_record?.revised_hypotheses || get().revisedHypotheses,
          personaModel: report.persona_model,
          ouParams: report.ou_parameters,
          phasePortrait: report.phase_portrait,
          beliefStrains: report.belief_strain_profiles,
          futureState: report.future_state,
          futureNarrative: report.future_narrative,
          activeTab: 'overview',
          detailPanelTab: 'report',
          selectedSubstepId: null,
        });
        break;
      }
    }
  },
}));

export function startAnalysisSession(jobId: string, demo = false) {
  useAnalysisStore.setState({
    ...initialState,
    jobId,
    status: 'running',
    startedAt: Date.now(),
    stages: initStages(),
    isDemoMode: demo,
  });
}
