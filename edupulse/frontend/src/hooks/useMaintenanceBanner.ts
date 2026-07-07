import { fetchAvailabilityBanner } from '@/src/lib/availability-api';
import { useAuthStore } from '@/src/stores/auth';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function useMaintenanceBanner() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [dismissed, setDismissed] = useState(false);

  const query = useQuery({
    queryKey: ['availability-banner'],
    queryFn: fetchAvailabilityBanner,
    enabled: Boolean(accessToken),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const banner = query.data ?? { visible: false, kind: 'none' as const };
  const visible = banner.visible && !dismissed;

  return {
    banner: { ...banner, visible },
    dismiss: () => setDismissed(true),
    isLoading: query.isLoading,
  };
}
