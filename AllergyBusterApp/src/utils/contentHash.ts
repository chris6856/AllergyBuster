import {ProductRecord} from '../types/product';

/**
 * Fingerprint of what a product is made of: normalised ingredient text,
 * declared allergens, traces and additives. Name, image, nutrition rounding
 * and other metadata are excluded so cosmetic edits to a community record
 * don't trigger "Recheck needed"; a changed formula does.
 */
export function productContentHash(p: ProductRecord): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      // Latin letters incl. accents, digits, %. (No \p{…}: keep Hermes-safe.)
      .replace(/[^a-z0-9%À-ɏ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const list = (xs: string[]) => [...new Set(xs.map(norm))].sort().join(',');
  const canonical = [
    norm(p.ingredientsText),
    list(p.allergens.declared),
    list(p.allergens.traces),
    list(p.additives ?? []),
  ].join('|');
  return hash64(canonical);
}

/** Two independent 32-bit FNV-1a passes → 16 hex chars. Not cryptographic. */
function hash64(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x01000197);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return hex(h1) + hex(h2);
}
