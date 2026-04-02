import {useQuery} from '@tanstack/react-query';
import {getProductByBarcode} from '../services/productService';

export function useProductByBarcode(barcode: string | undefined) {
  return useQuery({
    queryKey: ['product', 'barcode', barcode],
    queryFn: () => getProductByBarcode(barcode!),
    enabled: !!barcode,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });
}
