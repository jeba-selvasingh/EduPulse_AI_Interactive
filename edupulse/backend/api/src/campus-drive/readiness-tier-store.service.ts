import { Injectable } from '@nestjs/common';
import type { ReadinessWeights } from './readiness-tier.schema';
import { DEFAULT_READINESS_WEIGHTS, clampWeights } from './readiness-tier.util';

@Injectable()
export class ReadinessTierStoreService {
  private readonly weightsByInstitution = new Map<string, ReadinessWeights>();

  getWeights(institutionId: string): ReadinessWeights {
    return this.weightsByInstitution.get(institutionId) ?? { ...DEFAULT_READINESS_WEIGHTS };
  }

  setWeights(institutionId: string, weights: ReadinessWeights): ReadinessWeights {
    const clamped = clampWeights(weights);
    this.weightsByInstitution.set(institutionId, clamped);
    return clamped;
  }
}
