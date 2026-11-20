import {DEFAULT_PREFERENCES, Preferences} from '../types/preferences';
import {getDb} from './db';
import {nowIso} from './ids';

const KEY = 'product_preferences';

function clampNumber(v: unknown, def: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

/** Merges stored values over defaults, so new preference keys get defaults. */
function sanitize(raw: Partial<Preferences> | null | undefined): Preferences {
  const d = DEFAULT_PREFERENCES;
  const r = raw ?? {};
  return {
    additives: typeof r.additives === 'boolean' ? r.additives : d.additives,
    addedSugar: {
      enabled: typeof r.addedSugar?.enabled === 'boolean' ? r.addedSugar.enabled : d.addedSugar.enabled,
      limitPerServingG: clampNumber(r.addedSugar?.limitPerServingG, d.addedSugar.limitPerServingG, 0, 100),
    },
    sodium: {
      enabled: typeof r.sodium?.enabled === 'boolean' ? r.sodium.enabled : d.sodium.enabled,
      limitPerServingMg: clampNumber(r.sodium?.limitPerServingMg, d.sodium.limitPerServingMg, 0, 5000),
    },
    packaging: typeof r.packaging === 'boolean' ? r.packaging : d.packaging,
    fragrance: typeof r.fragrance === 'boolean' ? r.fragrance : d.fragrance,
  };
}

export async function loadPreferences(): Promise<Preferences> {
  try {
    const db = await getDb();
    const {rows} = await db.execute('SELECT value_json FROM user_preference WHERE key = ?', [KEY]);
    return sanitize(rows[0] ? JSON.parse(String(rows[0].value_json)) : null);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO user_preference (key, value_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    [KEY, JSON.stringify(sanitize(prefs)), nowIso()],
  );
}
