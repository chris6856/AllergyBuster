import {ProductRecord, SOURCE_LABELS} from '../types/product';
import {Finding, FindingLevel, InsightSection} from './types';

/**
 * The original 26 fragrance substances the EU requires to be named on
 * cosmetic labels above set concentrations (Regulation (EC) No 1223/2009,
 * Annex III). Regulation (EU) 2023/1545 extends the list; the extended set
 * comes with the CosIng import in M8. Matched by INCI name plus synonyms.
 */
export const EU_FRAGRANCE_ALLERGENS: {inci: string; also?: string[]}[] = [
  {inci: 'amyl cinnamal'},
  {inci: 'amylcinnamyl alcohol'},
  {inci: 'anise alcohol', also: ['anisyl alcohol']},
  {inci: 'benzyl alcohol'},
  {inci: 'benzyl benzoate'},
  {inci: 'benzyl cinnamate'},
  {inci: 'benzyl salicylate'},
  {inci: 'cinnamal'},
  {inci: 'cinnamyl alcohol'},
  {inci: 'citral'},
  {inci: 'citronellol'},
  {inci: 'coumarin'},
  {inci: 'eugenol'},
  {inci: 'farnesol'},
  {inci: 'geraniol'},
  {inci: 'hexyl cinnamal'},
  {inci: 'hydroxycitronellal'},
  {inci: 'hydroxyisohexyl 3-cyclohexene carboxaldehyde'},
  {inci: 'isoeugenol'},
  {inci: 'butylphenyl methylpropional'},
  {inci: 'limonene'},
  {inci: 'linalool'},
  {inci: 'methyl 2-octynoate'},
  {inci: 'alpha-isomethyl ionone'},
  {inci: 'evernia prunastri extract', also: ['oak moss extract', 'oakmoss extract']},
  {inci: 'evernia furfuracea extract', also: ['tree moss extract', 'treemoss extract']},
];

const EU_SOURCE = {
  name: 'EU Cosmetics Regulation (EC) 1223/2009, Annex III',
  url: 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj',
};

// "parfum"/"fragrance"/"perfume" as INCI terms. "aroma" is excluded: in
// cosmetics it usually means flavor (toothpaste, lip balm).
const FRAGRANCE_TERMS = /(^|[^a-z])(fragrance|parfum|perfume)s?([^a-z]|$)/;

function phraseRegex(phrase: string): RegExp {
  const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${esc}(?=[^a-z]|$)`, 'g');
}

/**
 * Longest names are matched first and blanked out, so "cinnamal" isn't
 * reported because of "hexyl cinnamal" or "amyl cinnamal".
 */
function findListedAllergens(text: string): typeof EU_FRAGRANCE_ALLERGENS {
  const names = EU_FRAGRANCE_ALLERGENS.flatMap(a => [a.inci, ...(a.also ?? [])].map(n => ({n, a})));
  names.sort((x, y) => y.n.length - x.n.length);
  let remaining = text;
  const found = new Set<(typeof EU_FRAGRANCE_ALLERGENS)[number]>();
  for (const {n, a} of names) {
    const re = phraseRegex(n);
    if (re.test(remaining)) {
      found.add(a);
      remaining = remaining.replace(phraseRegex(n), m => ' '.repeat(m.length));
    }
  }
  return EU_FRAGRANCE_ALLERGENS.filter(a => found.has(a)).sort((x, y) => x.inci.localeCompare(y.inci));
}

/**
 * Fragrance in personal care and household products: undisclosed
 * "fragrance/parfum" and the EU-listed fragrance allergens by name.
 * Emphasis depends on the user's fragrance preference.
 */
export function analyzeFragrance(p: ProductRecord, highlight: boolean): InsightSection {
  const base = {id: 'fragrance' as const, title: 'Fragrance'};
  const text = p.ingredientsText.toLowerCase();
  if (!text) {
    return {...base, summary: 'No ingredient list to check.', status: 'insufficient_information', level: 'info', findings: []};
  }
  const level: FindingLevel = highlight ? 'caution' : 'info';
  const findings: Finding[] = [];

  if (FRAGRANCE_TERMS.test(text)) {
    findings.push({
      id: 'fragrance-term',
      level,
      title: 'Contains fragrance (parfum)',
      detail: "\"Fragrance\" or \"parfum\" can be a mixture of many substances that labels don't have to list individually.",
      source: {name: SOURCE_LABELS[p.source]},
    });
  }
  const listed = findListedAllergens(text);
  if (listed.length) {
    findings.push({
      id: 'fragrance-eu-allergens',
      level,
      title: `EU-listed fragrance allergen${listed.length === 1 ? '' : 's'}: ${listed.map(a => a.inci).join(', ')}`,
      detail: 'The EU requires these to be named because they can cause skin reactions in sensitized people.',
      source: EU_SOURCE,
    });
  }

  return {
    ...base,
    summary: findings.length
      ? findings.map(f => f.title).join(' · ')
      : 'No fragrance or EU-listed fragrance allergens in the ingredient list',
    status: findings.length ? 'documented' : 'reviewed_no_concern',
    level: findings.length ? level : 'ok',
    findings,
  };
}
