import {httpClient} from './http';
import {Restaurant, MenuItem, MenuItemAllergenInfo} from '../types/restaurant';
import {OPENMENU_BASE_URL} from '../constants/config';
import {extractAllergensFromText} from '../utils/allergenParser';

interface OpenMenuDish {
  menu_item_id?: string;
  menu_item_name?: string;
  menu_item_description?: string;
  menu_item_ingredients?: string;
  allergy_info?: string;
}

interface OpenMenuSection {
  menu_section_dishes?: OpenMenuDish[];
}

interface OpenMenuResult {
  restaurant?: {
    uid?: string;
    restaurant_name?: string;
    address1?: string;
    cuisine_name?: string;
    menus?: {menu_sections?: OpenMenuSection[]}[];
  };
}

function parseMenuItemAllergens(dish: OpenMenuDish): MenuItemAllergenInfo {
  const text = [dish.menu_item_ingredients ?? '', dish.allergy_info ?? ''].join(' ');
  if (!text.trim()) {
    return {declared: [], mayContain: [], dataAvailable: false};
  }
  return {
    declared: extractAllergensFromText(text),
    mayContain: [],
    dataAvailable: true,
  };
}

function normalizeMenuItem(dish: OpenMenuDish): MenuItem {
  return {
    id: dish.menu_item_id ?? dish.menu_item_name ?? 'unknown',
    name: dish.menu_item_name ?? 'Unknown Item',
    description: dish.menu_item_description,
    allergens: parseMenuItemAllergens(dish),
  };
}

function normalize(raw: OpenMenuResult['restaurant'], id: string): Restaurant {
  const sections = raw?.menus?.[0]?.menu_sections ?? [];
  const menuItems: MenuItem[] = sections.flatMap(
    s => (s.menu_section_dishes ?? []).map(normalizeMenuItem),
  );

  return {
    id,
    name: raw?.restaurant_name ?? 'Unknown Restaurant',
    address: raw?.address1,
    cuisineType: raw?.cuisine_name,
    menuItems,
    source: 'openmenu',
  };
}

export async function searchRestaurants(query: string): Promise<Restaurant[]> {
  try {
    const response = await httpClient.get<{results?: OpenMenuResult[]}>(
      `${OPENMENU_BASE_URL}/search`,
      {params: {restaurant_name: query, limit: 10}},
    );

    return (response.data.results ?? [])
      .filter(r => r.restaurant)
      .map(r => normalize(r.restaurant, r.restaurant?.uid ?? query));
  } catch {
    return [];
  }
}
