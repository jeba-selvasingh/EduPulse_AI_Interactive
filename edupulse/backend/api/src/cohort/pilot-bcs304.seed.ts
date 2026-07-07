import { COHORT_CSV_TEMPLATE_HEADER } from './cohort.schema';

const FIRST_NAMES = [
  'Aditi', 'Bharath', 'Chetan', 'Divya', 'Farhan', 'Gauri', 'Harsh', 'Isha',
  'Jatin', 'Kavya', 'Laksh', 'Meera', 'Nikhil', 'Oviya', 'Pranav', 'Riya',
  'Sahil', 'Tara', 'Uday', 'Varun', 'Yash', 'Zara', 'Aarav', 'Bhavya',
  'Chirag', 'Deepa', 'Eshan', 'Falguni', 'Gokul', 'Hema', 'Irfan', 'Juhi',
  'Karthik', 'Lavanya', 'Manish', 'Neha', 'Omkar', 'Pooja', 'Rahul', 'Sneha',
  'Tanvi', 'Umesh', 'Vidya', 'Wasim', 'Xavier', 'Yamini', 'Zubin', 'Aisha',
  'Balaji', 'Charu', 'Dinesh', 'Esha', 'Firoz', 'Geeta', 'Harish', 'Indira',
  'Jeevan', 'Kiran', 'Lata', 'Mohan', 'Nandini', 'Ojas', 'Pallavi', 'Rohan',
];

const LAST_INITIALS = ['K', 'M', 'R', 'S', 'A', 'P', 'N', 'G', 'V', 'D'];

export function generatePilotBcs304Csv(): string {
  const lines = [COHORT_CSV_TEMPLATE_HEADER];

  for (let i = 0; i < 64; i += 1) {
    const usn = `PES1UG23CS${String(i + 1).padStart(3, '0')}`;
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_INITIALS[i % LAST_INITIALS.length];
    lines.push(`${usn},${first} ${last},BCS304,CSE-A,Odd Sem 2026`);
  }

  return lines.join('\n');
}
