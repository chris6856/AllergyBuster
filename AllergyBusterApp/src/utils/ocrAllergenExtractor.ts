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
 * Step 1 — explicit "Contains:" / "Allergens:" sections → declared
 * Step 2 — cross-contamination / facility warnings → traces + verbatim facilityWarnings
 * Step 3 — full-text keyword scan on traces-stripped text → declared (fallback)
 * Step 4 — allergens already in declared are removed from traces
 *
 * facilityWarnings contains the verbatim matched sentence only when it
 * includes at least one recognised allergen keyword.
 */
export function extractAllergensFromOcr(rawText: string): OcrExtractionResult {
  if (!rawText.trim()) {
    return {detected: [], traces: [], facilityWarnings: [], rawText};
  }

  // lower — punctuation replaced by spaces; used for allergen keyword matching
  const lower = rawText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  // lowerRaw — only lowercased; used for capturing readable warning sentences
  const lowerRaw = rawText.toLowerCase();

  const declaredFound = new Set<string>();
  const tracesFound = new Set<string>();
  const facilityWarnings: string[] = [];

  // ── Step 1: explicit declared sections ───────────────────────────────────
  const declaredPatterns = [
    /contains?:\s*([^.!?\n]+)/gi,
    /allergens?:\s*([^.!?\n]+)/gi,
    /allergy (?:advice|information):?\s*([^.!?\n]+)/gi,
  ];
  for (const pattern of declaredPatterns) {
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      const section = match[match.length - 1] ?? '';
      for (const [name, kws] of Object.entries(ALLERGEN_KEYWORDS)) {
        if (kws.some(kw => section.includes(kw))) {
          declaredFound.add(name);
        }
      }
    }
  }

  // ── Step 2: cross-contamination / facility warnings ───────────────────────
  // Patterns match whole warning sentences — allergens are scanned from the
  // full match, not just a trailing capture group.
  const tracesPatternSources = [
    /may contain:?[^.!?\n]*/gi,
    /(?:processed|manufactured|made|produced|packaged)\s+(?:in|at|on)\s+(?:a\s+)?(?:facility|plant|equipment|line)\s+(?:that|which)\s+also\s+(?:produces?|processes?|handles?|makes?)[^.!?\n]*/gi,
    /manufactured\s+on\s+(?:shared\s+)?equipment[^.!?\n]*/gi,
    /processed\s+on\s+(?:shared\s+)?equipment[^.!?\n]*/gi,
    /may\s+be\s+(?:present|manufactured|processed)[^.!?\n]*/gi,
    /cross.?contaminat\w*[^.!?\n]*/gi,
  ];

  for (let i = 0; i < tracesPatternSources.length; i++) {
    const patternStr = tracesPatternSources[i].source;
    const patternFlags = tracesPatternSources[i].flags;

    // Use the punctuation-stripped version for allergen keyword matching
    const matchPattern = new RegExp(patternStr, patternFlags);
    let match;
    while ((match = matchPattern.exec(lower)) !== null) {
      const segment = match[0];
      const matchedAllergens: string[] = [];
      for (const [name, kws] of Object.entries(ALLERGEN_KEYWORDS)) {
        if (kws.some(kw => segment.includes(kw))) {
          tracesFound.add(name);
          matchedAllergens.push(name);
        }
      }

      // Only capture verbatim warning text if it contains a recognised allergen
      if (matchedAllergens.length > 0) {
        // Find the equivalent match in lowerRaw for a readable sentence
        const displayPattern = new RegExp(patternStr, patternFlags);
        displayPattern.lastIndex = match.index;
        const displayMatch = displayPattern.exec(lowerRaw);
        if (displayMatch) {
          const sentence = displayMatch[0].trim().replace(/\s+/g, ' ');
          const display = sentence.charAt(0).toUpperCase() + sentence.slice(1);
          if (display && !facilityWarnings.includes(display)) {
            facilityWarnings.push(display);
          }
        }
      }
    }
  }

  // ── Step 3: full-text scan on traces-stripped text → declared (fallback) ─
  // Removing traces segments first prevents trace-only allergens from being
  // misclassified as directly declared.
  let ingredientsText = lower;
  for (const pattern of tracesPatternSources) {
    pattern.lastIndex = 0;
    ingredientsText = ingredientsText.replace(pattern, ' ');
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
    traces: Array.from(tracesFound).sort(),
    facilityWarnings,
    rawText,
  };
}
