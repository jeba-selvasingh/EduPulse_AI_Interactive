import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { RivalFeedItem, RivalFeedView } from './rival-feed.schema';
import { RivalFeedStoreService } from './rival-feed-store.service';

@Injectable()
export class RivalFeedService {
  constructor(
    private readonly store: RivalFeedStoreService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  listFeed(user: AuthUser): RivalFeedView {
    const started = Date.now();
    const items = this.store.list();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newThisWeek = items.filter(
      (item) => new Date(item.publishedAt).getTime() >= weekAgo,
    ).length;

    this.actionLogger.logAction({
      action: LogAction.CollegeRadarRivalFeedView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { itemCount: items.length, newThisWeek },
    });

    return { newThisWeek, items };
  }

  createItem(
    user: AuthUser,
    input: {
      rivalId: 'rival-a' | 'rival-b' | 'rival-c' | 'rival-d';
      title: string;
      summary: string;
      sourceUrl: string;
      sourceLabel: string;
      relativeTime?: string;
    },
  ): RivalFeedItem {
    const item = this.store.create({
      ...input,
      relativeTime: input.relativeTime ?? 'just now',
    });
    this.actionLogger.logAction({
      action: LogAction.CollegeRadarRivalFeedCreate,
      durationMs: 0,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { feedItemId: item.id },
    });
    return item;
  }

  updateItem(
    user: AuthUser,
    id: string,
    patch: Partial<{
      title: string;
      summary: string;
      sourceUrl: string;
      sourceLabel: string;
      relativeTime: string;
    }>,
  ): RivalFeedItem {
    const updated = this.store.update(id, patch);
    if (!updated) {
      throw new NotFoundException('Feed item not found');
    }
    this.actionLogger.logAction({
      action: LogAction.CollegeRadarRivalFeedUpdate,
      durationMs: 0,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: { feedItemId: id },
    });
    return updated;
  }
}
