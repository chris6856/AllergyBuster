import {offClient} from './http';
import {ProductRecord, ProductSource} from '../types/product';

export type OpenFactsSource = Exclude<ProductSource, 'edamam'>;
import {parseAllergens} from '../utils/allergenParser';
import {
  cleanIngredientsText,
  inferCategory,
  offNutrients,
  parseNovaGroup,
  toGtin13,
  unixToIso,
} from '../utils/productRecord';

// Keep in sync with OFF_FIELDS in worker/src/lookup.ts.
const FIELDS = [
  'code',
  'product_name',
  'brands',
  'image_url',
  'product_type',
  'allergens_tags',
  'traces_tags',
  'ingredients_text',
  'ingredients_analysis_tags',
  'additives_tags',
  'categories_tags',
  'labels_tags',
  'nova_group',
  'packaging_tags',
  'packaging_materials_tags',
  'nutriments',
  'serving_size',
  'serving_quantity',
  'completeness',
  'last_modified_t',
].join(',');

export interface OFFProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  image_url?: string;
  product_type?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  ingredients_text?: string;
  ingredients_analysis_tags?: string[];
  additives_tags?: string[];
  categories_tags?: string[];
  labels_tags?: string[];
  nova_group?: number | string;
  packaging_tags?: string[];
  packaging_materials_tags?: string[];
  nutriments?: Record<string, unknown>;
  serving_size?: string;
  serving_quantity?: number | string;
  completeness?: number;
  last_modified_t?: number;
}

interface OFFBarcodeResponse {
  status: number; // 1 = found, 0 = not found
  product?: OFFProduct;
}

interface OFFSearchResponse {
  count: number;
  products: (OFFProduct & {_id?: string; id?: string})[];
}

const unique = (xs: string[]) => [...new Set(xs.filter(x => x.trim().length > 0))];

/**
 * Maps an Open Food Facts–family record (OFF, Open Beauty Facts and Open
 * Products Facts share one schema) to a ProductRecord.
 */
export function normalize(
  raw: OFFProduct,
  id: string,
  source: OpenFactsSource = 'openfoodfacts',
): ProductRecord {
  const ingredientsText = cleanIngredientsText(raw.ingredients_text);
  const allergenTags = raw.allergens_tags ?? [];
  const tracesTags = raw.traces_tags ?? [];
  const categoryTags = raw.categories_tags ?? [];
  const packaging = unique([...(raw.packaging_tags ?? []), ...(raw.packaging_materials_tags ?? [])]);

  const nutriments = raw.nutriments ?? {};
  const per100 = offNutrients(nutriments, '_100g');
  const perServing = offNutrients(nutriments, '_serving');
  const servingGrams = Number(raw.serving_quantity);

  return {
    id,
    name: raw.product_name?.trim() || 'Unknown Product',
    brand: raw.brands ?? '',
    imageUrl: raw.image_url,
    allergens: parseAllergens(allergenTags, tracesTags, ingredientsText),
    ingredientsText,
    source,

    gtin: toGtin13(raw.code ?? id),
    category: inferCategory(raw.product_type, categoryTags),
    categoryTags,
    additives: unique(raw.additives_tags ?? []),
    labels: unique(raw.labels_tags ?? []),
    ingredientsAnalysis: unique(raw.ingredients_analysis_tags ?? []),
    novaGroup: parseNovaGroup(raw.nova_group),
    packaging,
    nutrition: per100
      ? {
          per100,
          perServing,
          servingSize: raw.serving_size ?? null,
          servingGrams: Number.isFinite(servingGrams) && servingGrams > 0 ? servingGrams : null,
        }
      : null,
    completeness: {
      hasIngredients: ingredientsText.length > 0,
      hasAllergenTags: allergenTags.length > 0 || tracesTags.length > 0,
      hasNutrition: per100 !== null,
      hasPackaging: packaging.length > 0,
      sourceScore: typeof raw.completeness === 'number' ? raw.completeness : null,
    },
    sourceUpdatedAt: unixToIso(raw.last_modified_t),
    fetchedAt: new Date().toISOString(),
  };
}

export async function getProductByBarcode(barcode: string): Promise<ProductRecord | null> {
  const response = await offClient.get<OFFBarcodeResponse>(
    `/api/v2/product/${barcode}.json`,
    {params: {fields: FIELDS}},
  );

  if (response.data.status !== 1 || !response.data.product) {
    return null;
  }

  return normalize(response.data.product, barcode);
}

export async function searchProducts(query: string): Promise<ProductRecord[]> {
  const response = await offClient.get<OFFSearchResponse>('/cgi/search.pl', {
    params: {
      search_terms: query,
      search_simple: 1,
      action: 'process',
      json: 1,
      page_size: 20,
      fields: FIELDS,
    },
  });

  if (!response.data.products?.length) {
    return [];
  }

  return response.data.products.map(p =>
    normalize(p, p.code ?? p._id ?? p.id ?? query),
  );
}
