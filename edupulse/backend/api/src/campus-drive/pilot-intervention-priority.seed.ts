import type { InterventionItem } from './intervention-priority.schema';

export const PILOT_INTERVENTION_ITEMS: Omit<
  InterventionItem,
  'completionStatus' | 'completionPercent' | 'completionNote'
>[] = [
  {
    id: 'backlog-clearance',
    rank: 1,
    title: 'Clear backlogs · 23 students',
    cohortSize: 23,
    urgency: 'urgent',
    urgencyLabel: 'Urgent',
    description:
      'Blocking 14+ companies each · supplementary exam 22 Aug · counselling sessions booked for 18 students',
    owner: 'TPO counselling desk',
    focusTags: ['backlog'],
  },
  {
    id: 'communication-crash-course',
    rank: 2,
    title: 'Communication crash course',
    cohortSize: 38,
    urgency: 'high',
    urgencyLabel: 'High impact',
    description:
      '38 students: good CGPA, low comm score · 2-week intensive · 6 sessions/week · faculty: Prof. Meena',
    owner: 'Prof. Meena',
    focusTags: ['soft_skills', 'communication'],
  },
  {
    id: 'quant-sprint',
    rank: 3,
    title: 'Quant sprint · 78 students',
    cohortSize: 78,
    urgency: 'medium',
    urgencyLabel: 'Medium',
    description:
      'Below TCS NQT benchmark · 30-day plan · 1hr daily · online platform AMCAT + Indiabix',
    owner: 'TPO training cell',
    focusTags: ['aptitude', 'quant'],
  },
  {
    id: 'dsa-sprint',
    rank: 4,
    title: 'DSA sprint · 66 students',
    cohortSize: 66,
    urgency: 'medium',
    urgencyLabel: 'Medium',
    description:
      'LeetCode easy-medium · 3 problems/day · Sat mock test · mentor: Dept coding club',
    owner: 'Dept coding club',
    focusTags: ['technical', 'dsa'],
  },
  {
    id: 'infytq-certification',
    rank: 5,
    title: 'InfyTQ certification · 49 students',
    cohortSize: 49,
    urgency: 'quick_win',
    urgencyLabel: 'Quick win',
    description:
      'Infosys SP requires it · free cert · 8hr course · deadline 18 Aug · 89 already done',
    owner: 'TPO placement desk',
    focusTags: ['certification', 'infytq'],
  },
];
