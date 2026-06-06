import {CHAINS_PROXY_URL} from '../constants/config';
import {ChainRestaurant} from '../data/chainAllergenData';
import {matchChain, getAllergenUrl} from '../utils/chainMatcher';

export interface Establishment {
  id: string;
  name: string;
  address: string;
  category: string;
  googleRating: number | null;
  googleRatingCount: number;
  isOpen: boolean | null;
  website: string | null;
  allergenRatings: Record<string, {avg: number; count: number}>;
  matchedChain?: ChainRestaurant;
  allergenUrl?: string;
}

export async function searchEstablishments(
  query: string,
  coords?: {lat: number; lng: number},
  location?: string,
): Promise<Establishment[]> {
  const params = new URLSearchParams();
  const q = location ? `${query} near ${location}` : query;
  params.set('q', q);
  if (coords) {
    params.set('lat', coords.lat.toString());
    params.set('lng', coords.lng.toString());
  }
  const res = await fetch(`${CHAINS_PROXY_URL}/establishments?${params}`);
  if (!res.ok) {throw new Error(`Establishments search failed: ${res.status}`);}
  const data = (await res.json()) as {results: Establishment[]};
  const results = data.results ?? [];

  return results.map(e => ({
    ...e,
    matchedChain: matchChain(e.name),
    allergenUrl: getAllergenUrl(e.name),
  }));
}
