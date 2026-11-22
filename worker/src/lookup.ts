/**
 * Universal barcode lookup.
 *
 *   GET /lookup?barcode=016000275263[&locationId=01400513]
 *
 * One Open Food Facts request with product_type=all. OFF redirects to Open
 * Beauty Facts / Open Products Facts when the barcode belongs to them, and the
 * final URL tells us which database answered. If a FOOD record has no
 * ingredient or allergen data, Edamam is tried (Edamam is food-only). If no
 * database has the barcode, Kroger's catalog is tried to at least identify it.
 *
 * Returns the source's raw record. The app maps it to a ProductRecord with
 * its existing normalisers, so the mapping logic lives in one place.
 *
 *   200 {found: true,  source, product, kroger?}
 *   200 {found: false, source: null, product: null, kroger?}
 *   400 bad barcode · 502 upstream failure (the app then falls back to
 *   calling the sources directly)
 *
 * With locationId, also returns the Kroger match for that store (price,
 * stock, aisle); a Kroger failure never fails the lookup.
 *
 * Secrets: EDAMAM_APP_ID, EDAMAM_APP_KEY (optional: without them, no Edamam fallback)
 */
import {kvGet, kvGetJson, kvPut} from './cache';
import {expandUpcE, findKrogerByUpc, KrogerEnv, KrogerProduct} from './kroger';

export interface LookupEnv extends KrogerEnv {
  EDAMAM_APP_ID?: string;
  EDAMAM_APP_KEY?: string;
}

export type LookupSource = 'openfoodfacts' | 'openbeautyfacts' | 'openproductsfacts' | 'edamam' | 'kroger';

// Keep in sync with FIELDS in AllergyBusterApp/src/services/openFoodFacts.ts.
const OFF_FIELDS = [
  'code', 'product_name', 'brands', 'image_url', 'product_type',
  'allergens_tags', 'traces_tags', 'ingredients_text', 'ingredients_analysis_tags',
  'additives_tags', 'categories_tags', 'labels_tags', 'nova_group',
  'packaging_tags', 'packaging_materials_tags', 'nutriments',
  'serving_size', 'serving_quantity', 'completeness', 'last_modified_t',
].join(',');

const OFF_BASE = 'https://world.openfoodfacts.org';
const EDAMAM_BASE = 'https://api.edamam.com/api/food-database/v2';
const USER_AGENT = 'AllergyBuster/1.2 (Cloudflare Worker; +https://allergybuster.com)';

// v2: adds the Kroger catalog fallback (v1 entries may be stale "not found").
const CACHE_VERSION = 'v2';
const FOUND_TTL = 24 * 60 * 60;
const NOT_FOUND_TTL = 6 * 60 * 60; // retry sooner: community databases grow
const UNCERTAIN_TTL = 2 * 60; // a fallback source errored: retry soon

const JSON_HEADERS = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'};
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {status, headers: JSON_HEADERS});
}

class UpstreamError extends Error {}

type Raw = Record<string, unknown>;

interface LookupResult {
  found: boolean;
  source: LookupSource | null;
  product: Raw | null;
  /**
   * False when a fallback source failed (e.g. Kroger timeout), so "not found"
   * may be wrong. Such results are cached only briefly. Not sent to the app.
   */
  definitive?: boolean;
}

// ─── Sources ──────────────────────────────────────────────────────────────────

function sourceFromUrl(url: string): LookupSource {
  if (url.includes('openbeautyfacts')) {
    return 'openbeautyfacts';
  }
  if (url.includes('openproductsfacts')) {
    return 'openproductsfacts';
  }
  return 'openfoodfacts';
}

/** OFF-family lookup across all databases. Null = not found anywhere. */
async function fetchOpenFacts(code: string): Promise<{source: LookupSource; product: Raw} | null> {
  const url = `${OFF_BASE}/api/v2/product/${code}.json?product_type=all&fields=${OFF_FIELDS}`;
  const res = await fetch(url, {headers: {'User-Agent': USER_AGENT, Accept: 'application/json'}});
  // 404 with {status: 0} = not found. Anything else non-OK is an outage.
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new UpstreamError(`Open Food Facts ${res.status}`);
  }
  const body = (await res.json()) as {status?: number; product?: Raw};
  if (body.status !== 1 || !body.product) {
    return null;
  }
  return {source: sourceFromUrl(res.url || url), product: body.product};
}

// Edamam's plan allows very few requests per minute (shared with direct calls
// from the app). After a 429 we skip Edamam for a while instead of piling on.
const EDAMAM_COOLDOWN_KEY = 'edamam:cooldown';
const EDAMAM_COOLDOWN_TTL = 60; // KV minimum TTL

/** Edamam packaged-food lookup. Null = not found, not configured or rate-limited. */
async function fetchEdamam(env: LookupEnv, code: string): Promise<Raw | null> {
  if (!env.EDAMAM_APP_ID || !env.EDAMAM_APP_KEY) {
    return null;
  }
  if (await kvGet(env.TIPS_CACHE, EDAMAM_COOLDOWN_KEY)) {
    return null;
  }
  const url = new URL(`${EDAMAM_BASE}/parser`);
  url.searchParams.set('app_id', env.EDAMAM_APP_ID);
  url.searchParams.set('app_key', env.EDAMAM_APP_KEY);
  url.searchParams.set('upc', code);
  const res = await fetch(url.toString(), {headers: {Accept: 'application/json'}});
  if (res.status === 404) {
    return null;
  }
  if (res.status === 429) {
    console.error('Edamam rate limit hit; pausing Edamam lookups');
    await kvPut(env.TIPS_CACHE, EDAMAM_COOLDOWN_KEY, '1', EDAMAM_COOLDOWN_TTL);
    return null;
  }
  if (!res.ok) {
    // Don't include the URL: it carries the app key.
    console.error('Edamam error', res.status);
    return null; // Edamam is a fallback; its failure shouldn't fail the lookup
  }
  const body = (await res.json()) as {hints?: {food?: Raw}[]};
  return body.hints?.[0]?.food ?? null;
}

function offHasIngredientData(p: Raw): boolean {
  const text = typeof p.ingredients_text === 'string' ? p.ingredients_text.trim() : '';
  const tags = [...((p.allergens_tags as string[]) ?? []), ...((p.traces_tags as string[]) ?? [])];
  return text.length > 0 || tags.length > 0;
}

function edamamHasIngredientData(f: Raw): boolean {
  return typeof f.foodContentsLabel === 'string' && f.foodContentsLabel.trim().length > 0;
}

/** Same preference order as the app's productService.getProductByBarcode. */
async function lookupBarcode(env: LookupEnv, code: string): Promise<LookupResult> {
  let open = await fetchOpenFacts(code);
  // OFF doesn't expand 8-digit UPC-E codes; retry with the UPC-A form.
  if (!open && code.length === 8) {
    const body = expandUpcE(code);
    if (body) {
      open = await fetchOpenFacts(body + upcCheckDigit(body));
    }
  }

  if (open && offHasIngredientData(open.product)) {
    return {found: true, ...open};
  }

  const isFood = !open || open.source === 'openfoodfacts';
  const edamam = isFood ? await fetchEdamam(env, code) : null;
  if (edamam && edamamHasIngredientData(edamam)) {
    return {found: true, source: 'edamam', product: edamam};
  }

  // Neither has ingredients: keep the OFF-family record (image, categories,
  // nutrition) so the app can show the product as recognised, else Edamam's.
  if (open) {
    return {found: true, ...open};
  }
  if (edamam) {
    return {found: true, source: 'edamam', product: edamam};
  }

  // Last resort: Kroger's catalog recognises many products the open databases
  // lack (especially personal care and household). It has no ingredient
  // lists, so the app shows the product as recognised and asks for a label
  // photo. A Kroger failure just means "not found".
  try {
    const [kroger] = await findKrogerByUpc(env, code);
    if (kroger) {
      return {found: true, source: 'kroger', product: kroger as unknown as Raw};
    }
  } catch (err) {
    console.error('Kroger fallback failed', err);
    return {found: false, source: null, product: null, definitive: false};
  }
  return {found: false, source: null, product: null};
}

function upcCheckDigit(body11: string): string {
  let sum = 0;
  for (let i = 0; i < body11.length; i++) {
    sum += Number(body11[i]) * (i % 2 === 0 ? 3 : 1);
  }
  return String((10 - (sum % 10)) % 10);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function handleLookup(request: Request, env: LookupEnv): Promise<Response> {
  const url = new URL(request.url);
  const code = (url.searchParams.get('barcode') ?? '').replace(/\D/g, '');
  if (code.length < 6 || code.length > 14) {
    return json({error: 'barcode must be 6–14 digits'}, 400);
  }
  const locationId = url.searchParams.get('locationId');

  // Kroger runs in parallel and never fails the lookup.
  const krogerPromise: Promise<{matched: boolean; product: KrogerProduct | null} | {error: string}> | null =
    locationId
      ? findKrogerByUpc(env, code, locationId)
          .then(ps => ({matched: ps.length > 0, product: ps[0] ?? null}))
          .catch(err => {
            console.error('Kroger in lookup failed', err);
            return {error: 'Kroger unavailable'};
          })
      : null;

  const cacheKey = `lookup:${CACHE_VERSION}:${code}`;
  let result = await kvGetJson<LookupResult>(env.TIPS_CACHE, cacheKey);
  const cacheHit = result !== null;
  if (!result) {
    try {
      result = await lookupBarcode(env, code);
    } catch (err) {
      console.error('Lookup failed', err);
      return json({error: 'Product databases unavailable'}, 502);
    }
    const ttl = result.found ? FOUND_TTL : result.definitive === false ? UNCERTAIN_TTL : NOT_FOUND_TTL;
    await kvPut(env.TIPS_CACHE, cacheKey, JSON.stringify(result), ttl);
  }

  const {definitive: _definitive, ...publicResult} = result;
  const body: Record<string, unknown> = {...publicResult, cached: cacheHit};
  if (krogerPromise) {
    body.kroger = await krogerPromise;
  }
  return json(body);
}
