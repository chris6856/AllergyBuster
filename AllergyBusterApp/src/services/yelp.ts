import {yelpClient} from './http';
import {Restaurant, MenuItem, MenuItemAllergenInfo} from '../types/restaurant';
import {YELP_API_KEY} from '../constants/config';
import {extractAllergensFromText} from '../utils/allergenParser';

interface YelpBusiness {
  id: string;
  name: string;
  location?: {address1?: string};
  categories?: {title: string}[];
}

interface YelpSearchResponse {
  businesses: YelpBusiness[];
}

// Yelp Fusion does not provide menu or allergen data in its standard API.
// We return restaurants with empty menuItems and dataAvailable: false per item.
// This gives the UI something to render while making clear data is unavailable.
function normalize(business: YelpBusiness): Restaurant {
  return {
    id: business.id,
    name: business.name,
    address: business.location?.address1,
    cuisineType: business.categories?.[0]?.title,
    menuItems: [],
    source: 'yelp',
  };
}

export async function searchRestaurants(query: string, location?: string): Promise<Restaurant[]> {
  if (!YELP_API_KEY) {
    return [];
  }

  const response = await yelpClient.get<YelpSearchResponse>('/businesses/search', {
    headers: {Authorization: `Bearer ${YELP_API_KEY}`},
    params: {
      term: query,
      limit: 20,
      categories: 'restaurants',
      location: location || 'United States',
    },
  });

  return (response.data.businesses ?? []).map(normalize);
}

// Fetch menu items for a specific restaurant (requires Yelp Fusion paid tier)
// Falls back gracefully if the endpoint is unavailable.
export async function getRestaurantMenu(restaurantId: string): Promise<MenuItem[]> {
  if (!YELP_API_KEY) {
    return [];
  }

  try {
    // Yelp menu data endpoint — available on paid plans only
    const response = await yelpClient.get<{menu_items?: {id: string; name: string; description?: string}[]}>(
      `/businesses/${restaurantId}/menu_items`,
      {headers: {Authorization: `Bearer ${YELP_API_KEY}`}},
    );

    return (response.data.menu_items ?? []).map(item => {
      const text = item.description ?? '';
      const allergenInfo: MenuItemAllergenInfo = text
        ? {declared: extractAllergensFromText(text), mayContain: [], dataAvailable: true}
        : {declared: [], mayContain: [], dataAvailable: false};

      return {id: item.id, name: item.name, description: item.description, allergens: allergenInfo};
    });
  } catch {
    return [];
  }
}
