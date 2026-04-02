import {offClient} from './http';
import {NormalizedProduct} from '../types/product';
import {parseAllergens} from '../utils/allergenParser';

const FIELDS = 'product_name,brands,allergens_tags,traces_tags,ingredients_text,image_url';

interface OFFProduct {
  product_name?: string;
  brands?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  ingredients_text?: string;
  image_url?: string;
}

interface OFFBarcodeResponse {
  status: number; // 1 = found, 0 = not found
  product?: OFFProduct;
}

interface OFFSearchResponse {
  count: number;
  products: (OFFProduct & {_id?: string; id?: string})[];
}

function normalize(raw: OFFProduct, id: string): NormalizedProduct {
  const ingredientsText = raw.ingredients_text ?? '';
  return {
    id,
    name: raw.product_name ?? 'Unknown Product',
    brand: raw.brands ?? '',
    imageUrl: raw.image_url,
    allergens: parseAllergens(
      raw.allergens_tags ?? [],
      raw.traces_tags ?? [],
      ingredientsText,
    ),
    ingredientsText,
    source: 'openfoodfacts',
  };
}

export async function getProductByBarcode(barcode: string): Promise<NormalizedProduct | null> {
  const response = await offClient.get<OFFBarcodeResponse>(
    `/api/v2/product/${barcode}.json`,
    {params: {fields: FIELDS}},
  );

  if (response.data.status !== 1 || !response.data.product) {
    return null;
  }

  return normalize(response.data.product, barcode);
}

export async function searchProducts(query: string): Promise<NormalizedProduct[]> {
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
    normalize(p, p._id ?? p.id ?? query),
  );
}
