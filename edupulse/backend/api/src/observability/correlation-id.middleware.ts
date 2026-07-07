import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { correlationStorage } from './correlation-context';

export type CorrelationRequest = Request & { correlationId?: string };

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: CorrelationRequest, res: Response, next: NextFunction): void {
    const header = req.headers['x-correlation-id'];
    const correlationId =
      typeof header === 'string' && header.trim().length > 0 ? header.trim() : randomUUID();

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    correlationStorage.run({ correlationId }, () => next());
  }
}
