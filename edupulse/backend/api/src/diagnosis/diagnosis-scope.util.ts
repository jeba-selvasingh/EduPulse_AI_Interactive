import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { AppRole } from '../rbac/permissions';
import {
  DEV_STUDENT_EMAIL,
  PILOT_STUDENT_USN,
} from './pilot-student-academic-level.seed';

export function resolveDiagnosisUsn(user: AuthUser, requestedUsn?: string): string {
  const isStudent = user.roles.includes(AppRole.Student);
  const canPreview =
    user.roles.includes(AppRole.Faculty) ||
    user.roles.includes(AppRole.Admin) ||
    user.roles.includes(AppRole.Principal);

  if (requestedUsn) {
    if (!canPreview && !isStudent) {
      throw new ForbiddenException({
        code: 'STUDENT_SCOPE_ONLY',
        message: 'Students can only view their own diagnosis',
      });
    }
    if (isStudent && requestedUsn !== studentUsnForUser(user)) {
      throw new ForbiddenException({
        code: 'STUDENT_SCOPE_ONLY',
        message: 'Students can only view their own diagnosis',
      });
    }
    return requestedUsn;
  }

  if (isStudent) {
    return studentUsnForUser(user);
  }

  return PILOT_STUDENT_USN;
}

export function studentUsnForUser(user: AuthUser): string {
  if (user.email === DEV_STUDENT_EMAIL) {
    return PILOT_STUDENT_USN;
  }
  return PILOT_STUDENT_USN;
}
