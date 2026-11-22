import {ProductCategory, ProductRecord} from '../types/product';
import {toGtin13} from '../utils/productRecord';

/** Kroger catalog record as shaped by the Worker (worker/src/kroger.ts shapeProduct). */
export interface KrogerCatalogProduct {
  productId: string;
  upc?: string;
  brand?: string;
  description?: string;
  categories?: string[];
  imageUrl?: string | null;
  size?: string | null;
}

// Kroger department names, e.g. "Cleaning Products", "Personal Care",
// "Health", "Beauty", "Breakfast", "Dairy", "Pet Care".
const HOUSEHOLD_RE = /clean|laundry|household|paper|kitchen|home|air care|pest|trash|dish/i;
const PERSONAL_CARE_RE = /personal care|beauty|health|baby care|bath|hair|skin|oral|shav|cosmetic|deodorant/i;
const OTHER_RE = /pet|electronic|toy|office|automotive|garden|hardware/i;

export function krogerCategory(categories: string[]): ProductCategory {
  const all = categories.join(' | ');
  if (HOUSEHOLD_RE.test(all)) {
    return 'household';
  }
  if (PERSONAL_CARE_RE.test(all)) {
    return 'personal_care';
  }
  if (OTHER_RE.test(all)) {
    return 'other';
  }
  return categories.length ? 'food' : 'other';
}

/**
 * Kroger identifies the product (name, brand, photo, department) but has no
 * ingredient list, so the record is "recognised, no ingredient data": the
 * app never presents it as allergen-free.
 */
export function normalize(raw: KrogerCatalogProduct, barcode: string): ProductRecord {
  const name = [raw.description, raw.size].filter(Boolean).join(' ').trim() || 'Unknown Product';
  return {
    id: raw.productId,
    name,
    brand: raw.brand ?? '',
    imageUrl: raw.imageUrl ?? undefined,
    allergens: {declared: [], traces: []},
    ingredientsText: '',
    source: 'kroger',
    // The scanned barcode, not Kroger's ID (Kroger drops the check digit),
    // so saved products match future scans.
    gtin: toGtin13(barcode),
    category: krogerCategory(raw.categories ?? []),
    categoryTags: (raw.categories ?? []).map(c => `kroger:${c.toLowerCase().replace(/\s+/g, '-')}`),
    additives: [],
    labels: [],
    ingredientsAnalysis: [],
    novaGroup: null,
    packaging: [],
    nutrition: null,
    completeness: {hasIngredients: false, hasAllergenTags: false, hasNutrition: false, hasPackaging: false, sourceScore: null},
    sourceUpdatedAt: null,
    fetchedAt: new Date().toISOString(),
  };
}
