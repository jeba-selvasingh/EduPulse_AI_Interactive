import { Injectable } from '@nestjs/common';

@Injectable()
export class AlertInboxStoreService {
  /** userId → Set of read alert ids */
  private readonly readByUser = new Map<string, Set<string>>();

  markRead(userId: string, alertId: string): void {
    const set = this.readByUser.get(userId) ?? new Set<string>();
    set.add(alertId);
    this.readByUser.set(userId, set);
  }

  isRead(userId: string, alertId: string): boolean {
    return this.readByUser.get(userId)?.has(alertId) ?? false;
  }

  unreadCount(userId: string, alertIds: string[]): number {
    const read = this.readByUser.get(userId);
    if (!read) return alertIds.length;
    return alertIds.filter((id) => !read.has(id)).length;
  }
}
