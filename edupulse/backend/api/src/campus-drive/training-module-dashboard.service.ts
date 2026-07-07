import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import {
  PILOT_BATCH_LABEL,
  PILOT_BATCH_STRENGTH,
} from './pilot-placement-students.seed';
import type {
  TrainingDashboardsView,
  TrainingModuleMetric,
  TrainingTrackId,
  TrainingTrackSummary,
} from './training-module-dashboard.schema';

const APTITUDE_BENCHMARK = 68;
const APTITUDE_BATCH_AVG = 62;
const APTITUDE_BELOW_BENCHMARK = 78;
const SOFT_SKILLS_BENCHMARK = 60;
const SOFT_SKILLS_BATCH_AVG = 48;
const SOFT_SKILLS_BELOW_BENCHMARK = 91;
const TECHNICAL_BENCHMARK = 70;
const TECHNICAL_BATCH_AVG = 58;
const TECHNICAL_BELOW_BENCHMARK = 66;

const TRACK_META: Record<
  TrainingTrackId,
  { title: string; subtitle: string; benchmarkLabel: string }
> = {
  aptitude: {
    title: 'Aptitude training plan',
    subtitle: 'Quantitative · logical · verbal · data interpretation',
    benchmarkLabel: 'TCS NQT benchmark',
  },
  soft_skills: {
    title: 'Soft skills & GD/PI prep',
    subtitle: 'Group discussion · HR interview · communication skills',
    benchmarkLabel: 'Placement readiness benchmark',
  },
  technical: {
    title: 'Technical skill builder',
    subtitle: 'DSA · coding rounds · domain tech tracks',
    benchmarkLabel: 'Dream-company coding benchmark',
  },
};

@Injectable()
export class TrainingModuleDashboardService {
  constructor(private readonly actionLogger: StructuredLoggerService) {}

  getDashboardView(user: AuthUser, track?: string): TrainingDashboardsView {
    const started = Date.now();
    const activeTrack = this.parseTrack(track);
    const tracks = this.buildAllTracks();
    const weakest = this.findWeakestTrack(tracks);

    const view: TrainingDashboardsView = {
      batchLabel: PILOT_BATCH_LABEL,
      batchStrength: PILOT_BATCH_STRENGTH,
      activeTrack,
      tracks: activeTrack ? tracks.filter((item) => item.track === activeTrack) : tracks,
      weakestTrackId: weakest.track,
      weakestTrackLabel: weakest.title,
      interventionPriorityRoute: '/intervention-priority',
      interventionSummary: `${weakest.title} is the weakest training area · prioritize interventions before drive season`,
    };

    this.actionLogger.logAction({
      action: LogAction.CampusTrainingDashboardsView,
      durationMs: Date.now() - started,
      outcome: 'success',
      institutionId: user.institutionId,
      userId: user.sub,
      metadata: {
        activeTrack: activeTrack ?? 'all',
        weakestTrack: weakest.track,
        batchAvgAptitude: tracks.find((item) => item.track === 'aptitude')?.batchAvgPercent,
      },
    });

    return view;
  }

  parseTrack(track?: string): TrainingTrackId | null {
    if (!track) {
      return null;
    }
    if (track === 'aptitude') {
      return 'aptitude';
    }
    if (track === 'soft-skills' || track === 'soft_skills') {
      return 'soft_skills';
    }
    if (track === 'technical') {
      return 'technical';
    }
    return null;
  }

  private buildAllTracks(): TrainingTrackSummary[] {
    return [
      this.buildAptitudeTrack(),
      this.buildSoftSkillsTrack(),
      this.buildTechnicalTrack(),
    ];
  }

  private buildAptitudeTrack(): TrainingTrackSummary {
    const batchAvgPercent = APTITUDE_BATCH_AVG;
    const belowBenchmarkCount = APTITUDE_BELOW_BENCHMARK;

    const modules: TrainingModuleMetric[] = [
      {
        id: 'quantitative',
        label: 'Quantitative aptitude',
        description: 'Percentages · ratios · time-speed-work · profit & loss',
        batchAvgPercent: 52,
        targetPercent: 75,
        statusLabel: 'Weakest area',
        statusTone: 'weak',
        isWeakestInTrack: true,
      },
      {
        id: 'logical',
        label: 'Logical reasoning',
        description: 'Syllogisms · blood relations · coding-decoding · series',
        batchAvgPercent: 71,
        targetPercent: 78,
        statusLabel: 'Good',
        statusTone: 'good',
        isWeakestInTrack: false,
      },
      {
        id: 'verbal',
        label: 'Verbal ability',
        description: 'Reading comprehension · sentence correction · vocabulary',
        batchAvgPercent: 58,
        targetPercent: 72,
        statusLabel: 'Needs work',
        statusTone: 'moderate',
        isWeakestInTrack: false,
      },
      {
        id: 'data_interpretation',
        label: 'Data interpretation',
        description: 'Tables · bar charts · pie charts · caselets',
        batchAvgPercent: 64,
        targetPercent: 74,
        statusLabel: 'Moderate',
        statusTone: 'moderate',
        isWeakestInTrack: false,
      },
    ];

    return this.toTrackSummary('aptitude', {
      batchAvgPercent,
      batchAvgLabel: `Avg: ${batchAvgPercent}/100`,
      benchmarkPercent: APTITUDE_BENCHMARK,
      belowBenchmarkCount,
      gapSummary: `${TRACK_META.aptitude.benchmarkLabel} is ${APTITUDE_BENCHMARK} · ${belowBenchmarkCount} students below benchmark`,
      modules,
    });
  }

  private buildSoftSkillsTrack(): TrainingTrackSummary {
    const batchAvgPercent = SOFT_SKILLS_BATCH_AVG;
    const belowBenchmarkCount = SOFT_SKILLS_BELOW_BENCHMARK;

    const modules: TrainingModuleMetric[] = [
      {
        id: 'group_discussion',
        label: 'Group discussion',
        description: 'Current affairs · abstract topics · business case GDs · faculty observation rubric',
        batchAvgPercent: 46,
        targetPercent: 70,
        statusLabel: 'Needs work',
        statusTone: 'weak',
        isWeakestInTrack: true,
      },
      {
        id: 'hr_interview',
        label: 'HR interview prep',
        description: 'Tell me about yourself · strengths/weaknesses · situational questions',
        batchAvgPercent: 50,
        targetPercent: 72,
        statusLabel: 'Week 3 of 6',
        statusTone: 'moderate',
        isWeakestInTrack: false,
      },
      {
        id: 'resume_linkedin',
        label: 'Resume & LinkedIn',
        description: '134 of 146 resumes reviewed · ATS score avg 72% · LinkedIn profiles active',
        batchAvgPercent: 72,
        targetPercent: 75,
        statusLabel: 'Done',
        statusTone: 'good',
        isWeakestInTrack: false,
      },
      {
        id: 'mock_interviews',
        label: 'Mock interviews',
        description: 'Scheduled: 2nd & 3rd Aug · 146 students · 12 industry panel members',
        batchAvgPercent: 40,
        targetPercent: 80,
        statusLabel: 'Pending',
        statusTone: 'priority',
        isWeakestInTrack: false,
      },
    ];

    return this.toTrackSummary('soft_skills', {
      batchAvgPercent,
      batchAvgLabel: `${(batchAvgPercent / 10).toFixed(1)} / 10`,
      benchmarkPercent: SOFT_SKILLS_BENCHMARK,
      belowBenchmarkCount,
      gapSummary: `Lowest readiness component across the batch · ${belowBenchmarkCount} students below 5/10`,
      modules,
    });
  }

  private buildTechnicalTrack(): TrainingTrackSummary {
    const batchAvgPercent = TECHNICAL_BATCH_AVG;
    const belowBenchmarkCount = TECHNICAL_BELOW_BENCHMARK;

    const modules: TrainingModuleMetric[] = [
      {
        id: 'dsa_foundations',
        label: 'DSA foundations',
        description: 'Arrays · strings · linked lists · trees · graphs · DP',
        batchAvgPercent: 55,
        targetPercent: 70,
        statusLabel: 'Priority 1',
        statusTone: 'priority',
        isWeakestInTrack: true,
      },
      {
        id: 'java_python',
        label: 'Java / Python basics',
        description: 'OOP · collections · exception handling · file I/O',
        batchAvgPercent: 76,
        targetPercent: 80,
        statusLabel: 'Good',
        statusTone: 'good',
        isWeakestInTrack: false,
      },
      {
        id: 'sql_databases',
        label: 'SQL & databases',
        description: 'Joins · subqueries · normalization · indexing',
        batchAvgPercent: 60,
        targetPercent: 75,
        statusLabel: 'Moderate',
        statusTone: 'moderate',
        isWeakestInTrack: false,
      },
    ];

    return this.toTrackSummary('technical', {
      batchAvgPercent,
      batchAvgLabel: `${batchAvgPercent}%`,
      benchmarkPercent: TECHNICAL_BENCHMARK,
      belowBenchmarkCount,
      gapSummary: `${belowBenchmarkCount} students below dream-company coding benchmark`,
      modules,
    });
  }

  private toTrackSummary(
    track: TrainingTrackId,
    data: Omit<TrainingTrackSummary, 'track' | 'title' | 'subtitle' | 'detailRoute' | 'interventionRoute' | 'benchmarkLabel'> & {
      benchmarkPercent: number;
    },
  ): TrainingTrackSummary {
    const meta = TRACK_META[track];
    const routeTrack = track === 'soft_skills' ? 'soft-skills' : track;

    return {
      track,
      title: meta.title,
      subtitle: meta.subtitle,
      benchmarkLabel: meta.benchmarkLabel,
      detailRoute: `/training-dashboards?track=${routeTrack}`,
      interventionRoute: `/intervention-priority?focus=${routeTrack}`,
      ...data,
    };
  }

  private findWeakestTrack(tracks: TrainingTrackSummary[]): TrainingTrackSummary {
    return tracks.reduce((weakest, current) => {
      const weakestScore =
        weakest.belowBenchmarkCount * 10 + (weakest.benchmarkPercent - weakest.batchAvgPercent);
      const currentScore =
        current.belowBenchmarkCount * 10 + (current.benchmarkPercent - current.batchAvgPercent);
      return currentScore > weakestScore ? current : weakest;
    });
  }

}
