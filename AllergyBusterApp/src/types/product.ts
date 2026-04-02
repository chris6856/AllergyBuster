export interface AllergenInfo {
  declared: string[];   // Confirmed allergens (from allergens_tags or ingredient parsing)
  traces: string[];     // May contain / cross-contamination warnings
}

export interface Ingredient {
  text: string;
  id?: string;
}

export interface NormalizedProduct {
  id: string;
  name: string;
  brand: string;
  imageUrl?: string;
  allergens: AllergenInfo;
  ingredientsText: string;
  source: 'openfoodfacts' | 'edamam';
}
