import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { ConsentService } from './consent.service';

@Injectable()
export class ConsentGuard implements CanActivate {
  constructor(private readonly consent: ConsentService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      return false;
    }

    this.consent.assertConsent(user);
    return true;
  }
}
