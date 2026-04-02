import {edamamClient} from './http';
import {NormalizedProduct} from '../types/product';
import {EDAMAM_APP_ID, EDAMAM_APP_KEY} from '../constants/config';
import {extractAllergensFromText} from '../utils/allergenParser';

interface EdamamFood {
  foodId: string;
  label?: string;
  brand?: string;
  image?: string;
  nutrients?: object;
  ingredientsText?: string;
  knownAs?: string;
}

interface EdamamHint {
  food: EdamamFood;
}

interface EdamamResponse {
  hints: EdamamHint[];
}

function normalize(food: EdamamFood): NormalizedProduct {
  const ingredientsText = food.ingredientsText ?? food.knownAs ?? '';
  // Edamam uses absence-of-allergen health labels, not presence lists.
  // We derive allergen presence by keyword-scanning the ingredient text instead.
  const declared = extractAllergensFromText(ingredientsText);

  return {
    id: food.foodId,
    name: food.label ?? 'Unknown Product',
    brand: food.brand ?? '',
    imageUrl: food.image,
    allergens: {declared, traces: []},
    ingredientsText,
    source: 'edamam',
  };
}

const authParams = {
  app_id: EDAMAM_APP_ID,
  app_key: EDAMAM_APP_KEY,
};

export async function getProductByBarcode(barcode: string): Promise<NormalizedProduct | null> {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
    return null;
  }

  const response = await edamamClient.get<EdamamResponse>('/parser', {
    params: {...authParams, upc: barcode},
  });

  const hint = response.data.hints?.[0];
  return hint ? normalize(hint.food) : null;
}

export async function searchProducts(query: string): Promise<NormalizedProduct[]> {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
    return [];
  }

  const response = await edamamClient.get<EdamamResponse>('/parser', {
    params: {...authParams, ingr: query},
  });

  return (response.data.hints ?? []).map(h => normalize(h.food));
}
