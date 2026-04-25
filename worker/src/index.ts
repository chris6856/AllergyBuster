/**
 * AllergyBuster Worker
 *
 * Endpoints:
 *
 *   GET  /tip?date=YYYY-MM-DD
 *     Returns { text, date } — AI-generated allergy tip, cached 25h in KV.
 *
 *   GET  /chains?query=mcdonalds
 *     Returns matching chain restaurant records with full allergen data.
 *
 *   GET  /chains/:id
 *     Returns a single chain record by ID.
 *
 *   PUT  /chains/:id          (requires Authorization: Bearer ADMIN_KEY)
 *     Creates or updates a chain record. Body is JSON matching ChainRecord.
 *
 *   DELETE /chains/:id        (requires Authorization: Bearer ADMIN_KEY)
 *     Removes a chain record and updates the search index.
 *
 * Required bindings (wrangler.toml):
 *   TIPS_CACHE  — KV namespace for tip cache
 *   CHAINS_DB   — KV namespace for chain allergen database
 *
 * Required secrets (wrangler secret put):
 *   ANTHROPIC_API_KEY
 *   ADMIN_KEY
 */

export interface Env {
  TIPS_CACHE: KVNamespace;
  CHAINS_DB: KVNamespace;
  ESTABLISHMENTS_DB: D1Database;
  ANTHROPIC_API_KEY: string;
  ADMIN_KEY: string;
  SENDGRID_API_KEY: string;
  GOOGLE_PLACES_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContributionRecord {
  id: string;
  submittedAt: string;        // ISO timestamp
  status: 'pending';
  restaurant: string;
  location: string;
  menuItem: string;
  allergens: string[];
  notes: string;
}

interface ChainMenuItemAllergens {
  declared: string[];
  mayContain: string[];
  dataAvailable: boolean;
}

interface ChainMenuItem {
  name: string;
  description?: string;
  allergens: ChainMenuItemAllergens;
}

interface ChainRecord {
  id: string;
  name: string;
  aliases: string[];      // lowercase search terms
  cuisineType: string;
  sourceUrl: string;      // restaurant's published allergen guide
  lastUpdated: string;    // YYYY-MM-DD
  menuItems: ChainMenuItem[];
}

// Index entry — lightweight, stored separately to avoid fetching all chains on search
interface ChainIndexEntry {
  id: string;
  name: string;
  aliases: string[];
}

const INDEX_KEY = 'index:chains';

const PRIVACY_POLICY_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AllergyBuster Privacy Policy</title>
<style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}h1{color:#2E7D32}h2{margin-top:2em}</style>
</head>
<body>
<h1>AllergyBuster Privacy Policy</h1>
<p><em>Last updated: ${new Date().toISOString().slice(0,10)}</em></p>

<h2>Camera</h2>
<p>AllergyBuster uses your device camera solely to photograph food ingredient labels. Photos are processed on-device using on-device text recognition (Google ML Kit). No images are uploaded to our servers or stored beyond the current session.</p>

<h2>Information We Collect</h2>
<p>We do not collect, store, or share any personally identifiable information. The app does not require account creation or login.</p>

<h2>Contact Form</h2>
<p>If you submit the in-app contact form, we collect the name, email address, and message you provide solely to respond to your inquiry. This information is not sold or shared with third parties.</p>

<h2>Third-Party Services</h2>
<ul>
  <li><strong>Anthropic Claude API</strong> — used to generate daily allergy tips. No user data is sent.</li>
  <li><strong>Yelp Fusion API</strong> — used to search nearby restaurants by name. Only the search query is transmitted; no location or personal data is sent.</li>
</ul>

<h2>Children</h2>
<p>AllergyBuster is not directed at children under 13 and does not knowingly collect data from children.</p>

<h2>Contact</h2>
<p>Questions? Email us at <a href="mailto:info@allergybusted.com">info@allergybusted.com</a>.</p>
</body>
</html>`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {status, headers: CORS_HEADERS});
}

function unauthorized(): Response {
  return json({error: 'Unauthorized'}, 401);
}

function isAdmin(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization') ?? '';
  return env.ADMIN_KEY ? auth === `Bearer ${env.ADMIN_KEY}` : false;
}

async function getIndex(env: Env): Promise<ChainIndexEntry[]> {
  const raw = await env.CHAINS_DB.get(INDEX_KEY);
  return raw ? (JSON.parse(raw) as ChainIndexEntry[]) : [];
}

async function saveIndex(env: Env, index: ChainIndexEntry[]): Promise<void> {
  await env.CHAINS_DB.put(INDEX_KEY, JSON.stringify(index));
}

// ─── Tips handler ─────────────────────────────────────────────────────────────

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

const TIP_CATEGORIES = [
  'hidden allergen sources in unexpected foods (e.g. sauces, medications, stamps)',
  'dining out at restaurants safely — what to ask and who to ask',
  'cross-contact prevention in shared kitchens at home',
  'how to read allergen labels — "may contain", advisory warnings, precautionary statements',
  'travelling with food allergies — planes, hotels, foreign countries',
  'grocery shopping strategies — store brands, seasonal items, reformulated products',
  'emergency preparedness — epinephrine, action plans, wearing medical ID',
  'social situations — parties, potlucks, school events, work lunches',
  'cooking and baking allergen-free substitutions at home',
  'seasonal allergy risks — holiday foods, Halloween candy, Easter chocolate',
  'cosmetics, skincare and non-food allergen sources',
  'understanding the difference between allergy, intolerance and sensitivity',
  'children with food allergies — school, sleepovers, sports',
  'how to talk to restaurant staff and chefs effectively',
];

async function generateTip(apiKey: string, date: string): Promise<string> {
  const seed = parseInt(date.replace(/-/g, '').slice(-4), 10);
  const category = TIP_CATEGORIES[seed % TIP_CATEGORIES.length];

  const prompt = `Today is ${date}. Write one specific, practical tip for people managing food allergies. Focus ONLY on this topic: ${category}.

Rules:
- 1–3 sentences
- Concrete and actionable — name specific foods, situations, or steps
- Do NOT give generic label-reading advice unless the topic is specifically about labels
- Plain, friendly language for a mobile app
- Must be clearly different from yesterday's tip

Respond with ONLY the tip text — no preamble, no quotes, no bullet points.`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      messages: [{role: 'user', content: prompt}],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error: ${response.status} — ${body}`);
  }

  const data = (await response.json()) as {
    content: Array<{type: string; text: string}>;
  };

  const text = data.content.find(c => c.type === 'text')?.text?.trim();
  if (!text) {throw new Error('No text content in Anthropic response');}
  return text;
}

async function handleTip(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({error: 'Invalid date format'}, 400);
  }

  const cacheKey = `tip:${date}`;
  const cached = await env.TIPS_CACHE.get(cacheKey);
  if (cached) {return new Response(cached, {headers: CORS_HEADERS});}

  let tipText: string;
  try {
    tipText = await generateTip(env.ANTHROPIC_API_KEY, date);
  } catch (err) {
    return json({error: 'Failed to generate tip', detail: String(err)}, 502);
  }

  const payload = JSON.stringify({text: tipText, date});
  await env.TIPS_CACHE.put(cacheKey, payload, {expirationTtl: 90_000});
  return new Response(payload, {headers: CORS_HEADERS});
}

// ─── Contact handler ──────────────────────────────────────────────────────────

async function handlePostContact(request: Request, env: Env): Promise<Response> {
  let body: { firstName?: string; lastName?: string; email?: string; topic?: string; message?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { firstName, email, topic, message } = body;
  if (!firstName?.trim() || !email?.trim() || !topic?.trim() || !message?.trim()) {
    return json({ error: 'firstName, email, topic, and message are required' }, 400);
  }

  const fullName = `${firstName.trim()} ${(body.lastName ?? '').trim()}`.trim();
  const subjectMap: Record<string, string> = {
    'app-support':  'App Support / Bug Report',
    'data-error':   'Allergen Data Error',
    'feedback':     'General Feedback',
    'privacy':      'Privacy or Legal',
    'partnership':  'Partnership / Press',
    'other':        'Other',
  };
  const topicLabel = subjectMap[topic] ?? topic;

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: { email: 'noreply@allergybusted.com', name: 'AllergyBuster Contact' },
      reply_to: { email: email.trim(), name: fullName },
      personalizations: [{ to: [{ email: 'info@allergybusted.com' }] }],
      subject: `[AllergyBuster] ${topicLabel} — ${fullName}`,
      content: [
        { type: 'text/plain', value: `From: ${fullName} <${email.trim()}>\nTopic: ${topicLabel}\n\n${message.trim()}` },
        { type: 'text/html',  value: `<p><strong>From:</strong> ${fullName} &lt;${email.trim()}&gt;</p><p><strong>Topic:</strong> ${topicLabel}</p><hr/><p style="white-space:pre-wrap">${message.trim()}</p>` },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: 'Failed to send email', detail }, 502);
  }

  return json({ success: true });
}

// ─── Contributions handler ────────────────────────────────────────────────────

async function handlePostContribution(request: Request, env: Env): Promise<Response> {
  let body: Partial<ContributionRecord>;
  try {
    body = await request.json() as Partial<ContributionRecord>;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.restaurant?.trim()) {
    return json({ error: 'restaurant is required' }, 400);
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record: ContributionRecord = {
    id,
    submittedAt: new Date().toISOString(),
    status: 'pending',
    restaurant: body.restaurant.trim(),
    location: body.location?.trim() ?? '',
    menuItem: body.menuItem?.trim() ?? '',
    allergens: Array.isArray(body.allergens) ? body.allergens : [],
    notes: body.notes?.trim() ?? '',
  };

  await env.CHAINS_DB.put(`contribution:${id}`, JSON.stringify(record));
  return json({ success: true, id });
}

// ─── Admin: list & delete contributions ──────────────────────────────────────

async function handleGetContributions(request: Request, env: Env): Promise<Response> {
  if (!isAdmin(request, env)) return unauthorized();

  const listed = await env.CHAINS_DB.list({ prefix: 'contribution:' });
  const records = await Promise.all(
    listed.keys.map(async k => {
      const raw = await env.CHAINS_DB.get(k.name);
      return raw ? JSON.parse(raw) : null;
    })
  );

  return json(records.filter(Boolean));
}

async function handleDeleteContribution(id: string, request: Request, env: Env): Promise<Response> {
  if (!isAdmin(request, env)) return unauthorized();
  await env.CHAINS_DB.delete(`contribution:${id}`);
  return json({ success: true, id });
}

// ─── Chains handlers ──────────────────────────────────────────────────────────

async function handleGetChains(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const query = (url.searchParams.get('query') ?? '').toLowerCase().trim();

  const index = await getIndex(env);

  // Filter index by query
  const matches = query
    ? index.filter(
        entry =>
          entry.name.toLowerCase().includes(query) ||
          entry.aliases.some(a => a.includes(query)),
      )
    : index;

  // Fetch full records for matches
  const records = await Promise.all(
    matches.map(async entry => {
      const raw = await env.CHAINS_DB.get(`chain:${entry.id}`);
      return raw ? (JSON.parse(raw) as ChainRecord) : null;
    }),
  );

  return json(records.filter(Boolean));
}

async function handleGetChain(id: string, env: Env): Promise<Response> {
  const raw = await env.CHAINS_DB.get(`chain:${id}`);
  if (!raw) {return json({error: 'Not found'}, 404);}
  return new Response(raw, {headers: CORS_HEADERS});
}

async function handlePutChain(
  id: string,
  request: Request,
  env: Env,
): Promise<Response> {
  if (!isAdmin(request, env)) {return unauthorized();}

  let body: ChainRecord;
  try {
    body = (await request.json()) as ChainRecord;
  } catch {
    return json({error: 'Invalid JSON body'}, 400);
  }

  if (!body.name || !Array.isArray(body.menuItems)) {
    return json({error: 'Missing required fields: name, menuItems'}, 400);
  }

  // Ensure id is consistent
  body.id = id;
  body.lastUpdated = new Date().toISOString().slice(0, 10);

  // Save the full record
  await env.CHAINS_DB.put(`chain:${id}`, JSON.stringify(body));

  // Update the search index
  const index = await getIndex(env);
  const existingIdx = index.findIndex(e => e.id === id);
  const entry: ChainIndexEntry = {
    id,
    name: body.name,
    aliases: (body.aliases ?? []).map(a => a.toLowerCase()),
  };

  if (existingIdx >= 0) {
    index[existingIdx] = entry;
  } else {
    index.push(entry);
  }
  await saveIndex(env, index);

  return json({success: true, id, lastUpdated: body.lastUpdated});
}

async function handleDeleteChain(
  id: string,
  request: Request,
  env: Env,
): Promise<Response> {
  if (!isAdmin(request, env)) {return unauthorized();}

  await env.CHAINS_DB.delete(`chain:${id}`);

  const index = await getIndex(env);
  await saveIndex(env, index.filter(e => e.id !== id));

  return json({success: true, id});
}

// ─── Ask Jeeves chat handler ──────────────────────────────────────────────────

const JEEVES_SYSTEM_PROMPT = `You are Jeeves, a friendly and knowledgeable assistant built into the AllergyBuster app. Your job is to help users manage food allergies and get the most out of the app.

## About AllergyBuster
AllergyBuster helps people identify allergens in food before they eat. It has four main features:

1. **Barcode Scanner** — Point the camera at any product barcode (UPC, EAN-13, EAN-8, Code-128, etc.) for an instant allergen lookup from the Open Food Facts database.

2. **Label Scanner** — Photograph an ingredient label and the app uses on-device text recognition to extract and highlight allergens automatically. Great for when the print is too small to read.

3. **Product & Restaurant Search** — Search by product name, brand, ingredient, or restaurant chain. For restaurants, the app shows menu items and their declared allergens and may-contain warnings.

4. **Daily Tips** — A fresh food allergy tip appears on the home screen every day.

## How to use each feature
- **To scan a barcode**: Tap "Scan Barcode" on the home screen or the Scan tab. Hold the camera steady over the barcode — it scans automatically, no button needed.
- **To scan a label**: Tap "Scan Label" or the Photo tab. Point the camera at the ingredient list and tap the capture button. The app will extract the text and highlight any allergens.
- **To search**: Tap "Search Products & Restaurants" or the Search tab. Type a product name, brand, or restaurant. Toggle between Products and Restaurants at the top.
- **For restaurant details**: After searching, tap a restaurant to see its menu items and allergen information.

## More information
For more information, users can visit the website at allergybusted.com.

## Important disclaimer
Always remind users that AllergyBuster provides general information only and is NOT a substitute for medical advice. Users should always verify allergen information on product packaging and consult a healthcare professional about their specific dietary needs. Never tell a user that a product is definitively safe for them — you can share what the data says, but always recommend they verify.

## Tone and style
- Friendly, warm, and concise
- Use plain language — no medical jargon
- If asked about something unrelated to food allergies or the app, politely redirect
- Keep responses short enough to read comfortably on a phone screen`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  let body: {messages?: ChatMessage[]};
  try {
    body = await request.json() as {messages?: ChatMessage[]};
  } catch {
    return json({error: 'Invalid JSON body'}, 400);
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({error: 'messages array is required'}, 400);
  }

  // Limit conversation history to last 20 messages to control token usage
  const trimmed = messages.slice(-20);

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: JEEVES_SYSTEM_PROMPT,
      messages: trimmed,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return json({error: 'AI service error', detail}, 502);
  }

  const data = (await response.json()) as {
    content: Array<{type: string; text: string}>;
  };

  const reply = data.content.find(c => c.type === 'text')?.text?.trim();
  if (!reply) {
    return json({error: 'Empty response from AI'}, 502);
  }

  return json({reply});
}

// ─── Establishments handlers ──────────────────────────────────────────────────

const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places';
const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.websiteUri',
  'places.currentOpeningHours.openNow',
].join(',');

const FOOD_TYPES: Record<string, string[]> = {
  all:        ['restaurant', 'bakery', 'cafe', 'coffee_shop', 'fast_food_restaurant', 'pizza_restaurant', 'ice_cream_shop'],
  restaurant: ['restaurant', 'american_restaurant', 'fine_dining_restaurant', 'seafood_restaurant', 'steak_house', 'mexican_restaurant', 'italian_restaurant', 'french_restaurant', 'greek_restaurant', 'mediterranean_restaurant', 'buffet_restaurant', 'family_restaurant', 'vegan_restaurant', 'vegetarian_restaurant', 'bar_and_grill', 'breakfast_restaurant', 'brunch_restaurant'],
  fastfood:   ['fast_food_restaurant', 'sandwich_shop'],
  cafe:       ['cafe', 'coffee_shop'],
  bakery:     ['bakery'],
  pizza:      ['pizza_restaurant'],
  asian:      ['chinese_restaurant', 'japanese_restaurant', 'korean_restaurant', 'thai_restaurant', 'vietnamese_restaurant', 'sushi_restaurant', 'ramen_restaurant', 'indian_restaurant', 'indonesian_restaurant'],
  icecream:   ['ice_cream_shop'],
};

const VALID_ALLERGENS = new Set([
  'peanuts', 'tree-nuts', 'milk', 'eggs', 'wheat', 'soy',
  'fish', 'shellfish', 'sesame', 'mustard', 'sulfites', 'lupin',
]);

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  websiteUri?: string;
  currentOpeningHours?: { openNow?: boolean };
}

interface RatingRow {
  place_id: string;
  allergen: string;
  avg_safety: number;
  count: number;
}

function inferCategory(types: string[]): string {
  if (types.some(t => t === 'ice_cream_shop')) return 'icecream';
  if (types.some(t => t === 'pizza_restaurant')) return 'pizza';
  if (types.some(t => t === 'bakery')) return 'bakery';
  if (types.some(t => ['cafe', 'coffee_shop'].includes(t))) return 'cafe';
  if (types.some(t => t === 'fast_food_restaurant' || t === 'sandwich_shop')) return 'fastfood';
  if (types.some(t => ['chinese_restaurant','japanese_restaurant','korean_restaurant','thai_restaurant','vietnamese_restaurant','sushi_restaurant','ramen_restaurant','indian_restaurant','indonesian_restaurant'].includes(t))) return 'asian';
  return 'restaurant';
}

async function fetchNearby(apiKey: string, lat: number, lng: number, radius: number, category: string): Promise<PlaceResult[]> {
  const types = FOOD_TYPES[category] ?? FOOD_TYPES.all;
  const res = await fetch(`${GOOGLE_PLACES_URL}:searchNearby`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': PLACES_FIELD_MASK },
    body: JSON.stringify({ includedTypes: types, maxResultCount: 20, locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } } }),
  });
  if (!res.ok) throw new Error(`Google Places nearby error: ${res.status} — ${await res.text()}`);
  return ((await res.json() as { places?: PlaceResult[] }).places) ?? [];
}

async function fetchByText(apiKey: string, q: string, category: string): Promise<PlaceResult[]> {
  const body: Record<string, unknown> = { textQuery: q, maxResultCount: 20 };
  const types = FOOD_TYPES[category];
  if (types && category !== 'all') body.includedType = types[0];
  const res = await fetch(`${GOOGLE_PLACES_URL}:searchText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': PLACES_FIELD_MASK },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google Places text error: ${res.status} — ${await res.text()}`);
  return ((await res.json() as { places?: PlaceResult[] }).places) ?? [];
}

async function getRatings(db: D1Database, ids: string[]): Promise<Map<string, Record<string, { avg: number; count: number }>>> {
  if (ids.length === 0) return new Map();
  const ph = ids.map(() => '?').join(',');
  const rows = await db.prepare(
    `SELECT place_id, allergen, ROUND(AVG(CAST(safety AS REAL)), 1) as avg_safety, COUNT(*) as count FROM ratings WHERE place_id IN (${ph}) GROUP BY place_id, allergen`
  ).bind(...ids).all<RatingRow>();
  const map = new Map<string, Record<string, { avg: number; count: number }>>();
  for (const r of rows.results ?? []) {
    if (!map.has(r.place_id)) map.set(r.place_id, {});
    map.get(r.place_id)![r.allergen] = { avg: r.avg_safety, count: r.count };
  }
  return map;
}

function shapePlaces(places: PlaceResult[], ratings: Map<string, Record<string, { avg: number; count: number }>>) {
  return {
    results: places.map(p => ({
      id: p.id,
      name: p.displayName?.text ?? 'Unknown',
      address: p.formattedAddress ?? '',
      category: inferCategory(p.types ?? []),
      googleRating: p.rating ?? null,
      googleRatingCount: p.userRatingCount ?? 0,
      isOpen: p.currentOpeningHours?.openNow ?? null,
      website: p.websiteUri ?? null,
      allergenRatings: ratings.get(p.id) ?? {},
    })),
  };
}

async function handleGetEstablishments(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const category = url.searchParams.get('category') ?? 'all';
  const q        = url.searchParams.get('q') ?? '';
  const latStr   = url.searchParams.get('lat') ?? '';
  const lngStr   = url.searchParams.get('lng') ?? '';
  const radius   = Math.min(50000, Math.max(500, parseInt(url.searchParams.get('radius') ?? '5000', 10) || 5000));

  let cacheKey: string;
  let places: PlaceResult[];

  try {
    if (latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isNaN(lat) || isNaN(lng)) return json({ error: 'Invalid lat/lng' }, 400);
      cacheKey = `places:${lat.toFixed(3)},${lng.toFixed(3)}:${radius}:${category}`;
      const cached = await env.TIPS_CACHE.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as PlaceResult[];
        return json(shapePlaces(parsed, await getRatings(env.ESTABLISHMENTS_DB, parsed.map(p => p.id))));
      }
      places = await fetchNearby(env.GOOGLE_PLACES_API_KEY, lat, lng, radius, category);
    } else if (q) {
      cacheKey = `places:text:${category}:${q.slice(0, 80)}`;
      const cached = await env.TIPS_CACHE.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as PlaceResult[];
        return json(shapePlaces(parsed, await getRatings(env.ESTABLISHMENTS_DB, parsed.map(p => p.id))));
      }
      places = await fetchByText(env.GOOGLE_PLACES_API_KEY, q, category);
    } else {
      return json({ error: 'Provide lat/lng or q' }, 400);
    }
  } catch (err) {
    return json({ error: 'Places API error', detail: String(err) }, 502);
  }

  await env.TIPS_CACHE.put(cacheKey!, JSON.stringify(places), { expirationTtl: 3600 });
  return json(shapePlaces(places, await getRatings(env.ESTABLISHMENTS_DB, places.map(p => p.id))));
}

async function handlePostRating(request: Request, env: Env): Promise<Response> {
  let body: { place_id?: string; place_name?: string; place_addr?: string; allergen?: string; safety?: number; notes?: string };
  try { body = await request.json() as typeof body; }
  catch { return json({ error: 'Invalid JSON body' }, 400); }

  const { place_id, place_name, allergen, safety } = body;
  if (!place_id?.trim() || !place_name?.trim() || !allergen?.trim())
    return json({ error: 'place_id, place_name, allergen required' }, 400);
  if (typeof safety !== 'number' || safety < 1 || safety > 5)
    return json({ error: 'safety must be 1–5' }, 400);
  if (!VALID_ALLERGENS.has(allergen))
    return json({ error: 'Invalid allergen' }, 400);

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await env.ESTABLISHMENTS_DB.prepare(
    'INSERT INTO ratings (id, place_id, place_name, place_addr, allergen, safety, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, place_id.trim(), place_name.trim(), body.place_addr?.trim() ?? '', allergen, Math.round(safety), body.notes?.trim() ?? '').run();

  return json({ success: true, id });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers: CORS_HEADERS});
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // /tip
    if (path === '/tip' && request.method === 'GET') {
      return handleTip(request, env);
    }

    // /contact  (contact form email)
    if (path === '/contact' && request.method === 'POST') {
      return handlePostContact(request, env);
    }

    // /contributions  (public community submissions)
    if (path === '/contributions' && request.method === 'POST') {
      return handlePostContribution(request, env);
    }

    // /admin/contributions  (list pending — admin only)
    if (path === '/admin/contributions' && request.method === 'GET') {
      return handleGetContributions(request, env);
    }

    // /contributions/:id  (reject/delete — admin only)
    const contribMatch = path.match(/^\/contributions\/([a-z0-9_-]+)$/);
    if (contribMatch && request.method === 'DELETE') {
      return handleDeleteContribution(contribMatch[1], request, env);
    }

    // /chains  (search)
    if (path === '/chains' && request.method === 'GET') {
      return handleGetChains(request, env);
    }

    // /chains/:id
    const chainMatch = path.match(/^\/chains\/([a-z0-9_-]+)$/);
    if (chainMatch) {
      const id = chainMatch[1];
      if (request.method === 'GET')    {return handleGetChain(id, env);}
      if (request.method === 'PUT')    {return handlePutChain(id, request, env);}
      if (request.method === 'DELETE') {return handleDeleteChain(id, request, env);}
    }

    // /chat  (Ask Jeeves chatbot)
    if (path === '/chat' && request.method === 'POST') {
      return handleChat(request, env);
    }

    // /establishments  (nearby allergy-friendly places)
    if (path === '/establishments' && request.method === 'GET') {
      return handleGetEstablishments(request, env);
    }

    // /establishments/rate  (community allergen rating)
    if (path === '/establishments/rate' && request.method === 'POST') {
      return handlePostRating(request, env);
    }

    // /privacy
    if (path === '/privacy') {
      return new Response(PRIVACY_POLICY_HTML, {
        status: 200,
        headers: {'Content-Type': 'text/html; charset=utf-8'},
      });
    }

    return json({error: 'Not found'}, 404);
  },
};
