import {Finding, FindingLevel, InsightSection} from './types';

/**
 * Label warnings for household products: signal words and hazard statements
 * printed on the package (US EPA/CPSC signal words; GHS-style statements).
 * Works on whatever text we have: the database ingredient field, or OCR text
 * from the user's label photo.
 */
const PATTERNS: {id: string; re: RegExp; level: FindingLevel; title: string}[] = [
  {id: 'danger', re: /\bdanger\b/, level: 'alert', title: 'Label says DANGER'},
  {id: 'poison', re: /\bpoison\b/, level: 'alert', title: 'Label says POISON'},
  {id: 'corrosive', re: /\bcorrosive\b|causes (severe )?(skin )?burns/, level: 'alert', title: 'Corrosive / can cause burns'},
  {id: 'fatal', re: /\bfatal if (swallowed|inhaled)\b/, level: 'alert', title: 'Fatal if swallowed or inhaled'},
  {id: 'warning', re: /\bwarning\b/, level: 'caution', title: 'Label says WARNING'},
  {id: 'harmful', re: /harmful if (swallowed|inhaled|absorbed)/, level: 'caution', title: 'Harmful if swallowed, inhaled or absorbed'},
  {id: 'eye', re: /(serious )?eye (damage|irritation)/, level: 'caution', title: 'Eye damage or irritation warning'},
  {id: 'skin', re: /skin (irritation|sensiti[sz]ation)|allergic skin reaction/, level: 'caution', title: 'Skin irritation or allergic reaction warning'},
  {id: 'mix', re: /do not mix|never mix/, level: 'caution', title: 'Do-not-mix warning (e.g. with bleach or ammonia)'},
  {id: 'caution', re: /\bcaution\b/, level: 'info', title: 'Label says CAUTION'},
  {id: 'children', re: /keep out of (the )?reach of children/, level: 'info', title: 'Keep out of reach of children'},
];

export function analyzeWarnings(text: string, origin: 'database' | 'label photo'): InsightSection {
  const base = {id: 'warnings' as const, title: 'Label Warnings'};
  const lower = text.toLowerCase();
  if (!lower.trim()) {
    return {
      ...base,
      summary: 'No label text available. Photograph the label to check its warnings.',
      status: 'insufficient_information',
      level: 'info',
      findings: [],
    };
  }
  const findings: Finding[] = PATTERNS.filter(p => p.re.test(lower)).map(p => ({
    id: `warning-${p.id}`,
    level: p.level,
    title: p.title,
    source: {name: origin === 'label photo' ? 'Your label photo' : 'Product listing'},
  }));
  const order: FindingLevel[] = ['alert', 'caution', 'info', 'ok'];
  findings.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));

  return {
    ...base,
    summary: findings.length ? findings.slice(0, 2).map(f => f.title).join(' · ') : 'No warning statements found in the available text',
    // Listing text rarely includes the warning panel, so "nothing found" in
    // database text is not a clean bill: only a label photo can show that.
    status: findings.length ? 'documented' : origin === 'label photo' ? 'reviewed_no_concern' : 'insufficient_information',
    level: findings[0]?.level ?? 'info',
    findings,
  };
}
