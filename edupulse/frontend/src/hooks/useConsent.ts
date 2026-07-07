import { fetchConsentPolicy, fetchConsentStatus } from '@/src/lib/consent-api';
import { useQuery } from '@tanstack/react-query';

export function useConsentPolicy() {
  return useQuery({
    queryKey: ['consent-policy'],
    queryFn: fetchConsentPolicy,
    staleTime: 60_000,
  });
}

export function useConsentStatus(enabled = true) {
  return useQuery({
    queryKey: ['consent-status'],
    queryFn: fetchConsentStatus,
    enabled,
    staleTime: 10_000,
  });
}
