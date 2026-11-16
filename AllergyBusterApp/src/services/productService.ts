import * as openFoodFacts from './openFoodFacts';
import * as edamam from './edamam';
import {ProductRecord} from '../types/product';

/** True when the record has an ingredient list or allergen tags to check. */
export function hasIngredientData(p: ProductRecord): boolean {
  return p.completeness.hasIngredients || p.completeness.hasAllergenTags;
}

/**
 * Look up a product by barcode.
 * Tries Open Food Facts first. If OFF is missing the product or has no
 * ingredient/allergen data, tries Edamam. If Edamam has nothing better, the
 * OFF record is still returned so the user sees the product was recognised;
 * screens show "No Ingredient Information" for it (see hasIngredientData).
 * Returns null only if neither source knows the barcode.
 */
export async function getProductByBarcode(barcode: string): Promise<ProductRecord | null> {
  let offResult: ProductRecord | null = null;
  try {
    offResult = await openFoodFacts.getProductByBarcode(barcode);
    if (offResult && hasIngredientData(offResult)) {
      return offResult;
    }
  } catch {
    // OFF failed — fall through to Edamam
  }

  let edamamResult: ProductRecord | null = null;
  try {
    edamamResult = await edamam.getProductByBarcode(barcode);
  } catch {
    // Edamam failed — use whatever OFF had
  }

  if (edamamResult && hasIngredientData(edamamResult)) {
    return edamamResult;
  }
  // Neither has ingredients: prefer OFF (image, categories, nutrition), else Edamam.
  return offResult ?? edamamResult;
}

/**
 * Search for products by name, brand, or ingredient.
 * Tries Open Food Facts first; falls back to Edamam if 0 results or on error.
 * Returns empty array if neither source returns results.
 */
export async function searchProducts(query: string): Promise<ProductRecord[]> {
  try {
    const offResults = await openFoodFacts.searchProducts(query);
    if (offResults.length > 0) {
      return offResults;
    }
  } catch {
    // OFF failed — fall through to Edamam
  }

  try {
    return await edamam.searchProducts(query);
  } catch {
    return [];
  }
}
