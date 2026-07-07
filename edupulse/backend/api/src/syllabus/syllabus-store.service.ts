import { Injectable } from '@nestjs/common';
import type { SyllabusModule, SyllabusRecord } from './syllabus.schema';

@Injectable()
export class SyllabusStoreService {
  private readonly versionsById = new Map<string, SyllabusRecord>();
  private readonly versionIdsByCourseTerm = new Map<string, string[]>();
  private readonly activeByCourseTerm = new Map<string, string>();
  private readonly modulesBySyllabusId = new Map<string, SyllabusModule[]>();

  private courseTermKey(
    institutionId: string,
    courseCode: string,
    academicTerm: string,
  ): string {
    return `${institutionId}:${courseCode.toUpperCase()}:${academicTerm}`;
  }

  getById(syllabusId: string): SyllabusRecord | null {
    return this.versionsById.get(syllabusId) ?? null;
  }

  getActive(
    institutionId: string,
    courseCode: string,
    academicTerm: string,
  ): SyllabusRecord | null {
    const activeId = this.activeByCourseTerm.get(
      this.courseTermKey(institutionId, courseCode, academicTerm),
    );
    if (!activeId) {
      return null;
    }
    return this.versionsById.get(activeId) ?? null;
  }

  listVersions(
    institutionId: string,
    courseCode: string,
    academicTerm: string,
  ): SyllabusRecord[] {
    const ids =
      this.versionIdsByCourseTerm.get(
        this.courseTermKey(institutionId, courseCode, academicTerm),
      ) ?? [];
    return ids
      .map((id) => this.versionsById.get(id))
      .filter((r): r is SyllabusRecord => Boolean(r))
      .sort((a, b) => b.version - a.version);
  }

  addVersion(record: SyllabusRecord, activate: boolean): SyllabusRecord {
    const ctKey = this.courseTermKey(
      record.institutionId,
      record.courseCode,
      record.academicTerm,
    );
    const ids = this.versionIdsByCourseTerm.get(ctKey) ?? [];
    ids.push(record.id);
    this.versionIdsByCourseTerm.set(ctKey, ids);
    this.versionsById.set(record.id, record);

    if (activate) {
      return this.setActive(record.institutionId, record.courseCode, record.academicTerm, record.id)
        .activated;
    }

    return record;
  }

  setActive(
    institutionId: string,
    courseCode: string,
    academicTerm: string,
    syllabusId: string,
  ): { activated: SyllabusRecord; superseded: SyllabusRecord | null } {
    const target = this.versionsById.get(syllabusId);
    if (!target) {
      throw new Error('SYLLABUS_NOT_FOUND');
    }

    const ctKey = this.courseTermKey(institutionId, courseCode, academicTerm);
    const now = new Date().toISOString();
    let superseded: SyllabusRecord | null = null;

    const currentActiveId = this.activeByCourseTerm.get(ctKey);
    if (currentActiveId && currentActiveId !== syllabusId) {
      const current = this.versionsById.get(currentActiveId);
      if (current && current.status === 'active') {
        superseded = {
          ...current,
          status: 'superseded',
          supersededAt: now,
        };
        this.versionsById.set(currentActiveId, superseded);
      }
    }

    const activated: SyllabusRecord = {
      ...target,
      status: 'active',
      activatedAt: now,
      supersededAt: null,
    };
    this.versionsById.set(syllabusId, activated);
    this.activeByCourseTerm.set(ctKey, syllabusId);

    return { activated, superseded };
  }

  nextVersionNumber(
    institutionId: string,
    courseCode: string,
    academicTerm: string,
  ): number {
    const versions = this.listVersions(institutionId, courseCode, academicTerm);
    if (versions.length === 0) {
      return 1;
    }
    return Math.max(...versions.map((v) => v.version)) + 1;
  }

  listModules(syllabusId: string): SyllabusModule[] {
    return [...(this.modulesBySyllabusId.get(syllabusId) ?? [])].sort(
      (a, b) => a.moduleNumber - b.moduleNumber,
    );
  }

  saveModules(syllabusId: string, modules: SyllabusModule[]): SyllabusModule[] {
    const sorted = [...modules].sort((a, b) => a.moduleNumber - b.moduleNumber);
    this.modulesBySyllabusId.set(syllabusId, sorted);
    return sorted;
  }
}
