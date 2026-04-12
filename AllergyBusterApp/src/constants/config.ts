import {Platform} from 'react-native';

// Open Food Facts — no auth required, User-Agent set in http.ts
export const OFF_BASE_URL = 'https://world.openfoodfacts.org';

// Edamam Food Database — fill in when setting up data layer
export const EDAMAM_BASE_URL = 'https://api.edamam.com/api/food-database/v2';
export const EDAMAM_APP_ID = '3b70631c';
export const EDAMAM_APP_KEY = 'cd8c4c586974ba5b44d3156dff670ade';

// Yelp Fusion — fill in when setting up data layer
export const YELP_BASE_URL = 'https://api.yelp.com/v3';
export const YELP_API_KEY = 'ydruld5lSgXyqSieb8WZ7ogbkgclqNwobGiGV0R2GwypWuYQe6fOwpJ5FYb2fwlt47d5jRwj88G_xO6Vd5Fd4jWnF5XRk0guJ8PX7H_JoFvPjUDKaYuTssrZoHHQaXYx';

// OpenMenu
export const OPENMENU_BASE_URL = 'https://api.openmenu.com/v2';

// Cloudflare Worker base URL
// TIPS_PROXY_URL: full path to the /tip endpoint
// CHAINS_PROXY_URL: base URL — chainsService appends /chains automatically
export const TIPS_PROXY_URL = 'https://allergybuster-tips.allergybuster-tips.workers.dev/tip';
export const CHAINS_PROXY_URL = 'https://allergybuster-tips.allergybuster-tips.workers.dev';

export const CHAT_PROXY_URL = 'https://allergybuster-tips.allergybuster-tips.workers.dev/chat';

export const APP_USER_AGENT = `AllergyBuster/1.0 (${Platform.OS})`;
