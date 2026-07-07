import { Permission, hasPermission, type PermissionName } from '@/src/lib/rbac';
import { useAuthStore } from '@/src/stores/auth';

export function usePermission(permission: PermissionName): boolean {
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  return hasPermission(roles, permission);
}

export { Permission };
