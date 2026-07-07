import { Injectable } from '@nestjs/common';
import type { CourseRoster, ImportSummary } from './cohort.schema';
import { parseCohortCsv, rowToRecord } from './cohort-csv.parser';
import { generatePilotBcs304Csv } from './pilot-bcs304.seed';

type StudentRecord = {
  id: string;
  institutionId: string;
  usn: string;
  name: string;
};

type CourseRecord = {
  id: string;
  institutionId: string;
  code: string;
  section: string;
  semester: string;
};

type EnrollmentRecord = {
  id: string;
  institutionId: string;
  studentId: string;
  courseId: string;
  usn: string;
  courseCode: string;
};

@Injectable()
export class CohortStoreService {
  private readonly students = new Map<string, StudentRecord>();
  private readonly courses = new Map<string, CourseRecord>();
  private readonly enrollments = new Map<string, EnrollmentRecord>();
  private seeded = false;

  private studentKey(institutionId: string, usn: string): string {
    return `${institutionId}:${usn.toUpperCase()}`;
  }

  private courseKey(
    institutionId: string,
    code: string,
    section: string,
    semester: string,
  ): string {
    return `${institutionId}:${code.toUpperCase()}:${section}:${semester}`;
  }

  private enrollmentKey(institutionId: string, usn: string, courseCode: string): string {
    return `${institutionId}:${usn.toUpperCase()}:${courseCode.toUpperCase()}`;
  }

  ensurePilotSeed(institutionId: string): void {
    if (this.seeded) {
      return;
    }

    const hasAny = [...this.enrollments.values()].some(
      (e) => e.institutionId === institutionId && e.courseCode === 'BCS304',
    );

    if (!hasAny) {
      this.importCsv(institutionId, generatePilotBcs304Csv());
    }

    this.seeded = true;
  }

  importCsv(institutionId: string, csv: string): ImportSummary {
    const summary: ImportSummary = {
      rowsProcessed: 0,
      studentsCreated: 0,
      studentsUpdated: 0,
      coursesCreated: 0,
      coursesUpdated: 0,
      enrollmentsCreated: 0,
      enrollmentsUpdated: 0,
      errors: [],
    };

    for (const row of parseCohortCsv(csv)) {
      summary.rowsProcessed += 1;
      const record = rowToRecord(row.values);

      if (!record) {
        summary.errors.push({
          row: row.rowNumber,
          message: 'Expected 5 columns: USN, Student Name, Course Code, Section, Semester',
        });
        continue;
      }

      if (!record.usn || !record.studentName || !record.courseCode) {
        summary.errors.push({
          row: row.rowNumber,
          message: 'USN, student name, and course code are required',
        });
        continue;
      }

      const studentK = this.studentKey(institutionId, record.usn);
      const existingStudent = this.students.get(studentK);
      const studentId = existingStudent?.id ?? crypto.randomUUID();

      if (existingStudent) {
        if (existingStudent.name !== record.studentName) {
          this.students.set(studentK, { ...existingStudent, name: record.studentName });
          summary.studentsUpdated += 1;
        }
      } else {
        this.students.set(studentK, {
          id: studentId,
          institutionId,
          usn: record.usn.toUpperCase(),
          name: record.studentName,
        });
        summary.studentsCreated += 1;
      }

      const courseK = this.courseKey(
        institutionId,
        record.courseCode,
        record.section,
        record.semester,
      );
      const existingCourse = this.courses.get(courseK);
      const courseId = existingCourse?.id ?? crypto.randomUUID();

      if (existingCourse) {
        // Course identity unchanged on re-import
      } else {
        this.courses.set(courseK, {
          id: courseId,
          institutionId,
          code: record.courseCode.toUpperCase(),
          section: record.section,
          semester: record.semester,
        });
        summary.coursesCreated += 1;
      }

      const enrollmentK = this.enrollmentKey(
        institutionId,
        record.usn,
        record.courseCode,
      );
      const existingEnrollment = this.enrollments.get(enrollmentK);

      if (existingEnrollment) {
        if (existingEnrollment.studentId !== studentId || existingEnrollment.courseId !== courseId) {
          this.enrollments.set(enrollmentK, {
            id: existingEnrollment.id,
            institutionId,
            studentId,
            courseId,
            usn: record.usn.toUpperCase(),
            courseCode: record.courseCode.toUpperCase(),
          });
          summary.enrollmentsUpdated += 1;
        }
      } else {
        this.enrollments.set(enrollmentK, {
          id: crypto.randomUUID(),
          institutionId,
          studentId,
          courseId,
          usn: record.usn.toUpperCase(),
          courseCode: record.courseCode.toUpperCase(),
        });
        summary.enrollmentsCreated += 1;
      }
    }

    return summary;
  }

  getCourseRoster(institutionId: string, courseCode: string): CourseRoster {
    const normalized = courseCode.toUpperCase();
    const matches = [...this.enrollments.values()].filter(
      (e) => e.institutionId === institutionId && e.courseCode === normalized,
    );

    const students = matches
      .map((enrollment) => {
        const student = [...this.students.values()].find(
          (s) => s.id === enrollment.studentId,
        );
        if (!student) {
          return null;
        }
        return { usn: student.usn, name: student.name };
      })
      .filter((s): s is { usn: string; name: string } => s !== null)
      .sort((a, b) => a.usn.localeCompare(b.usn));

    const course = [...this.courses.values()].find(
      (c) => c.institutionId === institutionId && c.code === normalized,
    );

    return {
      courseCode: normalized,
      section: course?.section,
      semester: course?.semester,
      students,
      total: students.length,
    };
  }
}
