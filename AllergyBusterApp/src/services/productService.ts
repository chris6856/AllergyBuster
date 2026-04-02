import * as openFoodFacts from './openFoodFacts';
import * as edamam from './edamam';
import {NormalizedProduct} from '../types/product';

/**
 * Look up a product by barcode.
 * Tries Open Food Facts first; falls back to Edamam if not found or on error.
 * Returns null if neither source has the product.
 */
export async function getProductByBarcode(barcode: string): Promise<NormalizedProduct | null> {
  try {
    const offResult = await openFoodFacts.getProductByBarcode(barcode);
    if (offResult) {
      // If OFF found the product but has no allergen data, still try Edamam
      const hasAllergenData =
        offResult.allergens.declared.length > 0 ||
        offResult.allergens.traces.length > 0 ||
        offResult.ingredientsText.length > 0;

      if (hasAllergenData) {
        return offResult;
      }
    }
  } catch {
    // OFF failed — fall through to Edamam
  }

  try {
    return await edamam.getProductByBarcode(barcode);
  } catch {
    return null;
  }
}

/**
 * Search for products by name, brand, or ingredient.
 * Tries Open Food Facts first; falls back to Edamam if 0 results or on error.
 * Returns empty array if neither source returns results.
 */
export async function searchProducts(query: string): Promise<NormalizedProduct[]> {
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
