export interface AllergenInfo {
  declared: string[];   // Confirmed allergens (from allergens_tags or ingredient parsing)
  traces: string[];     // May contain / cross-contamination warnings
}

export interface Ingredient {
  text: string;
  id?: string;
}

export type ProductSource = 'openfoodfacts' | 'openbeautyfacts' | 'openproductsfacts' | 'edamam';

export const SOURCE_LABELS: Record<ProductSource, string> = {
  openfoodfacts: 'Open Food Facts',
  openbeautyfacts: 'Open Beauty Facts',
  openproductsfacts: 'Open Products Facts',
  edamam: 'Edamam',
};

/** 1.x product shape. Every ProductRecord is also a NormalizedProduct. */
export interface NormalizedProduct {
  id: string;
  name: string;
  brand: string;
  imageUrl?: string;
  allergens: AllergenInfo;
  ingredientsText: string;
  source: ProductSource;
}

// ── 2.0 product record ──────────────────────────────────────────────────────

export type ProductCategory = 'food' | 'personal_care' | 'household' | 'other';

/** Grams, except energyKcal (kcal). Undefined = not reported by the source. */
export interface Nutrients {
  energyKcal?: number;
  fat?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  carbohydrates?: number;
  sugars?: number;
  addedSugars?: number;
  fiber?: number;
  proteins?: number;
  salt?: number;
  sodium?: number;
}

export interface NutritionFacts {
  per100: Nutrients;            // per 100 g (or 100 ml for drinks)
  perServing: Nutrients | null;
  servingSize: string | null;   // as printed, e.g. "1 ½ cup (39 g)"
  servingGrams: number | null;
}

/** What the source actually provided, so the UI never presents missing data as "nothing found". */
export interface DataCompleteness {
  hasIngredients: boolean;
  hasAllergenTags: boolean;
  hasNutrition: boolean;
  hasPackaging: boolean;
  /** Source's own completeness score 0–1, when it has one (OFF). */
  sourceScore: number | null;
}

export interface ProductRecord extends NormalizedProduct {
  /** Barcode as a 13-digit GTIN (zero-padded), or null when unknown (e.g. Edamam text search). */
  gtin: string | null;
  category: ProductCategory;
  categoryTags: string[];       // e.g. "en:breakfast-cereals"
  additives: string[];          // e.g. "en:e322"
  labels: string[];             // e.g. "en:organic", "en:no-gluten" (manufacturer claims)
  ingredientsAnalysis: string[];// e.g. "en:palm-oil-free", "en:vegan-status-unknown"
  novaGroup: 1 | 2 | 3 | 4 | null;
  packaging: string[];          // shapes + materials, e.g. "en:card-carton", "en:cardboard"
  nutrition: NutritionFacts | null;
  completeness: DataCompleteness;
  /** When the source last changed this record (ISO), if known. */
  sourceUpdatedAt: string | null;
  /** When AllergyBuster fetched it (ISO). */
  fetchedAt: string;
}
