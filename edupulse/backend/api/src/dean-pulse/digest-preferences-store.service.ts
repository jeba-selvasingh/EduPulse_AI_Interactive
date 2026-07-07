import { Injectable } from '@nestjs/common';

export type DigestPreferencesRecord = {
  inAppEnabled: boolean;
  whatsappEnabled: boolean;
};

@Injectable()
export class DigestPreferencesStoreService {
  /** userId → preferences */
  private readonly prefs = new Map<string, DigestPreferencesRecord>();

  get(userId: string): DigestPreferencesRecord {
    return (
      this.prefs.get(userId) ?? {
        inAppEnabled: true,
        whatsappEnabled: true,
      }
    );
  }

  update(
    userId: string,
    patch: Partial<DigestPreferencesRecord>,
  ): DigestPreferencesRecord {
    const current = this.get(userId);
    const next = { ...current, ...patch };
    this.prefs.set(userId, next);
    return next;
  }
}
