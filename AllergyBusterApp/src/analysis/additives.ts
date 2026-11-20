import additivesData from '../data/additives.json';
import {ProductRecord} from '../types/product';
import {Finding, InsightSection, worstLevel} from './types';

interface AdditiveInfo {
  name: string;
  eNumber?: string;
  classes?: string[];
  efsa?: {title: string; date: string | null; url: string | null; overexposureRisk: string | null};
}

const DATA = additivesData as unknown as {
  meta: {source: string; sourceUrl: string; license: string; generatedAt: string};
  items: Record<string, AdditiveInfo>;
};

export const ADDITIVES_SOURCE = DATA.meta;

export function lookupAdditive(code: string): AdditiveInfo | null {
  return DATA.items[code.toLowerCase()] ?? null;
}

const CLASS_LABELS: Record<string, string> = {
  stabiliser: 'stabilizer',
  colour: 'color',
  'flavour-enhancer': 'flavor enhancer',
  'propellent-gas': 'propellant gas',
};

function classLabel(c: string): string {
  return CLASS_LABELS[c] ?? c.replace(/-/g, ' ');
}

const RISK_TEXT: Record<string, string> = {
  high: "EFSA's evaluation found a high risk that some people's intake exceeds the acceptable daily intake.",
  moderate: "EFSA's evaluation found a moderate risk that some people's intake exceeds the acceptable daily intake.",
};

/** Ingredient & Additive Insights for food. */
export function analyzeAdditives(p: ProductRecord): InsightSection {
  const base = {id: 'additives' as const, title: 'Additives'};

  if (!p.completeness.hasIngredients && p.additives.length === 0) {
    return {
      ...base,
      summary: 'No ingredient list to check.',
      status: 'insufficient_information',
      level: 'info',
      findings: [],
    };
  }
  if (p.additives.length === 0) {
    return {
      ...base,
      summary: 'No additives identified in the listing.',
      status: 'reviewed_no_concern',
      level: 'ok',
      findings: [],
    };
  }

  const findings: Finding[] = [];
  let unknown = 0;
  for (const code of p.additives) {
    const info = lookupAdditive(code);
    if (!info) {
      unknown++;
      continue;
    }
    const classes = (info.classes ?? []).map(classLabel);
    const risk = info.efsa?.overexposureRisk;
    const riskText = risk ? RISK_TEXT[risk] : undefined;
    const detailParts = [
      classes.length ? `Used as: ${classes.join(', ')}.` : undefined,
      riskText,
      info.efsa && !riskText ? `Evaluated by EFSA${info.efsa.date ? ` (${info.efsa.date.slice(0, 4)})` : ''}.` : undefined,
    ].filter(Boolean);
    findings.push({
      id: `additive-${code}`,
      level: riskText ? 'caution' : 'info',
      title: [info.eNumber, info.name].filter(Boolean).join(' · '),
      detail: detailParts.join(' '),
      source: info.efsa?.url
        ? {name: 'EFSA evaluation', url: info.efsa.url, date: info.efsa.date ?? undefined}
        : {name: DATA.meta.source, url: DATA.meta.sourceUrl},
    });
  }
  // Flagged additives first, then alphabetical by E-number.
  findings.sort((a, b) => (a.level === b.level ? a.title.localeCompare(b.title) : a.level === 'caution' ? -1 : 1));

  const flagged = findings.filter(f => f.level === 'caution').length;
  const total = p.additives.length;
  const summary = flagged
    ? `${total} additive${total === 1 ? '' : 's'}, ${flagged} with an EFSA intake concern`
    : `${total} additive${total === 1 ? '' : 's'} explained`;
  if (unknown) {
    findings.push({
      id: 'additive-unknown',
      level: 'info',
      title: `${unknown} additive${unknown === 1 ? '' : 's'} not in our reference data`,
    });
  }
  return {
    ...base,
    summary,
    status: flagged ? 'potential_concern' : unknown ? 'insufficient_information' : 'reviewed_no_concern',
    level: worstLevel(findings.map(f => f.level)),
    findings,
  };
}
