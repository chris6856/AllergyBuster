import {
  ALLERGEN_KEYWORDS,
  ALLERGEN_NAME_ALIASES,
  PROFILE_ALLERGEN_OPTIONS,
} from '../constants/allergens';
import {AllergenInfo} from '../types/product';
import {extractAllergensFromText} from './allergenParser';

/**
 * Maps a detected allergen display name (e.g. "Almonds", "Soybeans", "Milk")
 * to the canonical profile keys it belongs to (e.g. ["Tree Nuts"]).
 */
export function canonicalAllergenKeys(name: string): string[] {
  const trimmed = name.trim();
  if (ALLERGEN_KEYWORDS[trimmed]) {
    return [trimmed];
  }
  const alias = ALLERGEN_NAME_ALIASES[trimmed];
  if (alias) {
    return [alias];
  }
  // Unmapped names (e.g. "Brazil Nuts" from an OFF tag): keyword-scan the name.
  return extractAllergensFromText(trimmed);
}

export function isProfileAllergen(name: string, profileKeys: string[]): boolean {
  if (profileKeys.length === 0) {
    return false;
  }
  return canonicalAllergenKeys(name).some(k => profileKeys.includes(k));
}

export interface ProfileMatch {
  /** Profile keys declared in the product. */
  declared: string[];
  /** Profile keys only listed as "may contain" (not also declared). */
  traces: string[];
}

export function matchProfile(allergens: AllergenInfo, profileKeys: string[]): ProfileMatch {
  const toKeys = (names: string[]) => {
    const keys = new Set<string>();
    for (const n of names) {
      for (const k of canonicalAllergenKeys(n)) {
        if (profileKeys.includes(k)) {
          keys.add(k);
        }
      }
    }
    return keys;
  };
  const declared = toKeys(allergens.declared);
  const traces = toKeys(allergens.traces);
  for (const k of declared) {
    traces.delete(k);
  }
  return {
    declared: sortByProfileOrder([...declared]),
    traces: sortByProfileOrder([...traces]),
  };
}

const ORDER = PROFILE_ALLERGEN_OPTIONS.map(o => o.key);

export function sortByProfileOrder(keys: string[]): string[] {
  return [...keys].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
}

export function profileLabel(key: string): string {
  return PROFILE_ALLERGEN_OPTIONS.find(o => o.key === key)?.label ?? key;
}
