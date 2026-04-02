import {useQuery} from '@tanstack/react-query';
import {fetchDailyTip} from '../services/tipsService';

export function useDailyTip() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  return useQuery({
    queryKey: ['tip', today],
    queryFn: fetchDailyTip,
    staleTime: 1000 * 60 * 60 * 24, // re-fetch at most once per day
    retry: 1,
  });
}
