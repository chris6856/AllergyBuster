import * as openMenu from './openMenu';
import * as yelp from './yelp';
import {Restaurant} from '../types/restaurant';
import {CHAIN_ALLERGEN_DATA} from '../data/chainAllergenData';

/**
 * Match query against local chain database.
 * Returns any chains whose name or aliases contain the query string.
 */
function searchLocalChains(query: string): Restaurant[] {
  const q = query.toLowerCase().trim();
  return CHAIN_ALLERGEN_DATA
    .filter(chain =>
      chain.name.toLowerCase().includes(q) ||
      chain.aliases.some(alias => alias.includes(q)),
    )
    .map(chain => ({
      id: chain.id,
      name: chain.name,
      cuisineType: chain.cuisineType,
      source: 'local' as const,
      sourceUrl: chain.sourceUrl,
      menuItems: chain.menuItems.map((item, i) => ({
        id: `${chain.id}-${i}`,
        name: item.name,
        description: item.description,
        allergens: item.allergens,
      })),
    }));
}

/**
 * Search for restaurants by name.
 * Checks local chain data first, then OpenMenu, then Yelp.
 * Local results appear at the top — they have the richest allergen data.
 */
export async function searchRestaurants(query: string, location?: string): Promise<Restaurant[]> {
  const localResults = searchLocalChains(query);

  let remoteResults: Restaurant[] = [];

  try {
    const openMenuResults = await openMenu.searchRestaurants(query);
    if (openMenuResults.length > 0) {
      remoteResults = openMenuResults;
    }
  } catch {
    // OpenMenu failed — fall through to Yelp
  }

  if (remoteResults.length === 0) {
    try {
      remoteResults = await yelp.searchRestaurants(query, location);
    } catch {
      // Yelp failed — local results only
    }
  }

  // Deduplicate: remove remote results that match a local chain by name
  const localNames = new Set(localResults.map(r => r.name.toLowerCase()));
  const deduped = remoteResults.filter(
    r => !localNames.has(r.name.toLowerCase()),
  );

  return [...localResults, ...deduped];
}

/**
 * Get menu items for a specific restaurant.
 * Currently only supported via Yelp (paid tier).
 */
export async function getRestaurantMenu(restaurantId: string, source: Restaurant['source']) {
  if (source === 'yelp') {
    return yelp.getRestaurantMenu(restaurantId);
  }
  return [];
}
