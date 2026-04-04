import {CHAINS_PROXY_URL} from '../constants/config';
import {httpClient} from './http';
import {Restaurant} from '../types/restaurant';

interface RemoteChainMenuItem {
  name: string;
  description?: string;
  allergens: {declared: string[]; mayContain: string[]; dataAvailable: boolean};
}

interface RemoteChain {
  id: string;
  name: string;
  cuisineType: string;
  sourceUrl: string;
  menuItems: RemoteChainMenuItem[];
}

function normalize(chain: RemoteChain, index: number): Restaurant {
  return {
    id: chain.id,
    name: chain.name,
    cuisineType: chain.cuisineType,
    source: 'local',
    sourceUrl: chain.sourceUrl,
    menuItems: chain.menuItems.map((item, i) => ({
      id: `${chain.id}-${index}-${i}`,
      name: item.name,
      description: item.description,
      allergens: item.allergens,
    })),
  };
}

/**
 * Search the remote chain allergen database.
 * Returns an empty array (silently) if CHAINS_PROXY_URL is not configured
 * or the request fails — the caller falls back to local static data.
 */
export async function searchRemoteChains(query: string): Promise<Restaurant[]> {
  if (!CHAINS_PROXY_URL) {
    return [];
  }

  try {
    const response = await httpClient.get<RemoteChain[]>(CHAINS_PROXY_URL + '/chains', {
      params: {query},
      timeout: 6000,
    });
    return (response.data ?? []).map((chain, i) => normalize(chain, i));
  } catch {
    return [];
  }
}
