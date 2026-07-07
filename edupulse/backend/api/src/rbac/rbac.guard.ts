import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { hasAnyPermission, type PermissionName } from './permissions';
import { PERMISSIONS_KEY } from './require-permissions.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionName[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const roles = request.user?.roles ?? [];

    if (!hasAnyPermission(roles, required)) {
      throw new ForbiddenException({
        code: 'ACCESS_DENIED',
        message: 'You do not have permission to access this feature.',
      });
    }

    return true;
  }
}
