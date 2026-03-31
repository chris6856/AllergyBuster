// Maps Open Food Facts tag format (e.g. "en:milk") to display names
// Covers EU 14 major allergens + US Big 9
export const ALLERGEN_TAG_MAP: Record<string, string> = {
  'en:gluten': 'Gluten',
  'en:wheat': 'Wheat',
  'en:rye': 'Rye',
  'en:barley': 'Barley',
  'en:oats': 'Oats',
  'en:crustaceans': 'Crustaceans',
  'en:shellfish': 'Shellfish',
  'en:eggs': 'Eggs',
  'en:fish': 'Fish',
  'en:peanuts': 'Peanuts',
  'en:soybeans': 'Soybeans',
  'en:soy': 'Soy',
  'en:milk': 'Milk',
  'en:dairy': 'Dairy',
  'en:nuts': 'Tree Nuts',
  'en:almonds': 'Almonds',
  'en:hazelnuts': 'Hazelnuts',
  'en:walnuts': 'Walnuts',
  'en:cashews': 'Cashews',
  'en:pecans': 'Pecans',
  'en:pistachios': 'Pistachios',
  'en:macadamia-nuts': 'Macadamia Nuts',
  'en:celery': 'Celery',
  'en:mustard': 'Mustard',
  'en:sesame-seeds': 'Sesame',
  'en:sesame': 'Sesame',
  'en:sulphur-dioxide': 'Sulphur Dioxide / Sulphites',
  'en:sulphites': 'Sulphites',
  'en:lupin': 'Lupin',
  'en:molluscs': 'Molluscs',
};

// Keywords used for ingredient text scanning (OCR + fallback parsing)
export const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  Gluten: ['gluten', 'wheat', 'barley', 'rye', 'oat', 'spelt', 'kamut', 'triticale'],
  Milk: ['milk', 'dairy', 'lactose', 'butter', 'cream', 'cheese', 'whey', 'casein'],
  Eggs: ['egg', 'eggs', 'albumin', 'mayonnaise'],
  Fish: ['fish', 'cod', 'salmon', 'tuna', 'tilapia', 'pollock', 'bass', 'flounder', 'anchovy'],
  Shellfish: ['shellfish', 'shrimp', 'crab', 'lobster', 'crawfish', 'clam', 'oyster', 'scallop', 'mussel'],
  'Tree Nuts': ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'pine nut'],
  Peanuts: ['peanut', 'groundnut', 'arachis oil'],
  Soy: ['soy', 'soya', 'soybean', 'tofu', 'miso', 'tempeh', 'edamame'],
  Sesame: ['sesame', 'tahini', 'til', 'gingelly'],
  Mustard: ['mustard'],
  Celery: ['celery', 'celeriac'],
  Lupin: ['lupin', 'lupine'],
  Sulphites: ['sulphite', 'sulfite', 'sulphur dioxide', 'sulfur dioxide', 'so2'],
  Molluscs: ['mollusc', 'mollusk', 'squid', 'octopus', 'snail', 'abalone'],
};

export const ALL_ALLERGEN_NAMES = Object.keys(ALLERGEN_KEYWORDS);
