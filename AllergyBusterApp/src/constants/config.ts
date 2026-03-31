import {Platform} from 'react-native';

// Open Food Facts — no auth required, User-Agent set in http.ts
export const OFF_BASE_URL = 'https://world.openfoodfacts.org';

// Edamam Food Database
export const EDAMAM_BASE_URL = 'https://api.edamam.com/api/food-database/v2';
export const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID ?? '';
export const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY ?? '';

// Yelp Fusion
export const YELP_BASE_URL = 'https://api.yelp.com/v3';
export const YELP_API_KEY = process.env.YELP_API_KEY ?? '';

// OpenMenu
export const OPENMENU_BASE_URL = 'https://api.openmenu.com/v2';

// AI Tips proxy (Cloudflare Worker or similar)
export const TIPS_PROXY_URL = process.env.TIPS_PROXY_URL ?? '';

export const APP_USER_AGENT = `AllergyBuster/1.0 (${Platform.OS})`;
