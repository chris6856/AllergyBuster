import {Nutrients, ProductRecord, SOURCE_LABELS} from '../types/product';
import {Preferences} from '../types/preferences';
import {Finding, InsightSection, worstLevel} from './types';

/** Per-serving value: reported per serving, else computed from per 100 g × serving weight. */
function perServing(p: ProductRecord, key: keyof Nutrients): number | undefined {
  const n = p.nutrition;
  if (!n) {
    return undefined;
  }
  const direct = n.perServing?.[key];
  if (direct !== undefined) {
    return direct;
  }
  const per100 = n.per100[key];
  return per100 !== undefined && n.servingGrams ? (per100 * n.servingGrams) / 100 : undefined;
}

const round = (v: number, dp = 0) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

/** Nutrition Overview, using label values as reported by the source. */
export function analyzeNutrition(p: ProductRecord, prefs: Preferences): InsightSection {
  const base = {id: 'nutrition' as const, title: 'Nutrition'};
  if (!p.nutrition) {
    return {...base, summary: 'Nutrition facts not available.', status: 'insufficient_information', level: 'info', findings: []};
  }
  const source = {name: SOURCE_LABELS[p.source]};
  const serving = p.nutrition.servingSize;
  const per = serving ? `per serving (${serving})` : 'per serving';
  const findings: Finding[] = [];

  if (prefs.addedSugar.enabled) {
    const g = perServing(p, 'addedSugars');
    const limit = prefs.addedSugar.limitPerServingG;
    if (g === undefined) {
      findings.push({id: 'nutrition-sugar-unknown', level: 'info', title: 'Added sugar not reported per serving', source});
    } else if (g > limit) {
      findings.push({id: 'nutrition-sugar-over', level: 'caution', title: `Added sugar ${round(g, 1)} g ${per}`, detail: `Above your ${limit} g limit.`, source});
    } else {
      findings.push({id: 'nutrition-sugar-ok', level: 'ok', title: `Added sugar ${round(g, 1)} g ${per}`, detail: `Within your ${limit} g limit.`, source});
    }
  }

  if (prefs.sodium.enabled) {
    const g = perServing(p, 'sodium');
    const limit = prefs.sodium.limitPerServingMg;
    if (g === undefined) {
      findings.push({id: 'nutrition-sodium-unknown', level: 'info', title: 'Sodium not reported per serving', source});
    } else {
      const mg = round(g * 1000);
      findings.push(
        mg > limit
          ? {id: 'nutrition-sodium-over', level: 'caution', title: `Sodium ${mg} mg ${per}`, detail: `Above your ${limit} mg limit.`, source}
          : {id: 'nutrition-sodium-ok', level: 'ok', title: `Sodium ${mg} mg ${per}`, detail: `Within your ${limit} mg limit.`, source},
      );
    }
  }

  // Overview (always): label values per 100 g, plus per serving when known.
  const n100 = p.nutrition.per100;
  const overview: string[] = [];
  if (n100.energyKcal !== undefined) {
    overview.push(`${round(n100.energyKcal)} kcal`);
  }
  if (n100.sugars !== undefined) {
    overview.push(`sugars ${round(n100.sugars, 1)} g`);
  }
  if (n100.fiber !== undefined) {
    overview.push(`fiber ${round(n100.fiber, 1)} g`);
  }
  if (n100.proteins !== undefined) {
    overview.push(`protein ${round(n100.proteins, 1)} g`);
  }
  if (n100.sodium !== undefined) {
    overview.push(`sodium ${round(n100.sodium * 1000)} mg`);
  }
  if (overview.length) {
    findings.push({id: 'nutrition-overview', level: 'info', title: `Per 100 g: ${overview.join(' · ')}`, source});
  }
  if (p.novaGroup) {
    findings.push({
      id: 'nutrition-nova',
      level: 'info',
      title: `Processing: NOVA group ${p.novaGroup} of 4`,
      detail: 'NOVA groups foods by how much they are processed: 1 = unprocessed or minimally processed, 4 = ultra-processed.',
      source: {name: 'Open Food Facts (NOVA)'},
    });
  }

  const over = findings.filter(f => f.level === 'caution');
  return {
    ...base,
    summary: over.length ? over.map(f => f.title).join(' · ') : overview.slice(0, 3).join(' · ') || 'Nutrition facts available',
    status: 'documented',
    level: worstLevel(findings.map(f => f.level)),
    findings,
  };
}
