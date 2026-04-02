export interface MenuItemAllergenInfo {
  declared: string[];
  mayContain: string[];
  dataAvailable: boolean; // false when source has no allergen data for this item
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  allergens: MenuItemAllergenInfo;
}

export interface Restaurant {
  id: string;
  name: string;
  address?: string;
  cuisineType?: string;
  menuItems: MenuItem[];
  source: 'openmenu' | 'yelp';
}
