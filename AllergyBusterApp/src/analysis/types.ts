/**
 * Product analysis model (2.0 plan §1.2, §5).
 *
 * The four evidence statuses are the ONLY verdicts the app gives. It never
 * says "safe", "toxin-free" or produces a score. An ingredient concern, a
 * confirmed hazard, an exposure and a proven health risk are different
 * things, and wording must keep them apart.
 */
export type EvidenceStatus =
  /** A reliable source identifies the substance or concern. */
  | 'documented'
  /** A relevant ingredient or material warrants further investigation. */
  | 'potential_concern'
  /** Available data can't establish presence or absence. */
  | 'insufficient_information'
  /** No selected concern found in the reviewed information (not a safety claim). */
  | 'reviewed_no_concern';

export const EVIDENCE_LABELS: Record<EvidenceStatus, string> = {
  documented: 'Documented',
  potential_concern: 'Potential concern',
  insufficient_information: 'Insufficient information',
  reviewed_no_concern: 'Reviewed, no identified concern',
};

/** Visual weight. alert = red, caution = amber, info = neutral, ok = green. */
export type FindingLevel = 'alert' | 'caution' | 'info' | 'ok';

export interface SourceRef {
  name: string;
  url?: string;
  /** ISO date (or YYYY-MM-DD) of the source's evaluation/data, when known. */
  date?: string;
}

export interface Finding {
  id: string;
  level: FindingLevel;
  title: string;
  detail?: string;
  source?: SourceRef;
}

export type SectionId = 'allergy' | 'additives' | 'nutrition' | 'packaging' | 'fragrance' | 'warnings';

export interface InsightSection {
  id: SectionId;
  title: string;
  /** One line shown when collapsed. */
  summary: string;
  status: EvidenceStatus;
  level: FindingLevel;
  findings: Finding[];
}

export interface ProductAnalysis {
  sections: InsightSection[];
}

const LEVEL_ORDER: FindingLevel[] = ['ok', 'info', 'caution', 'alert'];

export function worstLevel(levels: FindingLevel[], fallback: FindingLevel = 'info'): FindingLevel {
  return levels.reduce<FindingLevel>(
    (worst, l) => (LEVEL_ORDER.indexOf(l) > LEVEL_ORDER.indexOf(worst) ? l : worst),
    levels.length ? 'ok' : fallback,
  );
}
