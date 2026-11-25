import {normalize as normalizeOff} from '../src/services/openFoodFacts';
import {normalize as normalizeEdamam} from '../src/services/edamam';
import {displayProductName, inferCategory, productListLabel, toGtin13} from '../src/utils/productRecord';

jest.mock('../src/services/http', () => ({offClient: {}, edamamClient: {}}));
jest.mock('../src/constants/config', () => ({EDAMAM_APP_ID: 'x', EDAMAM_APP_KEY: 'y'}));

// Trimmed from a real OFF response (Cheerios, 0016000275263), 2026-11-16.
const OFF_CHEERIOS = {
  code: '0016000275263',
  product_name: 'Cheerios',
  brands: 'General Mills',
  product_type: 'food',
  allergens_tags: [],
  traces_tags: [],
  ingredients_text: 'Whole grain oats, corn starch, sugar, salt, tripotassium phosphate',
  ingredients_analysis_tags: ['en:palm-oil-free', 'en:vegan-status-unknown'],
  additives_tags: ['en:e340', 'en:e340iii'],
  categories_tags: ['en:plant-based-foods', 'en:breakfast-cereals'],
  labels_tags: ['en:no-gluten', 'en:kosher'],
  nova_group: 3,
  packaging_tags: ['en:card-carton'],
  packaging_materials_tags: ['en:cardboard'],
  nutriments: {
    'energy-kcal_100g': 359,
    'fat_100g': 7.69,
    'sugars_100g': 5.13,
    'added-sugars_100g': 5.13,
    'sodium_100g': 0.487,
    'salt_100g': 1.2175,
    'fiber_100g': 10.3,
    'proteins_100g': 12.8,
    'sugars_serving': 2,
    'sodium_serving': 0.19,
  },
  serving_size: '1 ½ cup (39 g)',
  serving_quantity: '39',
  completeness: 0.8875,
  last_modified_t: 1787773558,
};

// Trimmed from a real Edamam /parser response for the same UPC, 2026-11-16.
const EDAMAM_CHEERIOS = {
  foodId: 'food_abc',
  label: 'Cheerios',
  brand: 'General Mills',
  category: 'Packaged foods',
  knownAs: 'Cheerios',
  foodContentsLabel:
    'Ingredients: Whole Grain Oats; Corn Starch; Sugar; Salt; Tripotassium Phosphate.',
  nutrients: {ENERC_KCAL: 366.7, FAT: 6.7, SUGAR: 4.56, 'SUGAR.added': 2.56, NA: 497.8, CHOLE: 0, FIBTG: 10.8, PROCNT: 13},
};

describe('Open Food Facts → ProductRecord', () => {
  const p = normalizeOff(OFF_CHEERIOS, '016000275263');

  it('keeps the 1.x fields', () => {
    expect(p.name).toBe('Cheerios');
    expect(p.brand).toBe('General Mills');
    expect(p.source).toBe('openfoodfacts');
    // "oats" is still detected from ingredients when OFF has no allergen tags
    expect(p.allergens.declared).toContain('Gluten');
  });

  it('adds 2.0 fields', () => {
    expect(p.gtin).toBe('0016000275263');
    expect(p.category).toBe('food');
    expect(p.additives).toEqual(['en:e340', 'en:e340iii']);
    expect(p.labels).toContain('en:no-gluten');
    expect(p.novaGroup).toBe(3);
    expect(p.packaging).toEqual(['en:card-carton', 'en:cardboard']);
    expect(p.sourceUpdatedAt).toMatch(/^2026-/);
  });

  it('maps nutrition per 100 g and per serving', () => {
    expect(p.nutrition?.per100).toMatchObject({energyKcal: 359, addedSugars: 5.13, sodium: 0.487});
    expect(p.nutrition?.perServing).toEqual({sugars: 2, sodium: 0.19});
    expect(p.nutrition?.servingGrams).toBe(39);
    expect(p.nutrition?.servingSize).toBe('1 ½ cup (39 g)');
  });

  it('reports completeness', () => {
    expect(p.completeness).toEqual({
      hasIngredients: true,
      hasAllergenTags: false,
      hasNutrition: true,
      hasPackaging: true,
      sourceScore: 0.8875,
    });
  });

  it('handles a bare record without crashing or inventing data', () => {
    const bare = normalizeOff({code: '12345678'}, '12345678');
    expect(bare.name).toBe('Unknown Product');
    expect(bare.nutrition).toBeNull();
    expect(bare.novaGroup).toBeNull();
    expect(bare.completeness.hasIngredients).toBe(false);
    expect(bare.allergens).toEqual({declared: [], traces: []});
  });
});

describe('Edamam → ProductRecord', () => {
  it('reads ingredients from foodContentsLabel and detects allergens', () => {
    const p = normalizeEdamam(EDAMAM_CHEERIOS, '016000275263');
    expect(p.ingredientsText.startsWith('Whole Grain Oats')).toBe(true);
    expect(p.allergens.declared).toContain('Gluten');
    expect(p.completeness.hasIngredients).toBe(true);
    expect(p.gtin).toBe('0016000275263');
  });

  it('converts sodium/cholesterol from mg and derives salt', () => {
    const n = normalizeEdamam(EDAMAM_CHEERIOS).nutrition!.per100;
    expect(n.sodium).toBeCloseTo(0.4978);
    expect(n.salt).toBeCloseTo(1.2445);
    expect(n.cholesterol).toBe(0);
    expect(n.addedSugars).toBe(2.56);
  });

  it('does not scan the product name when there is no ingredient list', () => {
    const p = normalizeEdamam({foodId: 'f', label: 'Peanut Butter Cups', knownAs: 'Peanut Butter Cups'});
    expect(p.ingredientsText).toBe('');
    expect(p.allergens.declared).toEqual([]);
    expect(p.completeness.hasIngredients).toBe(false);
  });
});

describe('helpers', () => {
  it.each([
    ['016000275263', '0016000275263'],
    ['0016000275263', '0016000275263'],
    ['04963406', '0000004963406'],
    ['abc', null],
    ['', null],
  ])('toGtin13(%s) = %s', (input, out) => {
    expect(toGtin13(input)).toBe(out);
  });

  it.each([
    ['food', [], 'food'],
    ['beauty', [], 'personal_care'],
    ['petfood', [], 'other'],
    ['product', ['en:laundry-detergents'], 'household'],
    ['product', ['en:dishwashing-liquids'], 'household'],
    ['product', ['en:shampoos'], 'personal_care'],
    ['product', ['en:smartphones'], 'other'],
    [undefined, [], 'food'],
  ])('inferCategory(%s, %j) = %s', (type, tags, expected) => {
    expect(inferCategory(type as string | undefined, tags as string[])).toBe(expected);
  });
});

describe('display names', () => {
  it.each([
    ['www.pg.com', 'P&G', 'P&G product'],
    ['https://example.com/x', '', 'Unnamed product'],
    ['pg.com', 'Procter & Gamble, P&G', 'Procter & Gamble product'],
    ['0068156986142', 'Seventh Generation', 'Seventh Generation product'],
    ['', 'Tums', 'Tums product'],
    ['Unknown Product', '', 'Unnamed product'],
    ['Antacid', 'Tums', 'Antacid'],
    ['Cheerios', 'General Mills', 'Cheerios'],
  ])('displayProductName(%j, %j) = %j', (name, brand, expected) => {
    expect(displayProductName(name, brand)).toBe(expected);
  });

  it('list labels add the brand once', () => {
    expect(productListLabel('Antacid', 'Tums')).toBe('Tums Antacid');
    expect(productListLabel('Pantene Strong Hold Hairspray', 'Pantene')).toBe('Pantene Strong Hold Hairspray');
    expect(productListLabel('www.pg.com', 'P&G')).toBe('P&G product');
    expect(productListLabel('Cheerios', '')).toBe('Cheerios');
  });
});
