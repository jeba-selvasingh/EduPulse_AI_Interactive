import { fetchTrustCard, type TrustCard } from '@/src/lib/trust-card';
import { useQuery } from '@tanstack/react-query';

export function useTrustCard(artifactId: string | null | undefined) {
  return useQuery<TrustCard>({
    queryKey: ['trust-card', artifactId],
    queryFn: () => fetchTrustCard(artifactId!),
    enabled: Boolean(artifactId),
    staleTime: 60_000,
  });
}
