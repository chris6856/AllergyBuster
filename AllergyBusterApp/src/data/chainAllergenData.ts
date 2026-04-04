/**
 * Static allergen data for major restaurant chains.
 *
 * HOW TO ADD A NEW CHAIN
 * ──────────────────────
 * 1. Copy an existing entry below and paste it at the end of the array.
 * 2. Fill in the fields:
 *    - id:          unique slug, e.g. 'chick-fil-a'
 *    - name:        display name shown in the app
 *    - aliases:     search terms that should match this chain (lowercase)
 *    - cuisineType: short description shown under the name
 *    - sourceUrl:   URL of the restaurant's published allergen guide
 *    - lastUpdated: date you pulled the data (YYYY-MM-DD)
 *    - menuItems:   key menu items with declared allergens and may-contain list
 * 3. Run the app — the chain appears automatically in search results.
 *
 * DATA ACCURACY NOTE
 * ──────────────────
 * Menus and recipes change frequently. Always verify against the
 * restaurant's current published allergen guide (sourceUrl) before relying
 * on this data. The app displays a caveat to users on every result.
 */

export interface ChainMenuItem {
  name: string;
  allergens: {
    declared: string[];
    mayContain: string[];
    dataAvailable: boolean;
  };
  description?: string;
}

export interface ChainRestaurant {
  id: string;
  name: string;
  aliases: string[];         // lowercase search terms
  cuisineType: string;
  sourceUrl: string;
  lastUpdated: string;       // YYYY-MM-DD
  menuItems: ChainMenuItem[];
}

export const CHAIN_ALLERGEN_DATA: ChainRestaurant[] = [
  {
    id: 'mcdonalds',
    name: "McDonald's",
    aliases: ["mcdonald's", 'mcdonalds', 'mcd', 'mickey d'],
    cuisineType: 'Fast Food · Burgers',
    sourceUrl: 'https://www.mcdonalds.com/us/en-us/about-our-food/nutrition-calculator.html',
    lastUpdated: '2026-01-01',
    menuItems: [
      {
        name: 'Big Mac',
        description: 'Two beef patties, special sauce, lettuce, cheese, pickles, onions on a sesame seed bun',
        allergens: {declared: ['Gluten', 'Milk', 'Sesame', 'Soy'], mayContain: ['Eggs', 'Fish'], dataAvailable: true},
      },
      {
        name: 'Egg McMuffin',
        description: 'Canadian bacon, egg, and American cheese on an English muffin',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'French Fries',
        allergens: {declared: ['Gluten', 'Milk'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'McFlurry (Oreo)',
        allergens: {declared: ['Gluten', 'Milk', 'Soy'], mayContain: ['Peanuts', 'Tree Nuts'], dataAvailable: true},
      },
      {
        name: 'Chicken McNuggets (10 pc)',
        allergens: {declared: ['Gluten', 'Milk', 'Soy'], mayContain: ['Eggs'], dataAvailable: true},
      },
      {
        name: 'Filet-O-Fish',
        allergens: {declared: ['Gluten', 'Fish', 'Milk', 'Soy'], mayContain: ['Eggs'], dataAvailable: true},
      },
      {
        name: 'Pancakes',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Apple Pie',
        allergens: {declared: ['Gluten', 'Soy'], mayContain: ['Milk'], dataAvailable: true},
      },
    ],
  },

  {
    id: 'chipotle',
    name: 'Chipotle',
    aliases: ['chipotle', 'chipotle mexican grill'],
    cuisineType: 'Mexican · Fast Casual',
    sourceUrl: 'https://www.chipotle.com/allergens',
    lastUpdated: '2026-01-01',
    menuItems: [
      {
        name: 'Flour Tortilla (Burrito/Quesadilla)',
        allergens: {declared: ['Gluten', 'Soy'], mayContain: ['Milk', 'Eggs', 'Tree Nuts', 'Peanuts', 'Sesame', 'Fish', 'Shellfish'], dataAvailable: true},
      },
      {
        name: 'Corn Tortilla (Tacos)',
        allergens: {declared: [], mayContain: ['Gluten', 'Soy', 'Milk', 'Eggs', 'Tree Nuts', 'Peanuts', 'Sesame', 'Fish', 'Shellfish'], dataAvailable: true},
      },
      {
        name: 'Chicken',
        allergens: {declared: [], mayContain: ['Gluten', 'Soy', 'Milk', 'Eggs', 'Tree Nuts', 'Peanuts', 'Sesame', 'Fish', 'Shellfish'], dataAvailable: true},
      },
      {
        name: 'Steak',
        allergens: {declared: ['Soy'], mayContain: ['Gluten', 'Milk', 'Eggs', 'Tree Nuts', 'Peanuts', 'Sesame', 'Fish', 'Shellfish'], dataAvailable: true},
      },
      {
        name: 'Carnitas',
        allergens: {declared: [], mayContain: ['Gluten', 'Soy', 'Milk', 'Eggs', 'Tree Nuts', 'Peanuts', 'Sesame', 'Fish', 'Shellfish'], dataAvailable: true},
      },
      {
        name: 'Cheese',
        allergens: {declared: ['Milk'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Sour Cream',
        allergens: {declared: ['Milk'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Guacamole',
        allergens: {declared: [], mayContain: ['Gluten', 'Soy', 'Milk', 'Eggs', 'Tree Nuts', 'Peanuts', 'Sesame', 'Fish', 'Shellfish'], dataAvailable: true},
      },
      {
        name: 'Vinaigrette Dressing',
        allergens: {declared: ['Soy'], mayContain: ['Gluten', 'Milk', 'Eggs', 'Tree Nuts', 'Peanuts', 'Sesame', 'Fish', 'Shellfish'], dataAvailable: true},
      },
    ],
  },

  {
    id: 'chick-fil-a',
    name: 'Chick-fil-A',
    aliases: ['chick-fil-a', 'chick fil a', 'chickfila', 'cfa'],
    cuisineType: 'Fast Food · Chicken',
    sourceUrl: 'https://www.chick-fil-a.com/menu-items/nutrition',
    lastUpdated: '2026-01-01',
    menuItems: [
      {
        name: 'Original Chicken Sandwich',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Spicy Chicken Sandwich',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Chick-fil-A Nuggets (8 pc)',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Grilled Chicken Sandwich',
        allergens: {declared: ['Gluten', 'Milk', 'Soy'], mayContain: ['Eggs'], dataAvailable: true},
      },
      {
        name: 'Waffle Potato Fries (Medium)',
        allergens: {declared: [], mayContain: ['Milk'], dataAvailable: true},
      },
      {
        name: 'Mac & Cheese',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Chocolate Chunk Cookie',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy', 'Tree Nuts'], mayContain: ['Peanuts'], dataAvailable: true},
      },
      {
        name: 'Icedream Cone',
        allergens: {declared: ['Gluten', 'Milk', 'Soy'], mayContain: ['Eggs'], dataAvailable: true},
      },
    ],
  },

  {
    id: 'subway',
    name: 'Subway',
    aliases: ['subway'],
    cuisineType: 'Fast Food · Sandwiches',
    sourceUrl: 'https://www.subway.com/en-US/MenuNutrition/Nutrition/AllergenInfo',
    lastUpdated: '2026-01-01',
    menuItems: [
      {
        name: 'Italian (White) Bread',
        allergens: {declared: ['Gluten', 'Soy'], mayContain: ['Milk', 'Eggs', 'Sesame'], dataAvailable: true},
      },
      {
        name: 'Honey Oat Bread',
        allergens: {declared: ['Gluten', 'Soy', 'Milk', 'Eggs'], mayContain: ['Sesame'], dataAvailable: true},
      },
      {
        name: 'Multigrain Flatbread',
        allergens: {declared: ['Gluten', 'Soy', 'Sesame'], mayContain: ['Milk', 'Eggs'], dataAvailable: true},
      },
      {
        name: 'Tuna Sub',
        allergens: {declared: ['Gluten', 'Fish', 'Eggs', 'Soy'], mayContain: ['Milk'], dataAvailable: true},
      },
      {
        name: 'Rotisserie-Style Chicken',
        allergens: {declared: ['Gluten', 'Soy'], mayContain: ['Milk', 'Eggs'], dataAvailable: true},
      },
      {
        name: 'Steak & Cheese Sub',
        allergens: {declared: ['Gluten', 'Milk', 'Soy'], mayContain: ['Eggs'], dataAvailable: true},
      },
      {
        name: 'Chocolate Chip Cookie',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: ['Peanuts', 'Tree Nuts'], dataAvailable: true},
      },
    ],
  },

  {
    id: 'olive-garden',
    name: 'Olive Garden',
    aliases: ['olive garden'],
    cuisineType: 'Italian · Casual Dining',
    sourceUrl: 'https://www.olivegarden.com/menu/allergen-info',
    lastUpdated: '2026-01-01',
    menuItems: [
      {
        name: 'Breadsticks',
        allergens: {declared: ['Gluten', 'Soy'], mayContain: ['Milk', 'Eggs'], dataAvailable: true},
      },
      {
        name: 'Fettuccine Alfredo',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Spaghetti with Marinara',
        allergens: {declared: ['Gluten', 'Soy'], mayContain: ['Milk', 'Eggs'], dataAvailable: true},
      },
      {
        name: 'Chicken Parmigiana',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Lasagna Classico',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Soup — Zuppa Toscana',
        allergens: {declared: ['Milk', 'Soy'], mayContain: ['Gluten', 'Eggs'], dataAvailable: true},
      },
      {
        name: 'Tiramisu',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
    ],
  },

  {
    id: 'panera',
    name: 'Panera Bread',
    aliases: ['panera', 'panera bread'],
    cuisineType: 'Bakery · Café',
    sourceUrl: 'https://www.panerabread.com/en-us/articles/our-clean-ingredients.html',
    lastUpdated: '2026-01-01',
    menuItems: [
      {
        name: 'Sourdough Bread Bowl',
        allergens: {declared: ['Gluten', 'Soy'], mayContain: ['Milk', 'Eggs', 'Sesame'], dataAvailable: true},
      },
      {
        name: 'Broccoli Cheddar Soup',
        allergens: {declared: ['Milk', 'Gluten', 'Soy'], mayContain: ['Eggs'], dataAvailable: true},
      },
      {
        name: 'Mac & Cheese',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Fuji Apple Chicken Salad',
        allergens: {declared: ['Gluten', 'Soy', 'Tree Nuts'], mayContain: ['Milk', 'Eggs', 'Fish'], dataAvailable: true},
      },
      {
        name: 'Chocolate Chip Bagel',
        allergens: {declared: ['Gluten', 'Soy', 'Eggs', 'Milk'], mayContain: ['Sesame', 'Tree Nuts'], dataAvailable: true},
      },
      {
        name: 'Green Passion Smoothie',
        allergens: {declared: [], mayContain: ['Gluten', 'Soy', 'Milk', 'Tree Nuts'], dataAvailable: true},
      },
    ],
  },

  {
    id: 'taco-bell',
    name: 'Taco Bell',
    aliases: ['taco bell', 'tacobell'],
    cuisineType: 'Mexican · Fast Food',
    sourceUrl: 'https://www.tacobell.com/nutrition/allergens',
    lastUpdated: '2026-01-01',
    menuItems: [
      {
        name: 'Crunchy Taco',
        allergens: {declared: ['Gluten', 'Milk', 'Soy'], mayContain: ['Eggs', 'Sesame', 'Peanuts', 'Fish', 'Shellfish', 'Tree Nuts'], dataAvailable: true},
      },
      {
        name: 'Soft Taco',
        allergens: {declared: ['Gluten', 'Milk', 'Soy'], mayContain: ['Eggs', 'Sesame', 'Peanuts', 'Fish', 'Shellfish', 'Tree Nuts'], dataAvailable: true},
      },
      {
        name: 'Burrito Supreme',
        allergens: {declared: ['Gluten', 'Milk', 'Soy', 'Eggs'], mayContain: ['Sesame', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts'], dataAvailable: true},
      },
      {
        name: 'Nachos BellGrande',
        allergens: {declared: ['Gluten', 'Milk', 'Soy'], mayContain: ['Eggs', 'Sesame', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts'], dataAvailable: true},
      },
      {
        name: 'Cinnamon Twists',
        allergens: {declared: ['Gluten', 'Soy'], mayContain: ['Milk', 'Eggs', 'Tree Nuts', 'Peanuts', 'Sesame', 'Fish', 'Shellfish'], dataAvailable: true},
      },
    ],
  },

  {
    id: 'five-guys',
    name: 'Five Guys',
    aliases: ['five guys', 'fiveguys'],
    cuisineType: 'Fast Casual · Burgers',
    sourceUrl: 'https://www.fiveguys.com/fans/the-five-guys-story/allergen-guide',
    lastUpdated: '2026-01-01',
    menuItems: [
      {
        name: 'Regular Burger (bun)',
        allergens: {declared: ['Gluten', 'Soy', 'Sesame'], mayContain: ['Milk', 'Eggs'], dataAvailable: true},
      },
      {
        name: 'Burger Patty (no bun)',
        allergens: {declared: [], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Cajun Style Fries',
        allergens: {declared: [], mayContain: ['Gluten', 'Milk', 'Soy', 'Eggs'], dataAvailable: true},
      },
      {
        name: 'Five Guys Style Fries',
        allergens: {declared: [], mayContain: ['Gluten', 'Milk', 'Soy', 'Eggs'], dataAvailable: true},
      },
      {
        name: 'Milkshake (all flavors)',
        allergens: {declared: ['Milk', 'Soy'], mayContain: ['Gluten', 'Eggs', 'Peanuts', 'Tree Nuts'], dataAvailable: true},
      },
      {
        name: 'Hot Dog (bun)',
        allergens: {declared: ['Gluten', 'Milk', 'Soy', 'Sesame'], mayContain: ['Eggs'], dataAvailable: true},
      },
    ],
  },

  {
    id: 'starbucks',
    name: 'Starbucks',
    aliases: ['starbucks', 'sbux'],
    cuisineType: 'Coffee · Café',
    sourceUrl: 'https://www.starbucks.com/menu/nutrition',
    lastUpdated: '2026-01-01',
    menuItems: [
      {
        name: 'Caffè Latte (dairy milk)',
        allergens: {declared: ['Milk'], mayContain: ['Soy', 'Tree Nuts'], dataAvailable: true},
      },
      {
        name: 'Caffè Latte (oat milk)',
        allergens: {declared: ['Gluten'], mayContain: ['Milk', 'Soy', 'Tree Nuts'], dataAvailable: true},
      },
      {
        name: 'Frappuccino (Caramel)',
        allergens: {declared: ['Milk', 'Soy'], mayContain: ['Gluten', 'Tree Nuts', 'Eggs'], dataAvailable: true},
      },
      {
        name: 'Butter Croissant',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: ['Tree Nuts', 'Sesame'], dataAvailable: true},
      },
      {
        name: 'Chocolate Chip Cookie',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: ['Tree Nuts', 'Peanuts'], dataAvailable: true},
      },
      {
        name: 'Impossible Breakfast Sandwich',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Oatmeal (Classic)',
        allergens: {declared: ['Gluten'], mayContain: ['Milk', 'Tree Nuts', 'Soy'], dataAvailable: true},
      },
    ],
  },

  {
    id: 'wendys',
    name: "Wendy's",
    aliases: ["wendy's", 'wendys'],
    cuisineType: 'Fast Food · Burgers',
    sourceUrl: 'https://www.wendys.com/nutrition/allergen-information',
    lastUpdated: '2026-01-01',
    menuItems: [
      {
        name: "Dave's Single",
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy', 'Sesame'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Chicken Nuggets (10 pc)',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Spicy Chicken Sandwich',
        allergens: {declared: ['Gluten', 'Milk', 'Eggs', 'Soy', 'Sesame'], mayContain: [], dataAvailable: true},
      },
      {
        name: 'Natural Cut Fries (Medium)',
        allergens: {declared: ['Gluten'], mayContain: ['Milk'], dataAvailable: true},
      },
      {
        name: 'Frosty (Chocolate or Vanilla)',
        allergens: {declared: ['Milk', 'Soy'], mayContain: ['Gluten', 'Eggs', 'Tree Nuts', 'Peanuts'], dataAvailable: true},
      },
      {
        name: 'Chili',
        allergens: {declared: ['Gluten', 'Soy'], mayContain: ['Milk', 'Eggs'], dataAvailable: true},
      },
    ],
  },
];
