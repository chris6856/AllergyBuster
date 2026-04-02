import {useQuery} from '@tanstack/react-query';
import {searchRestaurants} from '../services/restaurantService';

export function useRestaurantSearch(query: string | undefined) {
  return useQuery({
    queryKey: ['restaurant', 'search', query],
    queryFn: () => searchRestaurants(query!),
    enabled: !!query && query.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}
