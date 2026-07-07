import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';

export type NotificationKind =
  | 'moderation_submitted'
  | 'moderation_approved'
  | 'moderation_returned';

export type InAppNotification = {
  id: string;
  institutionId: string;
  paperId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  recipientUserId: string | null;
  recipientRoles: string[];
  createdAt: string;
  read: boolean;
};

@Injectable()
export class NotificationsStoreService {
  private readonly notifications: InAppNotification[] = [];

  create(input: {
    institutionId: string;
    paperId: string;
    kind: NotificationKind;
    title: string;
    body: string;
    recipientUserId?: string | null;
    recipientRoles?: string[];
  }): InAppNotification {
    const notification: InAppNotification = {
      id: randomUUID(),
      institutionId: input.institutionId,
      paperId: input.paperId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      recipientUserId: input.recipientUserId ?? null,
      recipientRoles: input.recipientRoles ?? [],
      createdAt: new Date().toISOString(),
      read: false,
    };
    this.notifications.push(notification);
    return notification;
  }

  listForUser(user: AuthUser): InAppNotification[] {
    return this.notifications
      .filter(
        (notification) =>
          notification.institutionId === user.institutionId &&
          ((notification.recipientUserId && notification.recipientUserId === user.sub) ||
            notification.recipientRoles.some((role) => user.roles.includes(role))),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listForPaper(paperId: string, user: AuthUser): InAppNotification[] {
    return this.listForUser(user).filter((notification) => notification.paperId === paperId);
  }
}
