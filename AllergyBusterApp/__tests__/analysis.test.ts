import {analyzeProduct} from '../src/analysis';
import {analyzeAdditives, lookupAdditive} from '../src/analysis/additives';
import {analyzeFragrance} from '../src/analysis/fragrance';
import {analyzeNutrition} from '../src/analysis/nutrition';
import {analyzeWarnings} from '../src/analysis/warnings';
import {DEFAULT_PREFERENCES, Preferences} from '../src/types/preferences';
import {ProductRecord} from '../src/types/product';

function product(over: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: '1',
    name: 'Test',
    brand: '',
    allergens: {declared: [], traces: []},
    ingredientsText: 'water, sugar',
    source: 'openfoodfacts',
    gtin: '0000000000001',
    category: 'food',
    categoryTags: [],
    additives: [],
    labels: [],
    ingredientsAnalysis: [],
    novaGroup: null,
    packaging: [],
    nutrition: null,
    completeness: {hasIngredients: true, hasAllergenTags: false, hasNutrition: false, hasPackaging: false, sourceScore: null},
    sourceUpdatedAt: null,
    fetchedAt: '2026-11-20T00:00:00.000Z',
    ...over,
  };
}

const prefs = (over: Partial<Preferences> = {}): Preferences => ({...DEFAULT_PREFERENCES, ...over});
const ids = (s: {findings: {id: string}[]}) => s.findings.map(f => f.id);
const ALL_STATUSES = ['documented', 'potential_concern', 'insufficient_information', 'reviewed_no_concern'];

describe('additives', () => {
  it('uses the bundled OFF taxonomy', () => {
    expect(lookupAdditive('en:e340')).toMatchObject({eNumber: 'E340', name: 'Potassium phosphates'});
    expect(lookupAdditive('EN:E322')?.name).toBe('Lecithins');
  });

  it('flags EFSA overexposure risk with the evaluation date and link', () => {
    const s = analyzeAdditives(product({additives: ['en:e322', 'en:e340']}));
    expect(s.status).toBe('potential_concern');
    expect(s.level).toBe('caution');
    expect(s.findings[0]).toMatchObject({level: 'caution', title: 'E340 · Potassium phosphates'});
    expect(s.findings[0].detail).toMatch(/high risk that some people's intake exceeds the acceptable daily intake/);
    expect(s.findings[0].source).toMatchObject({name: 'EFSA evaluation', date: '2019-06-12'});
    expect(s.findings[1]).toMatchObject({level: 'info', title: 'E322 · Lecithins'});
  });

  it('distinguishes "no additives" from "no data" and unknown codes', () => {
    expect(analyzeAdditives(product()).status).toBe('reviewed_no_concern');
    expect(analyzeAdditives(product({ingredientsText: '', completeness: {...product().completeness, hasIngredients: false}})).status).toBe('insufficient_information');
    const s = analyzeAdditives(product({additives: ['en:e322', 'en:e99999']}));
    expect(s.status).toBe('insufficient_information');
    expect(ids(s)).toContain('additive-unknown');
  });
});

describe('nutrition', () => {
  const withNutrition = product({
    nutrition: {
      per100: {energyKcal: 400, sugars: 30, addedSugars: 25, sodium: 1.2, fiber: 2, proteins: 5},
      perServing: null,
      servingSize: '40 g',
      servingGrams: 40,
    },
    novaGroup: 4,
  });

  it('only compares against limits the user enabled', () => {
    expect(ids(analyzeNutrition(withNutrition, prefs()))).toEqual(['nutrition-overview', 'nutrition-nova']);
  });

  it('computes per-serving values from per 100 g and flags limits', () => {
    const s = analyzeNutrition(withNutrition, prefs({
      addedSugar: {enabled: true, limitPerServingG: 5},
      sodium: {enabled: true, limitPerServingMg: 600},
    }));
    // 25 g/100 g × 40 g = 10 g; 1.2 g/100 g × 40 g = 480 mg
    expect(s.findings.find(f => f.id === 'nutrition-sugar-over')?.title).toBe('Added sugar 10 g per serving (40 g)');
    expect(s.findings.find(f => f.id === 'nutrition-sodium-ok')?.title).toBe('Sodium 480 mg per serving (40 g)');
    expect(s.level).toBe('caution');
  });

  it('says when per-serving data is missing instead of guessing', () => {
    const p = product({nutrition: {per100: {sugars: 10}, perServing: null, servingSize: null, servingGrams: null}});
    const s = analyzeNutrition(p, prefs({addedSugar: {enabled: true, limitPerServingG: 10}}));
    expect(ids(s)).toContain('nutrition-sugar-unknown');
  });

  it('reports missing nutrition as insufficient information', () => {
    expect(analyzeNutrition(product(), prefs()).status).toBe('insufficient_information');
  });
});

describe('fragrance', () => {
  const shampoo = product({
    category: 'personal_care',
    ingredientsText: 'Aqua, Sodium Laureth Sulfate, Parfum, Linalool, Limonene, Hexyl Cinnamal, Benzyl Alcohol',
  });

  it('finds parfum and EU-listed fragrance allergens', () => {
    const s = analyzeFragrance(shampoo, true);
    expect(ids(s)).toEqual(['fragrance-term', 'fragrance-eu-allergens']);
    expect(s.findings[1].title).toBe('EU-listed fragrance allergens: benzyl alcohol, hexyl cinnamal, limonene, linalool');
    expect(s.level).toBe('caution');
    expect(s.status).toBe('documented');
  });

  it('does not report a short name found only inside a longer one', () => {
    const s = analyzeFragrance(product({ingredientsText: 'aqua, amyl cinnamal, hexyl cinnamal'}), true);
    expect(s.findings[0].title).toBe('EU-listed fragrance allergens: amyl cinnamal, hexyl cinnamal');
    const both = analyzeFragrance(product({ingredientsText: 'cinnamal, hexyl cinnamal'}), true);
    expect(both.findings[0].title).toBe('EU-listed fragrance allergens: cinnamal, hexyl cinnamal');
  });

  it('is informational when the user did not ask to highlight fragrance', () => {
    expect(analyzeFragrance(shampoo, false).level).toBe('info');
  });

  it('does not treat "aroma" or partial words as fragrance', () => {
    const s = analyzeFragrance(product({ingredientsText: 'aqua, aroma, perfumery-grade glycerin? no; dlimonenex'}), true);
    expect(s.status).toBe('reviewed_no_concern');
  });
});

describe('label warnings', () => {
  it('detects signal words from label text, most serious first', () => {
    const s = analyzeWarnings('WARNING: Eye irritant. Causes serious eye irritation. Keep out of reach of children. DANGER: corrosive', 'label photo');
    expect(s.findings.map(f => f.level)).toEqual(['alert', 'alert', 'caution', 'caution', 'info']);
    expect(s.level).toBe('alert');
  });

  it('only calls "nothing found" reviewed when the text is a label photo', () => {
    expect(analyzeWarnings('aqua, surfactant', 'database').status).toBe('insufficient_information');
    expect(analyzeWarnings('aqua, surfactant', 'label photo').status).toBe('reviewed_no_concern');
    expect(analyzeWarnings('', 'database').status).toBe('insufficient_information');
  });
});

describe('analyzeProduct', () => {
  it('food: allergy first, then sections by concern; respects preferences', () => {
    const p = product({allergens: {declared: ['Milk'], traces: []}, additives: ['en:e340']});
    const a = analyzeProduct(p, ['Milk'], prefs());
    expect(a.sections.map(s => s.id)).toEqual(['allergy', 'additives', 'nutrition', 'packaging']);
    expect(a.sections[0].level).toBe('alert');
    expect(a.sections[0].summary).toBe('Contains your allergens: Milk / Dairy');

    const noExtras = analyzeProduct(p, [], prefs({additives: false, packaging: false}));
    expect(noExtras.sections.map(s => s.id)).toEqual(['allergy', 'nutrition']);
  });

  it('personal care: allergy + fragrance', () => {
    const a = analyzeProduct(product({category: 'personal_care', ingredientsText: 'aqua, parfum'}), [], prefs({packaging: false}));
    expect(a.sections.map(s => s.id)).toEqual(['allergy', 'fragrance']);
  });

  it('household: warnings first, uses label photo text when given', () => {
    const p = product({category: 'household', ingredientsText: 'water, sodium hypochlorite'});
    const a = analyzeProduct(p, [], prefs({packaging: false}), {labelText: 'DANGER: Corrosive. Do not mix with ammonia.'});
    expect(a.sections[0].id).toBe('warnings');
    expect(a.sections[0].level).toBe('alert');
    expect(a.sections.map(s => s.id)).not.toContain('allergy');
  });

  it('never produces anything but the four evidence statuses', () => {
    const cases = [product(), product({category: 'personal_care'}), product({category: 'household'}), product({category: 'other'})];
    for (const c of cases) {
      for (const s of analyzeProduct(c, ['Milk'], prefs({fragrance: true})).sections) {
        expect(ALL_STATUSES).toContain(s.status);
      }
    }
  });
});
