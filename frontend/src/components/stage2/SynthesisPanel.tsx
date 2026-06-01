import type { PersonaModel } from '../../types/report';
import { UnifiedPersonaView } from './UnifiedPersonaView';

/** Unified persona model — interactive glass atelier view */
export function SynthesisPanel({ persona }: { persona: PersonaModel }) {
  return <UnifiedPersonaView persona={persona} />;
}
