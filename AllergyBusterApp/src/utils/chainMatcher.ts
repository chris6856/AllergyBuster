import {CHAIN_ALLERGEN_DATA, ChainRestaurant} from '../data/chainAllergenData';

const ALLERGEN_URLS: Record<string, string> = {
  'chipotle':             'https://www.chipotle.com/allergens',
  'chick-fil-a':          'https://www.chick-fil-a.com/menu-items/allergen-information',
  'five guys':            'https://www.fiveguys.com/allergen-information',
  'shake shack':          'https://www.shakeshack.com/food-safety-allergens/',
  'panera':               'https://www.panerabread.com/en-us/articles/allergen-menu.html',
  'starbucks':            'https://www.starbucks.com/menu/catalog/nutrition',
  'outback':              'https://www.outback.com/menuitem-detail/allergen-guide',
  'p.f. chang':           'https://www.pfchangs.com/menu/special-diets.html',
  'blaze pizza':          'https://www.blazepizza.com/allergen-info',
  'mod pizza':            'https://www.modpizza.com/allergen-information',
  'subway':               'https://www.subway.com/en-US/MenuNutrition/Nutrition/AllergenAndNutrition',
  'taco bell':            'https://www.tacobell.com/nutrition/allergens',
  'mcdonald':             'https://www.mcdonalds.com/us/en-us/about-our-food/nutrition-calculator.html',
  'olive garden':         'https://www.olivegarden.com/menu/nutrition',
  'applebee':             'https://www.applebees.com/en/menu/nutritional-info',
  'chili':                'https://www.chilis.com/menu/special-diets/allergen-menu',
  'red robin':            'https://www.redrobin.com/menu/allergen-info.html',
  'wendy':                'https://www.wendys.com/nutrition/allergen-info',
  'burger king':          'https://www.bk.com/menu/picker',
  'dairy queen':          'https://www.dairyqueen.com/en-us/nutrition/allergen-information/',
  'in-n-out':             'https://www.in-n-out.com/menu/protein-style',
  'bonefish':             'https://www.bonefishgrill.com/menu/allergen-information',
  'true food':            'https://www.truefoodkitchen.com/menu',
  'jersey mike':          'https://www.jerseymikes.com/menu/allergen-info',
  'panda express':        'https://www.pandaexpress.com/nutrition',
  'raising cane':         'https://www.raisingcanes.com/nutrition-allergen-information/',
  'wingstop':             'https://www.wingstop.com/menu',
  'culver':               'https://www.culvers.com/nutrition-allergens',
  'red lobster':          'https://www.redlobster.com/menu/nutrition-info',
  'texas roadhouse':      'https://www.texasroadhouse.com/menu-items',
  'longhorn':             'https://www.longhornsteakhouse.com/menu/nutritional-info',
  'ihop':                 'https://www.ihop.com/en/menu/specials/nutrition-allergen-information',
  'denny':                'https://www.dennys.com/menu/allergen-information/',
  'cracker barrel':       'https://www.crackerbarrel.com/menu-nutrition/',
  'buffalo wild':         'https://www.buffalowildwings.com/en/food/nutrition/allergen-menu/',
  'cheesecake factory':   'https://www.thecheesecakefactory.com/menu/',
  'legal sea':            'https://www.legalseafoods.com/allergen-information/',
  "bj's":                 'https://www.bjsrestaurants.com/menu/allergen',
  'cold stone':           'https://www.coldstonecreamery.com/icecream/allergeninformation',
  'baskin':               'https://www.baskinrobbins.com/en/nutritional-information.html',
  'erin mckenna':         'https://www.erinmckennasbakery.com/pages/faqs',
  'mariposa':             'https://www.mariposabaking.com/menu',
};

export function matchChain(restaurantName: string): ChainRestaurant | undefined {
  const lower = restaurantName.toLowerCase();
  return CHAIN_ALLERGEN_DATA.find(chain =>
    chain.aliases.some(alias => lower.includes(alias.toLowerCase())) ||
    lower.includes(chain.name.toLowerCase()),
  );
}

export function getAllergenUrl(restaurantName: string): string | undefined {
  const lower = restaurantName.toLowerCase();
  for (const [key, url] of Object.entries(ALLERGEN_URLS)) {
    if (lower.includes(key)) {return url;}
  }
  return undefined;
}
