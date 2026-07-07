import { Permission, hasPermission } from '@/src/lib/rbac';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type QuickActionTile = {
  id: string;
  label: string;
  lines: [string, string];
  icon: string;
  backgroundColor: string;
  textColor: string;
  route:
    | '/paper-craft'
    | '/syllabus-vault'
    | '/dean-pulse'
    | '/alerts'
    | '/mark-matrix'
    | '/answer-sheet'
    | '/academic-level'
    | '/campus-drive'
    | '/college-radar'
    | null;
  permission?: (typeof Permission)[keyof typeof Permission];
  facultyPrimary?: boolean;
  studentPrimary?: boolean;
};

export const QUICK_ACTION_TILES: QuickActionTile[] = [
  {
    id: 'paper-craft',
    label: 'Paper Craft',
    lines: ['Paper', 'Craft'],
    icon: '📝',
    backgroundColor: '#EEEDFE',
    textColor: '#3C3489',
    route: '/paper-craft',
    permission: Permission.PaperCraftGenerate,
    facultyPrimary: true,
  },
  {
    id: 'syllabus-vault',
    label: 'Syllabus Vault',
    lines: ['Syllabus', 'Vault'],
    icon: '📚',
    backgroundColor: '#E1F5EE',
    textColor: '#085041',
    route: '/syllabus-vault',
    permission: Permission.SyllabusRead,
    facultyPrimary: true,
  },
  {
    id: 'mark-matrix',
    label: 'Mark Matrix',
    lines: ['Mark', 'Matrix'],
    icon: '🎯',
    backgroundColor: '#E6F1FB',
    textColor: '#0C447C',
    route: '/mark-matrix',
    permission: Permission.MarksEntry,
    facultyPrimary: true,
  },
  {
    id: 'answer-sheet',
    label: 'Answer Sheet AI',
    lines: ['Answer', 'Sheet AI'],
    icon: '📋',
    backgroundColor: '#E1F5EE',
    textColor: '#085041',
    route: '/answer-sheet',
    permission: Permission.AnswerSheetAi,
    facultyPrimary: true,
  },
  {
    id: 'campus-drive',
    label: 'Campus Drive',
    lines: ['Campus', 'Drive'],
    icon: '🎯',
    backgroundColor: '#EEEDFE',
    textColor: '#3C3489',
    route: '/campus-drive',
    permission: Permission.CampusDriveRead,
  },
  {
    id: 'dean-pulse',
    label: 'Dean Pulse',
    lines: ['Dean', 'Pulse'],
    icon: '🏛',
    backgroundColor: '#f5f4ef',
    textColor: '#444',
    route: '/dean-pulse',
    permission: Permission.DeanPulseRead,
  },
  {
    id: 'college-radar',
    label: 'College Radar',
    lines: ['College', 'Radar'],
    icon: '📡',
    backgroundColor: '#E6F1FB',
    textColor: '#0C447C',
    route: '/college-radar',
    permission: Permission.CollegeRadarRead,
  },
  {
    id: 'academic-level',
    label: 'Academic Level',
    lines: ['Academic', 'Level'],
    icon: '📈',
    backgroundColor: '#EEEDFE',
    textColor: '#3C3489',
    route: '/academic-level',
    permission: Permission.StudentDiagnosisRead,
    studentPrimary: true,
  },
];

type Props = {
  roles: string[];
  onPress: (action: QuickActionTile) => void;
};

export function QuickActionGrid({ roles, onPress }: Props) {
  const isFaculty = roles.includes('faculty') || roles.includes('admin');
  const isStudent = roles.includes('student');

  const permitted = QUICK_ACTION_TILES.filter(
    (tile) => !tile.permission || hasPermission(roles, tile.permission),
  );

  const facultyPrimary = permitted.filter((tile) => tile.facultyPrimary);
  const studentPrimary = permitted.filter((tile) => tile.studentPrimary);
  const secondary = permitted.filter((tile) => !tile.facultyPrimary && !tile.studentPrimary);

  const displayTiles = isFaculty
    ? [...facultyPrimary, ...secondary]
    : isStudent
      ? [...studentPrimary, ...secondary]
      : secondary;

  return (
    <View>
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.grid}>
        {displayTiles.map((action) => (
          <Pressable
            key={action.id}
            style={[styles.tile, { backgroundColor: action.backgroundColor }]}
            onPress={() => onPress(action)}
          >
            <Text style={styles.icon}>{action.icon}</Text>
            <Text style={[styles.tileLabel, { color: action.textColor }]}>
              {action.lines[0]}
              {'\n'}
              {action.lines[1]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tile: {
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
    marginBottom: 5,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
});
