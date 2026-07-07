import { fetchHomeSummary } from '@/src/lib/home-api';
import { useQuery } from '@tanstack/react-query';

export function useHomeSummary() {
  return useQuery({
    queryKey: ['home-summary'],
    queryFn: fetchHomeSummary,
    staleTime: 30_000,
  });
}
