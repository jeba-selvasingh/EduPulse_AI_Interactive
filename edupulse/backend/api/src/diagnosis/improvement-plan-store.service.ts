import { Injectable } from '@nestjs/common';

export type ImprovementItemOverride = {
  institutionId: string;
  usn: string;
  itemId: string;
  description: string;
  facultyId: string;
  facultyName: string;
  editedAt: string;
};

type OverrideKey = string;

@Injectable()
export class ImprovementPlanStoreService {
  private readonly overrides = new Map<OverrideKey, ImprovementItemOverride>();

  private key(institutionId: string, usn: string, itemId: string): OverrideKey {
    return `${institutionId}:${usn}:${itemId}`;
  }

  getOverride(
    institutionId: string,
    usn: string,
    itemId: string,
  ): ImprovementItemOverride | undefined {
    return this.overrides.get(this.key(institutionId, usn, itemId));
  }

  saveOverride(override: ImprovementItemOverride): ImprovementItemOverride {
    this.overrides.set(this.key(override.institutionId, override.usn, override.itemId), override);
    return override;
  }
}
