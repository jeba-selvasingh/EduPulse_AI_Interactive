import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { AlertInboxService } from '../dean-pulse/alert-inbox.service';
import type { HomeSummary } from './home.schema';

const PILOT_ATTENTION = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    title: 'IA-2 paper awaiting moderation',
    subtitle: 'BCS304 Data Structures · due today',
    severity: 'amber' as const,
    trustCardId: '10000000-0000-4000-8000-000000000001',
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    title: '12 students weak in CO3',
    subtitle: 'BCS304 · Mastery heatmap updated',
    severity: 'red' as const,
  },
];

@Injectable()
export class HomeService {
  constructor(private readonly alertInbox: AlertInboxService) {}

  getSummary(user: AuthUser): HomeSummary {
    return {
      stats: {
        papersThisSem: 12,
        hoursSaved: 38,
      },
      unreadAlertCount: this.alertInbox.getUnreadCount(user),
      attentionItems: PILOT_ATTENTION,
    };
  }
}
