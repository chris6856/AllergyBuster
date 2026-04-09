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
  ANTHROPIC_API_KEY: string;
  ADMIN_KEY: string;
  SENDGRID_API_KEY: string;
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
const MODEL = 'claude-3-haiku-20240307';

const PROMPT = `You are a helpful food allergy information assistant.
Write a single practical tip for people managing food allergies or intolerances.
The tip should be:
- 1-3 sentences long
- Actionable and specific (not generic advice like "read labels")
- Accurate and safety-conscious
- Written in plain, friendly language suitable for a mobile app notification

Respond with ONLY the tip text — no preamble, no quotes, no bullet points.`;

async function generateTip(apiKey: string): Promise<string> {
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
      messages: [{role: 'user', content: PROMPT}],
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
    tipText = await generateTip(env.ANTHROPIC_API_KEY);
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
      from: { email: 'noreply@allergybuster.com', name: 'AllergyBuster Contact' },
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

    return json({error: 'Not found'}, 404);
  },
};
