/**
 * Kroger connector: app-level (client credentials) endpoints.
 *
 *   GET /kroger/locations?zip=45202[&radius=10][&limit=10]
 *     Nearby Kroger-family stores.
 *
 *   GET /kroger/products?upc=<scanned barcode>[&locationId=...]
 *   GET /kroger/products?term=oat%20milk[&locationId=...][&limit=10]
 *     Catalog lookup. With locationId, price / stock / fulfillment for that store.
 *
 * Customer endpoints (account connection, cart add) come later and will use
 * the authorization-code flow with KROGER_REDIRECT_URI.
 *
 * Secrets: KROGER_CLIENT_ID, KROGER_CLIENT_SECRET
 * Vars:    KROGER_API_BASE (https://api.kroger.com/v1 or https://api-ce.kroger.com/v1)
 */

import {kvDelete, kvGet, kvGetJson, kvPut} from './cache';

export interface KrogerEnv {
  KROGER_CLIENT_ID: string;
  KROGER_CLIENT_SECRET: string;
  KROGER_API_BASE?: string;
  TIPS_CACHE: KVNamespace; // shared KV, all keys prefixed "kroger:"
}

const DEFAULT_BASE = 'https://api.kroger.com/v1';
const PRODUCT_CACHE_TTL = 6 * 60 * 60; // prices/stock change; keep short
const LOCATION_CACHE_TTL = 24 * 60 * 60;

const JSON_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {status, headers: JSON_HEADERS});
}

class KrogerError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function baseUrl(env: KrogerEnv): string {
  return (env.KROGER_API_BASE || DEFAULT_BASE).replace(/\/+$/, '');
}

/** KV key prefix per environment, so certification and production never share tokens or data. */
function ns(env: KrogerEnv): string {
  return baseUrl(env).includes('api-ce.') ? 'kroger:ce:' : 'kroger:prod:';
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAppToken(env: KrogerEnv): Promise<string> {
  const cached = await kvGet(env.TIPS_CACHE, `${ns(env)}token`);
  if (cached) {
    return cached;
  }
  if (!env.KROGER_CLIENT_ID || !env.KROGER_CLIENT_SECRET) {
    throw new KrogerError(503, 'Kroger integration is not configured');
  }
  const res = await fetch(`${baseUrl(env)}/connect/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.KROGER_CLIENT_ID}:${env.KROGER_CLIENT_SECRET}`)}`,
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  });
  if (!res.ok) {
    // Don't echo Kroger's body: it can include client details.
    console.error('Kroger token error', res.status, await res.text());
    throw new KrogerError(502, `Kroger authentication failed (${res.status})`);
  }
  const body = (await res.json()) as {access_token: string; expires_in: number};
  const ttl = Math.max(60, (body.expires_in ?? 1800) - 120);
  await kvPut(env.TIPS_CACHE, `${ns(env)}token`, body.access_token, ttl);
  return body.access_token;
}

async function krogerGet<T>(env: KrogerEnv, path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${baseUrl(env)}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const doFetch = async (token: string) =>
    fetch(url.toString(), {headers: {Accept: 'application/json', Authorization: `Bearer ${token}`}});

  let res = await doFetch(await getAppToken(env));
  if (res.status === 401) {
    // Token revoked or expired early: refresh once.
    await kvDelete(env.TIPS_CACHE, `${ns(env)}token`);
    res = await doFetch(await getAppToken(env));
  }
  if (!res.ok) {
    console.error('Kroger API error', path, res.status, await res.text());
    throw new KrogerError(res.status === 429 ? 429 : 502, `Kroger request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function cached<T>(env: KrogerEnv, key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = await kvGetJson<T>(env.TIPS_CACHE, key);
  if (hit) {
    return hit as T;
  }
  const value = await load();
  await kvPut(env.TIPS_CACHE, key, JSON.stringify(value), ttl);
  return value;
}

// ─── UPC handling ─────────────────────────────────────────────────────────────

/**
 * Kroger productIds are 13-digit, zero-padded UPCs without the check digit.
 * A scanned UPC-A (12 digits) / EAN-13 (13 digits) includes the check digit,
 * so we query both interpretations in one call (filter.productId accepts a list).
 */
export function upcCandidates(raw: string): string[] {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 14) {
    return [];
  }
  const pad = (s: string) => s.padStart(13, '0').slice(-13);
  const set = new Set<string>([pad(digits.slice(0, -1)), pad(digits)]);
  const expanded = digits.length === 8 ? expandUpcE(digits) : null;
  if (expanded) {
    set.add(pad(expanded)); // 11-digit body, no check digit
  }
  return [...set];
}

/**
 * Expands an 8-digit UPC-E (number system + 6 digits + check) to the 11-digit
 * UPC-A body without its check digit. Returns null if it isn't a valid UPC-E.
 */
export function expandUpcE(upcE: string): string | null {
  if (!/^[01]\d{7}$/.test(upcE)) {
    return null;
  }
  const ns = upcE[0];
  const [d1, d2, d3, d4, d5, d6] = upcE.slice(1, 7).split('');
  switch (d6) {
    case '0':
    case '1':
    case '2':
      return `${ns}${d1}${d2}${d6}0000${d3}${d4}${d5}`;
    case '3':
      return `${ns}${d1}${d2}${d3}00000${d4}${d5}`;
    case '4':
      return `${ns}${d1}${d2}${d3}${d4}00000${d5}`;
    default:
      return `${ns}${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  }
}

// ─── Response shaping ─────────────────────────────────────────────────────────

interface RawProduct {
  productId: string;
  upc?: string;
  brand?: string;
  description?: string;
  categories?: string[];
  images?: {perspective?: string; featured?: boolean; sizes?: {size?: string; url?: string}[]}[];
  items?: {
    size?: string;
    price?: {regular?: number; promo?: number};
    inventory?: {stockLevel?: string};
    fulfillment?: {curbside?: boolean; delivery?: boolean; inStore?: boolean; shipToHome?: boolean};
  }[];
  aisleLocations?: {description?: string}[];
}

function pickImage(images: RawProduct['images']): string | null {
  if (!images?.length) {
    return null;
  }
  const img = images.find(i => i.featured) ?? images.find(i => i.perspective === 'front') ?? images[0];
  const order = ['medium', 'large', 'small', 'xlarge', 'thumbnail'];
  for (const size of order) {
    const hit = img.sizes?.find(s => s.size === size && s.url);
    if (hit?.url) {
      return hit.url;
    }
  }
  return img.sizes?.find(s => s.url)?.url ?? null;
}

function shapeProduct(p: RawProduct) {
  const item = p.items?.[0];
  const price = item?.price;
  return {
    productId: p.productId,
    upc: p.upc ?? p.productId,
    brand: p.brand ?? '',
    description: p.description ?? '',
    categories: p.categories ?? [],
    imageUrl: pickImage(p.images),
    size: item?.size ?? null,
    // Kroger returns 0 when there is no price for the location.
    price: price && (price.regular || price.promo)
      ? {regular: price.regular ?? null, promo: price.promo || null}
      : null,
    stockLevel: item?.inventory?.stockLevel ?? null,
    fulfillment: item?.fulfillment ?? null,
    aisle: p.aisleLocations?.[0]?.description ?? null,
  };
}

interface RawLocation {
  locationId: string;
  chain?: string;
  name?: string;
  phone?: string;
  address?: {addressLine1?: string; city?: string; state?: string; zipCode?: string};
  geolocation?: {latitude?: number; longitude?: number};
}

// The locations API also returns internal fulfilment nodes, e.g.
// "Harris Teeter - - Unused Spoke", "Harris Teeter - Spoke Forecast - HT Trans",
// "Kroger - Zero Warehouse" (delivery fulfilment centre).
const INTERNAL_LOCATION_RE = /\b(unused|spoke|forecast|warehouse)\b/i;

function isShopperFacing(l: RawLocation): boolean {
  return !INTERNAL_LOCATION_RE.test(l.name ?? '');
}

function shapeLocation(l: RawLocation) {
  return {
    locationId: l.locationId,
    chain: l.chain ?? '',
    name: l.name ?? '',
    phone: l.phone ?? null,
    address: {
      line1: l.address?.addressLine1 ?? '',
      city: l.address?.city ?? '',
      state: l.address?.state ?? '',
      zip: l.address?.zipCode ?? '',
    },
    lat: l.geolocation?.latitude ?? null,
    lng: l.geolocation?.longitude ?? null,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

const LOCATION_ID_RE = /^[A-Za-z0-9]{1,16}$/;

function clampInt(v: string | null, def: number, min: number, max: number): number {
  const n = v ? parseInt(v, 10) : def;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

async function handleLocations(url: URL, env: KrogerEnv): Promise<Response> {
  const zip = url.searchParams.get('zip') ?? '';
  if (!/^\d{5}$/.test(zip)) {
    return json({error: 'zip must be a 5-digit ZIP code'}, 400);
  }
  const radius = clampInt(url.searchParams.get('radius'), 10, 1, 100);
  const limit = clampInt(url.searchParams.get('limit'), 10, 1, 50);

  const data = await cached(env, `${ns(env)}loc:${zip}:${radius}:${limit}`, LOCATION_CACHE_TTL, async () => {
    const res = await krogerGet<{data: RawLocation[]}>(env, '/locations', {
      'filter.zipCode.near': zip,
      'filter.radiusInMiles': String(radius),
      // Over-fetch: internal nodes are filtered out after Kroger applies the limit.
      'filter.limit': String(Math.min(200, limit * 3)),
    });
    return (res.data ?? []).filter(isShopperFacing).slice(0, limit).map(shapeLocation);
  });
  return json({locations: data});
}

async function handleProducts(url: URL, env: KrogerEnv): Promise<Response> {
  const upc = url.searchParams.get('upc');
  const term = url.searchParams.get('term')?.trim();
  const locationId = url.searchParams.get('locationId');

  if (locationId && !LOCATION_ID_RE.test(locationId)) {
    return json({error: 'Invalid locationId'}, 400);
  }

  const params: Record<string, string> = {};
  let cacheKey: string;
  if (upc) {
    const candidates = upcCandidates(upc);
    if (candidates.length === 0) {
      return json({error: 'upc must be 6–14 digits'}, 400);
    }
    params['filter.productId'] = candidates.join(',');
    cacheKey = `${ns(env)}upc:${candidates.join(',')}:${locationId ?? '-'}`;
  } else if (term) {
    if (term.length < 2 || term.length > 100) {
      return json({error: 'term must be 2–100 characters'}, 400);
    }
    const limit = clampInt(url.searchParams.get('limit'), 10, 1, 50);
    params['filter.term'] = term;
    params['filter.limit'] = String(limit);
    cacheKey = `${ns(env)}term:${term.toLowerCase()}:${limit}:${locationId ?? '-'}`;
  } else {
    return json({error: 'Provide upc or term'}, 400);
  }
  if (locationId) {
    params['filter.locationId'] = locationId;
  }

  const products = await cached(env, cacheKey, PRODUCT_CACHE_TTL, async () => {
    const res = await krogerGet<{data: RawProduct[]}>(env, '/products', params);
    return (res.data ?? []).map(shapeProduct);
  });
  return json({products, matched: products.length > 0});
}

export type KrogerProduct = ReturnType<typeof shapeProduct>;

/**
 * Kroger catalog match for a scanned barcode, for use by other endpoints
 * (e.g. /lookup). Shares the /kroger/products cache. Throws on Kroger errors.
 */
export async function findKrogerByUpc(
  env: KrogerEnv,
  upc: string,
  locationId?: string | null,
): Promise<KrogerProduct[]> {
  const candidates = upcCandidates(upc);
  if (candidates.length === 0 || (locationId && !LOCATION_ID_RE.test(locationId))) {
    return [];
  }
  const params: Record<string, string> = {'filter.productId': candidates.join(',')};
  if (locationId) {
    params['filter.locationId'] = locationId;
  }
  return cached(env, `${ns(env)}upc:${candidates.join(',')}:${locationId ?? '-'}`, PRODUCT_CACHE_TTL, async () => {
    const res = await krogerGet<{data: RawProduct[]}>(env, '/products', params);
    return (res.data ?? []).map(shapeProduct);
  });
}

/** Returns a Response for /kroger/* paths, or null if the path isn't ours. */
export async function handleKroger(request: Request, env: KrogerEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/kroger/')) {
    return null;
  }
  if (request.method !== 'GET') {
    return json({error: 'Method not allowed'}, 405);
  }
  try {
    if (url.pathname === '/kroger/locations') {
      return await handleLocations(url, env);
    }
    if (url.pathname === '/kroger/products') {
      return await handleProducts(url, env);
    }
    return json({error: 'Not found'}, 404);
  } catch (err) {
    if (err instanceof KrogerError) {
      return json({error: err.message}, err.status);
    }
    console.error('Kroger handler error', err);
    return json({error: 'Kroger request failed'}, 502);
  }
}
