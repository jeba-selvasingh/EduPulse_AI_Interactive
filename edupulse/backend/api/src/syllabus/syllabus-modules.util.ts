import type { SyllabusModule } from './syllabus.schema';

export function formatModuleSourceLabel(module: SyllabusModule): string {
  return `Syllabus module ${module.moduleNumber}: ${module.title}, pages ${module.pageStart}–${module.pageEnd}`;
}

export const PILOT_BCS304_MODULES = [
  { moduleNumber: 1, title: 'Introduction & Arrays', pageStart: 4, pageEnd: 18 },
  { moduleNumber: 2, title: 'Linked Lists', pageStart: 19, pageEnd: 41 },
  { moduleNumber: 3, title: 'Trees', pageStart: 42, pageEnd: 58 },
  { moduleNumber: 4, title: 'Graphs', pageStart: 59, pageEnd: 76 },
] as const;
