import {ProductRecord} from '../types/product';
import {Preferences} from '../types/preferences';
import {analyzeAdditives} from './additives';
import {analyzeAllergy} from './allergy';
import {analyzeFragrance} from './fragrance';
import {analyzeNutrition} from './nutrition';
import {analyzePackaging} from './packaging';
import {InsightSection, ProductAnalysis} from './types';
import {analyzeWarnings} from './warnings';

export * from './types';

/**
 * Analyses a product for the Product Insights screen. Which sections appear
 * depends on the product category and the user's preferences; the Allergy
 * Check is always first for food. Section order after that puts anything
 * that needs attention first.
 */
export function analyzeProduct(
  p: ProductRecord,
  profileKeys: string[],
  prefs: Preferences,
  opts: {labelText?: string} = {},
): ProductAnalysis {
  const sections: InsightSection[] = [];
  const allergy = analyzeAllergy(p, profileKeys);

  switch (p.category) {
    case 'food':
      sections.push(allergy);
      if (prefs.additives) {
        sections.push(analyzeAdditives(p));
      }
      sections.push(analyzeNutrition(p, prefs));
      if (prefs.packaging) {
        sections.push(analyzePackaging(p));
      }
      break;

    case 'personal_care':
      // Cosmetics can contain food allergens (almond oil, wheat protein, milk).
      sections.push(allergy, analyzeFragrance(p, prefs.fragrance));
      if (prefs.packaging) {
        sections.push(analyzePackaging(p));
      }
      break;

    case 'household':
      sections.push(
        analyzeWarnings(opts.labelText ?? p.ingredientsText, opts.labelText ? 'label photo' : 'database'),
        analyzeFragrance(p, prefs.fragrance),
      );
      // Allergen check only when something was detected (e.g. nut oils).
      if (p.allergens.declared.length || p.allergens.traces.length) {
        sections.push(allergy);
      }
      if (prefs.packaging) {
        sections.push(analyzePackaging(p));
      }
      break;

    default:
      sections.push(allergy);
      if (prefs.packaging) {
        sections.push(analyzePackaging(p));
      }
  }

  // Keep the first section fixed (allergy for food/personal care, warnings for
  // household); order the rest by level so concerns come before info.
  const [first, ...rest] = sections;
  const rank = {alert: 0, caution: 1, info: 2, ok: 3};
  rest.sort((a, b) => rank[a.level] - rank[b.level]);
  return {sections: [first, ...rest]};
}
