import {httpClient} from './http';
import {LOOKUP_URL} from '../constants/config';
import {ProductRecord, ProductSource} from '../types/product';
import {normalize as normalizeOpenFacts, OFFProduct} from './openFoodFacts';
import {EdamamFood, normalize as normalizeEdamam} from './edamam';
import {KrogerCatalogProduct, normalize as normalizeKroger} from './krogerCatalog';

interface LookupResponse {
  found: boolean;
  source: ProductSource | null;
  product: Record<string, unknown> | null;
}

const KNOWN_SOURCES: ProductSource[] = ['openfoodfacts', 'openbeautyfacts', 'openproductsfacts', 'edamam', 'kroger'];

export class LookupUnavailableError extends Error {}

/**
 * Barcode lookup through the AllergyBuster Worker (/lookup), which searches
 * Open Food Facts, Open Beauty Facts, Open Products Facts and Edamam, then
 * Kroger's catalog to at least identify the product.
 *
 * Returns the ProductRecord, or null when no database knows the barcode.
 * Throws LookupUnavailableError when the Worker can't answer, so the caller
 * can fall back to calling the sources directly.
 */
export async function lookupViaWorker(barcode: string): Promise<ProductRecord | null> {
  let data: LookupResponse;
  try {
    const res = await httpClient.get<LookupResponse>(LOOKUP_URL, {
      params: {barcode},
      // OFF + an Edamam fallback can take a few seconds on a cache miss.
      timeout: 15000,
    });
    data = res.data;
  } catch (err) {
    throw new LookupUnavailableError(err instanceof Error ? err.message : 'lookup failed');
  }

  if (!data || typeof data.found !== 'boolean') {
    throw new LookupUnavailableError('unexpected lookup response');
  }
  if (!data.found || !data.product) {
    return null;
  }
  if (!data.source || !KNOWN_SOURCES.includes(data.source)) {
    // A newer Worker source this app version doesn't know: use the direct path.
    throw new LookupUnavailableError(`unknown source ${data.source}`);
  }

  if (data.source === 'kroger') {
    return normalizeKroger(data.product as unknown as KrogerCatalogProduct, barcode);
  }
  if (data.source === 'edamam') {
    return normalizeEdamam(data.product as unknown as EdamamFood, barcode);
  }
  return normalizeOpenFacts(data.product as OFFProduct, barcode, data.source);
}
