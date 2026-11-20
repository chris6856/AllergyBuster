/**
 * "My Product Preferences": which categories AllergyBuster highlights.
 * These drive personalised explanations, not medical advice or scores.
 * Allergens live in the allergy profile (types/profile.ts).
 */
export interface Preferences {
  /** Explain preservatives, colours, emulsifiers and other additives. */
  additives: boolean;
  /** Flag products above this added sugar per serving (g). */
  addedSugar: {enabled: boolean; limitPerServingG: number};
  /** Flag products above this sodium per serving (mg). */
  sodium: {enabled: boolean; limitPerServingMg: number};
  /** Show packaging materials and PFAS evidence / data gaps. */
  packaging: boolean;
  /** Highlight fragrance disclosures in personal care and household products. */
  fragrance: boolean;
}

// Defaults follow the 2.0 concept: additives + packaging on; sugar, sodium,
// fragrance opt-in. Default limits = FDA's "high" level (20% of the Daily
// Value per serving): added sugar 20% × 50 g = 10 g; sodium 20% × 2,300 mg =
// 460 mg. Users can change them.
export const DEFAULT_PREFERENCES: Preferences = {
  additives: true,
  addedSugar: {enabled: false, limitPerServingG: 10},
  sodium: {enabled: false, limitPerServingMg: 460},
  packaging: true,
  fragrance: false,
};
