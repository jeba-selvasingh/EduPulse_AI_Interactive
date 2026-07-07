import { SetMetadata } from '@nestjs/common';
import type { PermissionName } from './permissions';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: PermissionName[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
