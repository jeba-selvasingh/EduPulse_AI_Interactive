import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';

/**
 * Enforces AD-9 tenancy: institution from JWT claim (preferred) or X-Institution-Id header.
 */
@Injectable()
export class InstitutionScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const institutionId =
      request.user?.institutionId ??
      (typeof request.headers['x-institution-id'] === 'string'
        ? request.headers['x-institution-id']
        : undefined);
    const routeId = request.params.id;

    if (!institutionId) {
      throw new UnauthorizedException({
        code: 'INSTITUTION_REQUIRED',
        message: 'Select an institution before accessing this resource',
      });
    }

    if (routeId && routeId !== institutionId) {
      throw new ForbiddenException({
        code: 'INSTITUTION_SCOPE_VIOLATION',
        message: 'You cannot access another institution\'s data',
      });
    }

    return true;
  }
}
