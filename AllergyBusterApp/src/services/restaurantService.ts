import * as openMenu from './openMenu';
import * as yelp from './yelp';
import {Restaurant} from '../types/restaurant';

/**
 * Search for restaurants by name.
 * Tries OpenMenu first; falls back to Yelp if 0 results or on error.
 * Returns empty array if neither source returns results.
 */
export async function searchRestaurants(query: string, location?: string): Promise<Restaurant[]> {
  try {
    const openMenuResults = await openMenu.searchRestaurants(query);
    if (openMenuResults.length > 0) {
      return openMenuResults;
    }
  } catch {
    // OpenMenu failed — fall through to Yelp
  }

  try {
    return await yelp.searchRestaurants(query, location);
  } catch {
    return [];
  }
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
