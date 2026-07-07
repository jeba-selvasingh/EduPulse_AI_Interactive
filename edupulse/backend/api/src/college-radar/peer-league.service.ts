import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { PeerLeagueView } from './peer-league.schema';
import { PILOT_RIVALS } from './pilot-rivals.seed';

@Injectable()
export class PeerLeagueService {
  constructor(private readonly actionLogger: StructuredLoggerService) {}

  getLeagueTable(_user: AuthUser): PeerLeagueView {
    const started = Date.now();

    const entries = PILOT_RIVALS.map((rival) => {
      const notes: string[] = [];
      if (rival.placementProvenance === 'claimed') {
        notes.push('placement as claimed on website');
      }
      if (rival.nirfProvenance === 'unavailable') {
        notes.push('NIRF rank unavailable');
      }

      const placementLabel =
        rival.placementProvenance === 'claimed'
          ? `${rival.placementPct}%*`
          : `${rival.placementPct}%`;

      return {
        id: rival.id,
        name: rival.name,
        nirfRank: rival.nirfRank,
        naacGrade: rival.naacGrade,
        placementPct: rival.placementPct,
        placementLabel,
        isSelf: Boolean((rival as { isSelf?: boolean }).isSelf),
        provenanceNotes: notes,
      };
    }).sort((a, b) => {
      if (a.nirfRank == null) return 1;
      if (b.nirfRank == null) return -1;
      return a.nirfRank - b.nirfRank;
    });

    const view: PeerLeagueView = {
      rivalsWatched: 5,
      clusterSize: 6,
      positionSummary: '#2 of 6 in your cluster',
      rankDeltaNarrative: 'gap to Rival A closing (was 41 ranks, now 26)',
      footnote: '* as claimed on their website · others: NIRF/NAAC official',
      entries,
    };

    this.actionLogger.logAction({
      action: LogAction.CollegeRadarLeagueView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: _user.institutionId,
      userId: _user.sub,
      metadata: { entryCount: entries.length },
    });

    return view;
  }
}
