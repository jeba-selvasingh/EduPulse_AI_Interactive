import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PilotFeedItem } from './pilot-rivals.seed';
import { PILOT_RIVAL_FEED } from './pilot-rivals.seed';

@Injectable()
export class RivalFeedStoreService {
  private items: PilotFeedItem[] = [...PILOT_RIVAL_FEED];

  list(): PilotFeedItem[] {
    return [...this.items].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }

  findById(id: string): PilotFeedItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  create(input: Omit<PilotFeedItem, 'id' | 'publishedAt'> & { publishedAt?: string }): PilotFeedItem {
    const item: PilotFeedItem = {
      id: randomUUID(),
      publishedAt: input.publishedAt ?? new Date().toISOString(),
      rivalId: input.rivalId,
      title: input.title,
      summary: input.summary,
      sourceUrl: input.sourceUrl,
      sourceLabel: input.sourceLabel,
      relativeTime: input.relativeTime ?? 'just now',
    };
    this.items.unshift(item);
    return item;
  }

  update(id: string, patch: Partial<Omit<PilotFeedItem, 'id'>>): PilotFeedItem | undefined {
    const idx = this.items.findIndex((item) => item.id === id);
    if (idx < 0) return undefined;
    this.items[idx] = { ...this.items[idx], ...patch };
    return this.items[idx];
  }
}
