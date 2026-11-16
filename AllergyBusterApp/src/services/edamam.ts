import {edamamClient} from './http';
import {ProductRecord} from '../types/product';
import {EDAMAM_APP_ID, EDAMAM_APP_KEY} from '../constants/config';
import {extractAllergensFromText} from '../utils/allergenParser';
import {cleanIngredientsText, edamamNutrients, toGtin13} from '../utils/productRecord';

interface EdamamFood {
  foodId: string;
  label?: string;
  brand?: string;
  image?: string;
  category?: string; // "Packaged foods", "Generic foods", ...
  nutrients?: Record<string, unknown>;
  /** Ingredient list for packaged foods. (Edamam has no `ingredientsText` field.) */
  foodContentsLabel?: string;
  knownAs?: string;
}

interface EdamamHint {
  food: EdamamFood;
}

interface EdamamResponse {
  hints: EdamamHint[];
}

export function normalize(food: EdamamFood, barcode?: string): ProductRecord {
  // Only the real ingredient list is scanned. Scanning `knownAs` (the product
  // name) used to produce "no allergens" for products with no ingredient data.
  const ingredientsText = cleanIngredientsText(food.foodContentsLabel);
  // Edamam uses absence-of-allergen health labels, not presence lists, so
  // allergen presence is derived by keyword-scanning the ingredient text.
  const declared = ingredientsText ? extractAllergensFromText(ingredientsText) : [];
  const per100 = edamamNutrients(food.nutrients);

  return {
    id: food.foodId,
    name: food.label ?? 'Unknown Product',
    brand: food.brand ?? '',
    imageUrl: food.image,
    allergens: {declared, traces: []},
    ingredientsText,
    source: 'edamam',

    gtin: toGtin13(barcode),
    category: 'food',
    categoryTags: [],
    additives: [],
    labels: [],
    ingredientsAnalysis: [],
    novaGroup: null,
    packaging: [],
    nutrition: per100 ? {per100, perServing: null, servingSize: null, servingGrams: null} : null,
    completeness: {
      hasIngredients: ingredientsText.length > 0,
      hasAllergenTags: false,
      hasNutrition: per100 !== null,
      hasPackaging: false,
      sourceScore: null,
    },
    sourceUpdatedAt: null,
    fetchedAt: new Date().toISOString(),
  };
}

const authParams = {
  app_id: EDAMAM_APP_ID,
  app_key: EDAMAM_APP_KEY,
};

export async function getProductByBarcode(barcode: string): Promise<ProductRecord | null> {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
    return null;
  }

  const response = await edamamClient.get<EdamamResponse>('/parser', {
    params: {...authParams, upc: barcode},
  });

  const hint = response.data.hints?.[0];
  return hint ? normalize(hint.food, barcode) : null;
}

export async function searchProducts(query: string): Promise<ProductRecord[]> {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
    return [];
  }

  const response = await edamamClient.get<EdamamResponse>('/parser', {
    params: {...authParams, ingr: query},
  });

  return (response.data.hints ?? []).map(h => normalize(h.food));
}
