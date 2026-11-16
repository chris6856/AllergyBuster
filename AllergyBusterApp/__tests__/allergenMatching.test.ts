import {
  canonicalAllergenKeys,
  isProfileAllergen,
  matchProfile,
} from '../src/utils/allergenMatching';
import {extractAllergensFromText, parseAllergens} from '../src/utils/allergenParser';
import {extractAllergensFromOcr} from '../src/utils/ocrAllergenExtractor';
import {containsKeyword} from '../src/utils/keywordMatch';

describe('containsKeyword', () => {
  it('keeps substring matching for long keywords', () => {
    expect(containsKeyword('cultured buttermilk', 'milk')).toBe(true);
    expect(containsKeyword('anhydrous milkfat', 'milk')).toBe(true);
  });

  it('requires a leading boundary for short keywords', () => {
    expect(containsKeyword('rolled oats', 'oat')).toBe(true);
    expect(containsKeyword('oatmeal', 'oat')).toBe(true);
    expect(containsKeyword('candy coating', 'oat')).toBe(false);
    expect(containsKeyword('goat cheese', 'oat')).toBe(false);
  });

  it('requires both boundaries for "til"', () => {
    expect(containsKeyword('til seeds', 'til')).toBe(true);
    expect(containsKeyword('flour tortilla', 'til')).toBe(false);
    expect(containsKeyword('red lentils', 'til')).toBe(false);
    expect(containsKeyword('distilled vinegar', 'til')).toBe(false);
  });
});

describe('butter context', () => {
  it.each([
    'peanut butter',
    'organic almond butter',
    'cocoa butter',
    'shea butter',
    'apple butter',
    'sunflower seed butter',
    'roasted butternut squash',
    'butterfly pea flower extract',
    'nut-butter filling',
  ])('"%s" is not milk', text => {
    expect(containsKeyword(text, 'butter')).toBe(false);
    expect(extractAllergensFromText(text)).not.toContain('Milk');
  });

  it.each([
    'butter',
    'unsalted butter, sugar',
    'butterfat',
    'butter oil',
    'cultured buttermilk',
    'butterscotch chips (sugar, butter)',
    'peanut butter, butter, salt',
  ])('"%s" is milk', text => {
    expect(extractAllergensFromText(text)).toContain('Milk');
  });

  it('peanut butter still reports peanuts', () => {
    expect(extractAllergensFromText('peanut butter')).toEqual(['Peanuts']);
  });
});

describe('extractAllergensFromText (regressions)', () => {
  it('no longer reports sesame for tortillas, lentils or distilled vinegar', () => {
    const found = extractAllergensFromText('flour tortilla, red lentils, distilled vinegar');
    expect(found).not.toContain('Sesame');
  });

  it('still detects the common allergens', () => {
    const found = extractAllergensFromText(
      'enriched wheat flour, whey, eggs, peanuts, soy lecithin, sesame seeds, almonds',
    );
    expect(found).toEqual(
      expect.arrayContaining(['Gluten', 'Milk', 'Eggs', 'Peanuts', 'Soy', 'Sesame', 'Tree Nuts']),
    );
  });

  it('parseAllergens maps OFF tags to display names', () => {
    const info = parseAllergens(['en:milk', 'en:soybeans'], ['en:nuts'], '');
    expect(info.declared).toEqual(['Milk', 'Soybeans']);
    expect(info.traces).toEqual(['Tree Nuts']);
  });
});

describe('OCR extractor (regressions)', () => {
  it('separates declared from may-contain', () => {
    const r = extractAllergensFromOcr(
      'Ingredients: wheat flour, sugar, milk. Contains: wheat, milk. May contain peanuts.',
    );
    expect(r.detected).toEqual(expect.arrayContaining(['Gluten', 'Milk']));
    expect(r.traces).toEqual(['Peanuts']);
  });

  it('does not flag sesame on a tortilla label', () => {
    const r = extractAllergensFromOcr('Ingredients: corn masa flour, water, lime. Corn tortillas.');
    expect(r.detected).not.toContain('Sesame');
  });
});

describe('canonicalAllergenKeys', () => {
  it.each([
    ['Milk', 'Milk'],
    ['Dairy', 'Milk'],
    ['Almonds', 'Tree Nuts'],
    ['Soybeans', 'Soy'],
    ['Wheat', 'Gluten'],
    ['Crustaceans', 'Shellfish'],
    ['Sulphur Dioxide / Sulphites', 'Sulphites'],
    ['Brazil Nuts', 'Tree Nuts'],
  ])('%s -> %s', (name, key) => {
    expect(canonicalAllergenKeys(name)).toEqual([key]);
  });

  it('returns nothing for names outside the profile list', () => {
    expect(canonicalAllergenKeys('Kiwi')).toEqual([]);
  });
});

describe('matchProfile', () => {
  it('matches declared and trace allergens by profile key', () => {
    const m = matchProfile(
      {declared: ['Almonds', 'Wheat'], traces: ['Peanuts', 'Milk']},
      ['Tree Nuts', 'Peanuts'],
    );
    expect(m.declared).toEqual(['Tree Nuts']);
    expect(m.traces).toEqual(['Peanuts']);
  });

  it('does not list an allergen as a trace when it is also declared', () => {
    const m = matchProfile({declared: ['Milk'], traces: ['Dairy']}, ['Milk']);
    expect(m.declared).toEqual(['Milk']);
    expect(m.traces).toEqual([]);
  });

  it('returns no matches for an empty profile', () => {
    const m = matchProfile({declared: ['Milk'], traces: []}, []);
    expect(m).toEqual({declared: [], traces: []});
    expect(isProfileAllergen('Milk', [])).toBe(false);
  });
});
