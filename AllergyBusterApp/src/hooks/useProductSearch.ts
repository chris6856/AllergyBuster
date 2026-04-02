import {useQuery} from '@tanstack/react-query';
import {searchProducts} from '../services/productService';

export function useProductSearch(query: string | undefined) {
  return useQuery({
    queryKey: ['product', 'search', query],
    queryFn: () => searchProducts(query!),
    enabled: !!query && query.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}
