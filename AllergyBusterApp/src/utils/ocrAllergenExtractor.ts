import {ALLERGEN_KEYWORDS} from '../constants/allergens';

export interface OcrExtractionResult {
  detected: string[];
  traces: string[];
  facilityWarnings: string[]; // verbatim cross-contamination statements containing a recognised allergen
  rawText: string;
}

/**
 * Extracts allergen names from raw OCR text.
 *
 * All pattern matching runs on lowerRaw (lowercased, punctuation preserved) so
 * that colon/period/question-mark terminators in the patterns work correctly.
 * lower (punctuation replaced by spaces) is only used for the final full-text
 * keyword scan, where the space-normalisation helps keywords match regardless of
 * surrounding punctuation (e.g. "sesame," → "sesame ").
 *
 * Because lower and lowerRaw are the same length (1:1 char replacement),
 * match positions from lowerRaw patterns are used directly to blank out those
 * ranges in lower before the full-text scan — preventing trace-only allergens
 * from being misclassified as declared.
 *
 * Step 1 — explicit "Contains:" / "Allergens:" sections → declared
 * Step 2 — cross-contamination / facility warnings → traces + facilityWarnings
 * Step 3 — full-text keyword scan on traces-stripped lower → declared (fallback)
 * Step 4 — allergens in declared are removed from traces
 */
export function extractAllergensFromOcr(rawText: string): OcrExtractionResult {
  if (!rawText.trim()) {
    return {detected: [], traces: [], facilityWarnings: [], rawText};
  }

  // lowerRaw — lowercase only; punctuation intact so pattern terminators work
  const lowerRaw = rawText.toLowerCase();
  // lower — punctuation replaced by spaces; used only for full-text keyword scan
  const lower = lowerRaw.replace(/[^a-z0-9\s]/g, ' ');

  const declaredFound = new Set<string>();
  const tracesFound  = new Set<string>();
  const facilityWarnings: string[] = [];

  // ── Step 1: explicit declared sections (run on lowerRaw — colon must survive) ──
  const declaredPatterns = [
    /contains?:\s*([^.!?\n]+)/gi,
    /allergens?:\s*([^.!?\n]+)/gi,
    /allergy (?:advice|information):?\s*([^.!?\n]+)/gi,
  ];
  for (const pattern of declaredPatterns) {
    let match;
    while ((match = pattern.exec(lowerRaw)) !== null) {
      const section = match[match.length - 1] ?? '';
      for (const [name, kws] of Object.entries(ALLERGEN_KEYWORDS)) {
        if (kws.some(kw => section.includes(kw))) {
          declaredFound.add(name);
        }
      }
    }
  }

  // ── Step 2: cross-contamination / facility warnings → traces ─────────────
  // Run on lowerRaw so . ! ? sentence terminators work correctly.
  // Facility pattern does NOT require "also" or a specific verb after
  // "that/which" — real labels use "uses", "processes", "handles", etc.
  const tracesPatterns = [
    /may contain:?[^.!?\n]*/gi,
    /(?:processed|manufactured|made|produced|packaged)\s+(?:in|at|on)\s+(?:a\s+)?(?:facility|plant|equipment|line)\s+(?:that|which)[^.!?\n]*/gi,
    /manufactured\s+on\s+(?:shared\s+)?equipment[^.!?\n]*/gi,
    /processed\s+on\s+(?:shared\s+)?equipment[^.!?\n]*/gi,
    /may\s+be\s+(?:present|manufactured|processed)[^.!?\n]*/gi,
    /cross.?contaminat\w*[^.!?\n]*/gi,
  ];

  // Collect ranges to blank out in lower (positions are identical since
  // lower and lowerRaw differ only by 1:1 char substitution, same length).
  const tracesRanges: Array<{start: number; end: number}> = [];

  for (const pattern of tracesPatterns) {
    let match;
    while ((match = pattern.exec(lowerRaw)) !== null) {
      tracesRanges.push({start: match.index, end: match.index + match[0].length});

      const segment = match[0];
      const matchedAllergens: string[] = [];
      for (const [name, kws] of Object.entries(ALLERGEN_KEYWORDS)) {
        if (kws.some(kw => segment.includes(kw))) {
          tracesFound.add(name);
          matchedAllergens.push(name);
        }
      }

      // Only surface verbatim text when a recognised allergen is present
      if (matchedAllergens.length > 0) {
        const sentence = segment.trim().replace(/\s+/g, ' ');
        const display = sentence.charAt(0).toUpperCase() + sentence.slice(1);
        if (display && !facilityWarnings.includes(display)) {
          facilityWarnings.push(display);
        }
      }
    }
  }

  // ── Step 3: full-text scan on traces-stripped lower → declared (fallback) ─
  // Blank out every traces range so trace-only allergens don't bleed into declared.
  let ingredientsText = lower;
  for (const {start, end} of tracesRanges) {
    ingredientsText =
      ingredientsText.substring(0, start) +
      ' '.repeat(end - start) +
      ingredientsText.substring(end);
  }
  for (const [name, kws] of Object.entries(ALLERGEN_KEYWORDS)) {
    if (kws.some(kw => ingredientsText.includes(kw))) {
      declaredFound.add(name);
    }
  }

  // ── Step 4: allergens confirmed declared take priority over traces ─────────
  for (const name of declaredFound) {
    tracesFound.delete(name);
  }

  return {
    detected: Array.from(declaredFound).sort(),
    traces:   Array.from(tracesFound).sort(),
    facilityWarnings,
    rawText,
  };
}
