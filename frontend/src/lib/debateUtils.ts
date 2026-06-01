import type { AgentHypothesis, Challenge, PersonaModel, PersonaSection, RevisedHypothesis } from '../types/report';
import { AGENT_LABELS } from '../types/report';
import { parseConfidence } from './utils';

const AGENT_IDS = [
  'psychographer',
  'sociologist',
  'narrative_analyst',
  'behavioural_economist',
  'temporal_analyst',
  'cultural_analyst',
];

export function revisedToHypotheses(revised: RevisedHypothesis[]): AgentHypothesis[] {
  return revised.map((r) => ({
    agent: r.agent,
    analysis: {
      ...r.revised_analysis,
      key_hypothesis: r.revised_analysis?.revised_hypothesis || r.revised_analysis?.key_claim,
      key_claim: r.revised_analysis?.key_claim || r.revised_analysis?.revised_hypothesis,
    },
  }));
}

type PersonaSectionKey =
  | 'core_identity'
  | 'psychological_profile'
  | 'social_strategy'
  | 'narrative_self_model'
  | 'revealed_preferences'
  | 'cultural_identity'
  | 'temporal_state';

export const AGENT_PERSONA_SECTIONS: Record<string, readonly PersonaSectionKey[]> = {
  psychographer: ['psychological_profile', 'core_identity'],
  sociologist: ['social_strategy'],
  narrative_analyst: ['narrative_self_model'],
  behavioural_economist: ['revealed_preferences'],
  temporal_analyst: ['temporal_state'],
  cultural_analyst: ['cultural_identity'],
};

function avgSectionConfidence(
  persona: PersonaModel,
  sections: readonly PersonaSectionKey[],
): number | null {
  const confidences: number[] = [];
  for (const key of sections) {
    const section: PersonaSection = persona[key];
    for (const c of section.claims || []) {
      confidences.push(parseConfidence(c.confidence, 0.5));
    }
    if (section.summary && (!section.claims || section.claims.length === 0)) {
      confidences.push(0.55);
    }
  }
  if (confidences.length === 0) return null;
  return confidences.reduce((a, b) => a + b, 0) / confidences.length;
}

export interface AgentConfidencePoint {
  agent: string;
  label: string;
  round1: number;
  round2: number | null;
  round3: number | null;
  synthesisClaims: number[];
}

export function buildConfidenceEvolution(
  hypotheses: AgentHypothesis[],
  revised: RevisedHypothesis[],
  persona?: PersonaModel,
): AgentConfidencePoint[] {
  const revMap = new Map(revised.map((r) => [r.agent, r]));

  return AGENT_IDS.map((agent) => {
    const h = hypotheses.find((x) => x.agent === agent);
    const r = revMap.get(agent);
    const r1 = parseConfidence(h?.analysis?.confidence, 0.5);
    const r2 = r ? parseConfidence(r.revised_analysis?.confidence, r1) : null;

    let round3: number | null = null;
    if (persona) {
      const sections = AGENT_PERSONA_SECTIONS[agent];
      if (sections) {
        round3 = avgSectionConfidence(persona, sections);
      }
      if (round3 == null) {
        round3 = r2 ?? r1;
      }
    }

    const synthesisClaims: number[] = [];
    if (persona) {
      for (const key of Object.keys(persona) as (keyof PersonaModel)[]) {
        const section = persona[key];
        if (section && typeof section === 'object' && 'claims' in section && Array.isArray(section.claims)) {
          synthesisClaims.push(...section.claims.map((c) => parseConfidence(c.confidence, 0.5)));
        }
      }
    }

    return {
      agent,
      label: AGENT_LABELS[agent] || agent,
      round1: r1,
      round2: r2,
      round3,
      synthesisClaims,
    };
  }).filter((p) => hypotheses.some((h) => h.agent === p.agent) || revised.some((r) => r.agent === p.agent));
}

export function challengesForAgent(challenges: Challenge[], agent: string, asTarget: boolean): Challenge[] {
  return challenges.filter((c) => (asTarget ? c.target === agent : c.challenger === agent));
}

export function synthesisClaimCards(persona: PersonaModel): {
  section: string;
  claim: string;
  confidence: number;
  evidence: string;
}[] {
  const sections = [
    'core_identity',
    'psychological_profile',
    'social_strategy',
    'narrative_self_model',
    'revealed_preferences',
    'cultural_identity',
    'temporal_state',
  ] as const;
  const cards: { section: string; claim: string; confidence: number; evidence: string }[] = [];
  for (const key of sections) {
    const section = persona[key];
    if (!section || typeof section !== 'object' || !('claims' in section)) continue;
    const claims = section.claims || [];
    if (claims.length === 0 && section.summary) {
      cards.push({ section: key.replace(/_/g, ' '), claim: section.summary, confidence: 0.55, evidence: '' });
      continue;
    }
    for (const c of claims.slice(0, 2)) {
      cards.push({
        section: key.replace(/_/g, ' '),
        claim: c.claim,
        confidence: parseConfidence(c.confidence, 0.5),
        evidence: c.evidence || '',
      });
    }
  }
  return cards;
}
