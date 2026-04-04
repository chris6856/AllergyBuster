import {ALLERGEN_KEYWORDS} from '../constants/allergens';

export interface OcrExtractionResult {
  detected: string[];
  rawText: string;
}

/**
 * Extracts allergen names from raw OCR text.
 *
 * Handles common label patterns:
 *  - "Contains: milk, wheat, soy"
 *  - "Allergens: peanuts"
 *  - "May contain: tree nuts, sesame"
 *  - General ingredient keyword scanning as a fallback
 */
export function extractAllergensFromOcr(rawText: string): OcrExtractionResult {
  if (!rawText.trim()) {
    return {detected: [], rawText};
  }

  // Normalise: lowercase and replace punctuation/special chars with spaces
  // so "wheat," "milk." "(soy)" all match their keywords
  const lower = rawText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const found = new Set<string>();

  // Pattern 1: explicit "Contains:" / "Allergens:" sections
  const containsPatterns = [
    /contains?:\s*([^.!?\n]+)/gi,
    /allergens?:\s*([^.!?\n]+)/gi,
    /may contain:?\s*([^.!?\n]+)/gi,
    /allergy (advice|information):?\s*([^.!?\n]+)/gi,
  ];

  for (const pattern of containsPatterns) {
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      // Grab the capture group (last group handles "allergy information:" format)
      const section = match[match.length - 1] ?? '';
      for (const [allergenName, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
        if (keywords.some(kw => section.includes(kw))) {
          found.add(allergenName);
        }
      }
    }
  }

  // Pattern 2: full-text keyword scan (catches ingredients lists)
  for (const [allergenName, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      found.add(allergenName);
    }
  }

  return {
    detected: Array.from(found).sort(),
    rawText,
  };
}
