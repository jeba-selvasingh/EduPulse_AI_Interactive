import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { KeycloakService } from './keycloak.service';
import type { AuthUser } from './auth.types';

export type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly keycloak: KeycloakService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });
    }

    const token = header.slice('Bearer '.length);

    try {
      request.user = await this.keycloak.verifyAccessToken(token);
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Session expired or invalid. Please sign in again.',
      });
    }
  }
}
