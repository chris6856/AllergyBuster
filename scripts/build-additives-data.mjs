#!/usr/bin/env node
/**
 * Builds AllergyBusterApp/src/data/additives.json from the Open Food Facts
 * additives taxonomy (ODbL). Run before a release to refresh:
 *
 *   node scripts/build-additives-data.mjs
 *
 * Keeps only what the app shows: name, E-number, functional classes, the
 * EFSA evaluation reference (title, date, link) and EFSA overexposure risk.
 * Dates and links are kept so the app never presents an old evaluation as
 * current regulatory status.
 */
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const SOURCE_URL = 'https://static.openfoodfacts.org/data/taxonomies/additives.json';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'AllergyBusterApp', 'src', 'data', 'additives.json');

const en = v => (v && typeof v === 'object' ? v.en : undefined);
const tag = v => (v ? String(v).replace(/^en:/, '') : undefined);

const res = await fetch(SOURCE_URL, {headers: {'User-Agent': 'AllergyBuster data build (+https://allergybuster.com)'}});
if (!res.ok) {
  throw new Error(`Download failed: ${res.status}`);
}
const taxonomy = await res.json();

const items = {};
for (const [code, v] of Object.entries(taxonomy)) {
  const rawName = en(v.name);
  if (!rawName) {
    continue;
  }
  // From the code, keeping sub-variants: "en:e160ai" → "E160ai".
  const eNumber = /^en:e\d/.test(code) ? `E${code.slice(4)}` : undefined;
  // "E340 - Potassium phosphates" → "Potassium phosphates"
  const name = rawName.replace(/^E\s?\d+[a-z()ivx]*\s*[-–]\s*/i, '').trim() || rawName;
  const classes = (en(v.additives_classes) ?? '')
    .split(',')
    .map(s => tag(s.trim()))
    .filter(Boolean);
  const evaluation = en(v.efsa_evaluation)
    ? {
        title: en(v.efsa_evaluation),
        date: (en(v.efsa_evaluation_date) ?? '').replace(/\//g, '-') || null,
        url: en(v.efsa_evaluation_url) ?? null,
        overexposureRisk: tag(en(v.efsa_evaluation_overexposure_risk)) ?? null,
      }
    : null;
  items[code] = {
    name,
    ...(eNumber ? {eNumber} : {}),
    ...(classes.length ? {classes} : {}),
    ...(evaluation ? {efsa: evaluation} : {}),
  };
}

const out = {
  meta: {
    source: 'Open Food Facts additives taxonomy',
    sourceUrl: SOURCE_URL,
    license: 'ODbL 1.0 (Open Database License)',
    generatedAt: new Date().toISOString().slice(0, 10),
    count: Object.keys(items).length,
  },
  items,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`Wrote ${out.meta.count} additives to ${OUT} (${Math.round(JSON.stringify(out).length / 1024)} KB)`);
