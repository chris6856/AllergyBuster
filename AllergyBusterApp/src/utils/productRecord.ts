import {Nutrients, ProductCategory} from '../types/product';

/**
 * A readable product name. Community databases sometimes hold junk names
 * (a website like "www.pg.com", a bare barcode, a single character); in
 * that case fall back to the brand, then to "Unnamed product".
 */
export function displayProductName(name: string | null | undefined, brand?: string | null): string {
  const n = (name ?? '').trim();
  const junk =
    n.length < 2 ||
    /^(https?:\/\/|www\.)/i.test(n) ||
    /^[a-z0-9-]+\.(com|net|org|co|us|uk|ca|de|fr)(\/.*)?$/i.test(n) ||
    /^\d{6,14}$/.test(n) ||
    /^unknown product$/i.test(n);
  if (!junk) {
    return n;
  }
  const b = (brand ?? '').split(',')[0].trim();
  return b ? `${b} product` : 'Unnamed product';
}

/** Label for a shopping list: brand + name, without repeating the brand. */
export function productListLabel(name: string | null | undefined, brand?: string | null): string {
  const shown = displayProductName(name, brand);
  const b = (brand ?? '').split(',')[0].trim();
  if (!b || shown.toLowerCase().includes(b.toLowerCase())) {
    return shown;
  }
  return `${b} ${shown}`;
}

/** Normalises a barcode to a 13-digit GTIN (UPC-A → leading 0). Null if not a barcode. */
export function toGtin13(code: string | null | undefined): string | null {
  const digits = (code ?? '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) {
    return null;
  }
  return digits.padStart(13, '0').slice(-13);
}

/**
 * Maps Open Food Facts' product_type (food / beauty / petfood / product) plus
 * category tags to an AllergyBuster category. Household products live in
 * Open Products Facts as "product", mixed with electronics, furniture, etc.,
 * so they are recognised by category tag.
 */
const HOUSEHOLD_TAG_RE =
  /cleaning|cleaner|detergent|dish(wash|washing)?-|laundry|household|disinfect|bleach|fabric-softener|air-freshener/;
const PERSONAL_CARE_TAG_RE =
  /cosmetic|shampoo|conditioner|soap|toothpaste|deodorant|lotion|skin-care|hair-care|sunscreen|make-up|hygiene/;

export function inferCategory(productType: string | undefined, categoryTags: string[]): ProductCategory {
  // User-entered tags vary in case and spacing ("en:Hand Dishwashing Soap"),
  // so normalise to the canonical lowercase-hyphen form before matching.
  const tags = categoryTags.map(t => t.toLowerCase().replace(/[\s_]+/g, '-')).join(' ');
  switch (productType) {
    case 'food':
      return 'food';
    case 'beauty':
      return 'personal_care';
    case 'petfood':
      return 'other';
    case 'product':
      if (HOUSEHOLD_TAG_RE.test(tags)) {
        return 'household';
      }
      if (PERSONAL_CARE_TAG_RE.test(tags)) {
        return 'personal_care';
      }
      return 'other';
    default:
      // Older OFF records have no product_type; they come from the food database.
      return 'food';
  }
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function compact(n: Nutrients): Nutrients | null {
  const entries = Object.entries(n).filter(([, v]) => v !== undefined);
  return entries.length ? (Object.fromEntries(entries) as Nutrients) : null;
}

/** OFF nutriments → Nutrients for a suffix ("_100g" or "_serving"). Values are grams / kcal. */
export function offNutrients(raw: Record<string, unknown>, suffix: '_100g' | '_serving'): Nutrients | null {
  const g = (key: string) => num(raw[`${key}${suffix}`]);
  return compact({
    energyKcal: g('energy-kcal'),
    fat: g('fat'),
    saturatedFat: g('saturated-fat'),
    transFat: g('trans-fat'),
    cholesterol: g('cholesterol'),
    carbohydrates: g('carbohydrates'),
    sugars: g('sugars'),
    addedSugars: g('added-sugars'),
    fiber: g('fiber'),
    proteins: g('proteins'),
    salt: g('salt'),
    sodium: g('sodium'),
  });
}

/** Edamam nutrients are per 100 g; sodium and cholesterol are in mg. */
export function edamamNutrients(raw: Record<string, unknown> | undefined): Nutrients | null {
  if (!raw) {
    return null;
  }
  const mgToG = (v: unknown) => {
    const n = num(v);
    return n === undefined ? undefined : n / 1000;
  };
  const sodium = mgToG(raw.NA);
  return compact({
    energyKcal: num(raw.ENERC_KCAL),
    fat: num(raw.FAT),
    saturatedFat: num(raw.FASAT),
    transFat: num(raw.FATRN),
    cholesterol: mgToG(raw.CHOLE),
    carbohydrates: num(raw.CHOCDF),
    sugars: num(raw.SUGAR),
    addedSugars: num(raw['SUGAR.added']),
    fiber: num(raw.FIBTG),
    proteins: num(raw.PROCNT),
    sodium,
    // Salt = sodium × 2.5 (EU labelling convention)
    salt: sodium === undefined ? undefined : sodium * 2.5,
  });
}

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Decodes the HTML entities some community records contain ("&gt;30% agua"). */
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return HTML_ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Decodes entities and strips a leading "Ingredients:" label some sources include. */
export function cleanIngredientsText(text: string | undefined | null): string {
  return decodeEntities(text ?? '').replace(/^\s*ingredients\s*:\s*/i, '').trim();
}

export function parseNovaGroup(v: unknown): 1 | 2 | 3 | 4 | null {
  const n = num(v);
  return n === 1 || n === 2 || n === 3 || n === 4 ? n : null;
}

export function unixToIso(t: unknown): string | null {
  const n = num(t);
  return n ? new Date(n * 1000).toISOString() : null;
}
