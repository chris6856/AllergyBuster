/**
 * Keyword matching for allergen detection.
 *
 * Plain substring matching causes false positives for very short keywords:
 * "til" (sesame) matches "tortilla", "lentils" and "distilled"; "oat" matches
 * "coat" and "goat". Keywords of 3 characters or fewer therefore require a
 * word boundary before them ("oats", "oatmeal" still match), and "til" also
 * needs one after it. Longer keywords keep substring matching so compound
 * words like "buttermilk" or "milkfat" are still caught.
 */
const BOTH_BOUNDARIES = new Set(['til']);

/**
 * Contexts in which a keyword occurrence does NOT indicate the allergen.
 * "butter" (Milk) is excluded when it is a plant/fruit butter (peanut butter,
 * cocoa butter, shea butter, apple butter…) or part of "butternut"/"butterfly".
 * Other allergens in the same phrase are still caught by their own keywords
 * (e.g. "peanut butter" → Peanuts). A keyword matches if ANY occurrence is
 * outside an excluded context, so "butter, peanut butter" still flags Milk.
 */
const CONTEXT_EXCLUSIONS: Record<string, {before?: RegExp; after?: RegExp}> = {
  butter: {
    before:
      /(?:peanut|nut|almond|cashew|hazelnut|pistachio|macadamia|pecan|walnut|cocoa|cacao|shea|apple|apricot|plum|pear|fruit|pumpkin|pumpkin seed|sunflower|sunflower seed|seed|soy|soya|soynut|coconut|mango|kokum|murumuru|cupuacu|illipe|sal|body|tahini|sesame)[\s-]*$/,
    after: /^(?:nut|fly|head|bur|cup lettuce|leaf lettuce|bean)/,
  },
};

const cache = new Map<string, RegExp | null>();

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patternFor(keyword: string): RegExp | null {
  const cached = cache.get(keyword);
  if (cached !== undefined) {
    return cached;
  }
  let re: RegExp | null = null;
  if (keyword.length <= 3) {
    const tail = BOTH_BOUNDARIES.has(keyword) ? '(?![a-z0-9])' : '';
    re = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(keyword)}${tail}`);
  }
  cache.set(keyword, re);
  return re;
}

/** `text` must already be lowercased. */
export function containsKeyword(text: string, keyword: string): boolean {
  const exclusion = CONTEXT_EXCLUSIONS[keyword];
  if (exclusion) {
    return hasUnexcludedOccurrence(text, keyword, exclusion);
  }
  const re = patternFor(keyword);
  return re ? re.test(text) : text.includes(keyword);
}

function hasUnexcludedOccurrence(
  text: string,
  keyword: string,
  exclusion: {before?: RegExp; after?: RegExp},
): boolean {
  let idx = text.indexOf(keyword);
  while (idx !== -1) {
    const before = text.slice(Math.max(0, idx - 25), idx);
    const after = text.slice(idx + keyword.length, idx + keyword.length + 20);
    const excluded =
      (exclusion.before?.test(before) ?? false) || (exclusion.after?.test(after) ?? false);
    if (!excluded) {
      return true;
    }
    idx = text.indexOf(keyword, idx + keyword.length);
  }
  return false;
}

export function containsAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some(kw => containsKeyword(text, kw));
}
