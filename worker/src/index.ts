/**
 * AllergyBuster Tips Worker
 *
 * GET /tip?date=YYYY-MM-DD
 *   Returns a JSON object: { text: string, date: string }
 *
 * The worker caches one tip per calendar date in a KV namespace (TIPS_CACHE).
 * On a cache miss it calls the Anthropic Messages API to generate a fresh tip,
 * stores it with a 25-hour TTL, and returns it.
 *
 * Required:
 *   - KV namespace bound as TIPS_CACHE (see wrangler.toml)
 *   - Secret ANTHROPIC_API_KEY (wrangler secret put ANTHROPIC_API_KEY)
 *
 * Deploy:
 *   npm install
 *   wrangler kv namespace create TIPS_CACHE   # copy the ID into wrangler.toml
 *   wrangler secret put ANTHROPIC_API_KEY
 *   wrangler deploy
 */

export interface Env {
  TIPS_CACHE: KVNamespace;
  ANTHROPIC_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001'; // fast and cheap for short tips

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
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    content: Array<{type: string; text: string}>;
  };

  const text = data.content.find(c => c.type === 'text')?.text?.trim();
  if (!text) {
    throw new Error('No text content in Anthropic response');
  }
  return text;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers: CORS_HEADERS});
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({error: 'Method not allowed'}), {
        status: 405,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);
    const date =
      url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({error: 'Invalid date format'}), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const cacheKey = `tip:${date}`;

    // Check KV cache
    const cached = await env.TIPS_CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {headers: CORS_HEADERS});
    }

    // Generate a new tip via Claude
    let tipText: string;
    try {
      tipText = await generateTip(env.ANTHROPIC_API_KEY);
    } catch (err) {
      return new Response(
        JSON.stringify({error: 'Failed to generate tip', detail: String(err)}),
        {status: 502, headers: CORS_HEADERS},
      );
    }

    const payload = JSON.stringify({text: tipText, date});

    // Cache for 25 hours (90 000 seconds) so it survives the full calendar day
    // in any timezone and is refreshed the next day.
    await env.TIPS_CACHE.put(cacheKey, payload, {expirationTtl: 90_000});

    return new Response(payload, {headers: CORS_HEADERS});
  },
};
