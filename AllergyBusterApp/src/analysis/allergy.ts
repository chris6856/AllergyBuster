import {ProductRecord, SOURCE_LABELS} from '../types/product';
import {matchProfile, profileLabel} from '../utils/allergenMatching';
import {Finding, InsightSection, worstLevel} from './types';

/** Allergy Check. Always first; reuses the 1.x allergen detection unchanged. */
export function analyzeAllergy(p: ProductRecord, profileKeys: string[]): InsightSection {
  const source = {name: SOURCE_LABELS[p.source]};
  const hasData = p.completeness.hasIngredients || p.completeness.hasAllergenTags;
  const {declared, traces} = p.allergens;

  if (!hasData && declared.length === 0 && traces.length === 0) {
    return {
      id: 'allergy',
      title: 'Allergy Check',
      summary: 'No ingredient information. Check the package label.',
      status: 'insufficient_information',
      level: 'caution',
      findings: [{
        id: 'allergy-no-data',
        level: 'caution',
        title: 'No ingredient or allergen information',
        detail: "This product's listing has no ingredients, so allergens can't be checked. Read the label, or photograph the ingredient list with Scan Label.",
      }],
    };
  }

  const findings: Finding[] = [];
  if (profileKeys.length > 0) {
    const m = matchProfile(p.allergens, profileKeys);
    if (m.declared.length) {
      findings.push({
        id: 'allergy-mine-declared',
        level: 'alert',
        title: `Contains your allergens: ${m.declared.map(profileLabel).join(', ')}`,
        source,
      });
    }
    if (m.traces.length) {
      findings.push({
        id: 'allergy-mine-traces',
        level: 'caution',
        title: `May contain your allergens: ${m.traces.map(profileLabel).join(', ')}`,
        detail: 'Listed as a "may contain" or shared-facility warning.',
        source,
      });
    }
    if (!m.declared.length && !m.traces.length) {
      findings.push({
        id: 'allergy-mine-none',
        level: 'ok',
        title: 'None of your allergens listed',
        detail: 'Based on the available listing. Always check the package label.',
        source,
      });
    }
  }
  if (declared.length) {
    findings.push({id: 'allergy-declared', level: profileKeys.length ? 'info' : 'caution', title: `Contains: ${declared.join(', ')}`, source});
  }
  if (traces.length) {
    findings.push({id: 'allergy-traces', level: 'info', title: `May contain: ${traces.join(', ')}`, source});
  }
  if (!profileKeys.length && !declared.length && !traces.length) {
    findings.push({id: 'allergy-none', level: 'ok', title: 'No major allergens listed', detail: 'Always check the package label.', source});
  }

  const level = worstLevel(findings.map(f => f.level));
  const mineDeclared = findings.find(f => f.id === 'allergy-mine-declared');
  const mineTraces = findings.find(f => f.id === 'allergy-mine-traces');
  return {
    id: 'allergy',
    title: 'Allergy Check',
    summary: mineDeclared?.title ?? mineTraces?.title ?? findings[0]?.title ?? '',
    status: declared.length || traces.length ? 'documented' : 'reviewed_no_concern',
    level,
    findings,
  };
}
