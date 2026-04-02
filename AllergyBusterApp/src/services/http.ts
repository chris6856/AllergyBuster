import axios from 'axios';
import {APP_USER_AGENT, OFF_BASE_URL, EDAMAM_BASE_URL, YELP_BASE_URL} from '../constants/config';

// Open Food Facts — requires User-Agent header per their API terms
export const offClient = axios.create({
  baseURL: OFF_BASE_URL,
  timeout: 10000,
  headers: {
    'User-Agent': APP_USER_AGENT,
    'Accept': 'application/json',
  },
});

// Edamam — auth via query params (set per-request), no special headers needed
export const edamamClient = axios.create({
  baseURL: EDAMAM_BASE_URL,
  timeout: 10000,
  headers: {'Accept': 'application/json'},
});

// Yelp — auth via Bearer token in Authorization header
export const yelpClient = axios.create({
  baseURL: YELP_BASE_URL,
  timeout: 10000,
  headers: {'Accept': 'application/json'},
});

// Generic client for other requests (tips proxy, OpenMenu)
export const httpClient = axios.create({
  timeout: 10000,
  headers: {'Accept': 'application/json'},
});
