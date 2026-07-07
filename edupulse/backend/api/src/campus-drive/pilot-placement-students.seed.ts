export type PilotPlacementStudent = {
  usn: string;
  name: string;
  cgpa: number;
  activeBacklogs: number;
  everBacklogs: number;
  codingScore: number;
  communicationScore: number;
  certsScore: number;
  aptitudeScore: number;
  hasInfyTqCert: boolean;
};

/** Pilot batch — tuned so company eligibility counts match prototype Screen 27 */
export const PILOT_BATCH_STRENGTH = 146;
export const PILOT_BATCH_LABEL = '2027 batch';
export const PILOT_TOTAL_COMPANIES = 41;
export const NEAR_MISS_CGPA_WINDOW = 0.3;

const PILOT_STUDENT_NAMES = [
  'Divya S',
  'Bharath M',
  'Chetan R',
  'Aditi K',
  'Farhan A',
  'Meera P',
  'Rohan V',
  'Sneha L',
  'Karthik N',
  'Ananya T',
];

function studentName(index: number): string {
  if (index === 0) return 'Divya S';
  if (index === 60) return 'Chetan R';
  if (index === 48) return 'Farhan A';
  return PILOT_STUDENT_NAMES[index % PILOT_STUDENT_NAMES.length];
}

function studentProfile(
  index: number,
  cgpa: number,
  overrides: Partial<Omit<PilotPlacementStudent, 'usn' | 'cgpa' | 'name'>> = {},
): PilotPlacementStudent {
  const codingScore = overrides.codingScore ?? 7;
  const hasInfyTqCert = overrides.hasInfyTqCert ?? index % 3 === 0;

  return {
    usn: `PES1UG23CS${String(index + 1).padStart(3, '0')}`,
    name: studentName(index),
    cgpa,
    activeBacklogs: 0,
    everBacklogs: 0,
    codingScore,
    communicationScore: overrides.communicationScore ?? 6 + (index % 4),
    certsScore: overrides.certsScore ?? (hasInfyTqCert ? 12 : 8 + (index % 5)),
    aptitudeScore: overrides.aptitudeScore ?? 6.5 + (index % 3) * 0.4,
    hasInfyTqCert,
    ...overrides,
  };
}

function buildPilotStudents(): PilotPlacementStudent[] {
  const students: PilotPlacementStudent[] = [];
  let index = 0;

  // Wipro Turbo eligible — 31 students at CGPA 8.0+
  for (let i = 0; i < 31; i += 1) {
    students.push(
      studentProfile(index, 8.05 + (i % 4) * 0.05, {
        codingScore: 8,
        communicationScore: 7.5,
        certsScore: 13,
      }),
    );
    index += 1;
  }

  // Wipro near miss — 8 students within 0.3 CGPA of 8.0 threshold
  for (let i = 0; i < 8; i += 1) {
    students.push(
      studentProfile(index, 7.7 + (i % 3) * 0.1, {
        codingScore: 7.5,
        communicationScore: 6.5,
      }),
    );
    index += 1;
  }

  // TCS ineligible — 1 student between 6.5 and 7.0
  students.push(studentProfile(index, 6.85, { aptitudeScore: 5.8 }));
  index += 1;

  // Infosys + TCS ineligible — 5 students below 6.5
  for (let i = 0; i < 5; i += 1) {
    students.push(
      studentProfile(index, 6.1 + i * 0.08, {
        communicationScore: 4.5,
        codingScore: 5.5,
      }),
    );
    index += 1;
  }

  // Cognizant ineligible — 3 students below threshold (Farhan A featured)
  for (let i = 0; i < 2; i += 1) {
    students.push(
      studentProfile(index, 5.8 + i * 0.05, {
        communicationScore: 4,
        codingScore: 5,
      }),
    );
    index += 1;
  }
  students.push(
    studentProfile(index, 6.2, {
      activeBacklogs: 1,
      everBacklogs: 1,
      codingScore: 5.5,
      communicationScore: 4.2,
      certsScore: 6,
      aptitudeScore: 5.2,
    }),
  );
  students[students.length - 1].name = 'Farhan A';
  index += 1;

  // Remaining batch — eligible for core drives, below Wipro near-miss band
  while (index < PILOT_BATCH_STRENGTH) {
    const cgpa = 7.05 + ((index * 11) % 60) / 100;
    const profile = studentProfile(index, Math.min(cgpa, 7.65));

    if (index === 60) {
      profile.name = 'Chetan R';
      profile.cgpa = 7.1;
      profile.communicationScore = 4;
      profile.aptitudeScore = 6.2;
      profile.certsScore = 11;
      profile.codingScore = 6.5;
    }

    students.push(profile);
    index += 1;
  }

  // Divya S — dream profile anchor (keep eligibility-friendly CGPA in seed)
  students[0] = {
    ...students[0],
    name: 'Divya S',
    communicationScore: 8.5,
    certsScore: 14,
    aptitudeScore: 8.2,
    hasInfyTqCert: true,
  };

  return students;
}

export const PILOT_PLACEMENT_STUDENTS = buildPilotStudents();
