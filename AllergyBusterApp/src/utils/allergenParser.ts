import {ALLERGEN_TAG_MAP, ALLERGEN_KEYWORDS} from '../constants/allergens';
import {AllergenInfo} from '../types/product';

/**
 * Converts an Open Food Facts tag (e.g. "en:milk") to a display name.
 * Falls back to title-casing the tag suffix if not in the map.
 */
export function tagToDisplayName(tag: string): string {
  if (ALLERGEN_TAG_MAP[tag]) {
    return ALLERGEN_TAG_MAP[tag];
  }
  // Strip language prefix (e.g. "en:") and title-case
  const raw = tag.includes(':') ? tag.split(':')[1] : tag;
  return raw
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Parses OFF allergens_tags and traces_tags arrays into a normalised AllergenInfo.
 * If allergen tags are empty, falls back to keyword-scanning ingredientsText.
 */
export function parseAllergens(
  allergenTags: string[],
  tracesTags: string[],
  ingredientsText: string,
): AllergenInfo {
  let declared = allergenTags
    .filter(tag => tag.trim().length > 0)
    .map(tagToDisplayName)
    .filter((v, i, arr) => arr.indexOf(v) === i); // deduplicate

  const traces = tracesTags
    .filter(tag => tag.trim().length > 0)
    .map(tagToDisplayName)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  // If no structured allergen tags, fall back to ingredient text keyword scan
  if (declared.length === 0 && ingredientsText.length > 0) {
    declared = extractAllergensFromText(ingredientsText);
  }

  return {declared, traces};
}

/**
 * Keyword-scans raw ingredient text to detect allergens.
 * Used as a fallback when structured tags are absent (OFF gaps, OCR results, Edamam).
 */
export function extractAllergensFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const [allergenName, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      found.push(allergenName);
    }
  }

  return found;
}
