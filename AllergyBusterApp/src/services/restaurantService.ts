import * as openMenu from './openMenu';
import * as yelp from './yelp';
import {searchRemoteChains} from './chainsService';
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
 * Priority: remote chain DB → local static chains → OpenMenu → Yelp.
 * Chain results (remote or local) always appear first — richest allergen data.
 */
export async function searchRestaurants(query: string, location?: string): Promise<Restaurant[]> {
  // Try remote chain database first (updatable without app release)
  const remoteChains = await searchRemoteChains(query);

  // Fall back to bundled static data for any chains not in the remote DB
  const remoteIds = new Set(remoteChains.map(r => r.id));
  const localResults = searchLocalChains(query).filter(r => !remoteIds.has(r.id));

  const chainResults = [...remoteChains, ...localResults];

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

  // Deduplicate Yelp/OpenMenu results against chain results
  const chainNames = new Set(chainResults.map(r => r.name.toLowerCase()));
  const deduped = remoteResults.filter(
    r => !chainNames.has(r.name.toLowerCase()),
  );

  return [...chainResults, ...deduped];
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
