import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';

export const InstitutionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user?.institutionId) {
      return request.user.institutionId;
    }

    const header = request.headers['x-institution-id'];
    if (typeof header === 'string' && header.length > 0) {
      return header;
    }

    return undefined;
  },
);
