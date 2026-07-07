import { AsyncLocalStorage } from 'node:async_hooks';

export type CorrelationContext = {
  correlationId: string;
};

export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

export function getCorrelationId(): string {
  return correlationStorage.getStore()?.correlationId ?? 'no-correlation-id';
}
