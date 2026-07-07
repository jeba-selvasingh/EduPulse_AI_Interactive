const SNIPPET_TEMPLATES: Record<string, { caption: string; lines: string[] }> = {
  Q1: {
    caption: 'Student attempted circular queue with partial diagram',
    lines: [
      'Enqueue at rear, dequeue at front',
      'Diagram: front/rear pointers drawn',
      'Overflow condition mentioned',
      '[handwriting unclear near rear pointer]',
    ],
  },
  Q2: {
    caption: 'Insertion sort trace with missing complexity step',
    lines: [
      'Pass 1: 5 2 8 1 → 2 5 8 1',
      'Pass 2: sorted prefix grows',
      'Pseudocode partially copied',
      '[time complexity line cut off at margin]',
    ],
  },
  Q3: {
    caption: 'AVL construction — rotation steps partly unclear',
    lines: [
      'Insert 30: root=30',
      'Insert 20: left child',
      'Insert 10: LL rotation → 20 becomes root ✓',
      'Insert 25: right of 20',
      '[balance factor missing]',
      '[rotation steps unclear]',
    ],
  },
};

export function buildScannedSnippet(usn: string, questionKey: string): {
  scannedSnippet: string;
  snippetCaption: string;
} {
  const template = SNIPPET_TEMPLATES[questionKey] ?? {
    caption: `Scanned answer for ${questionKey}`,
    lines: ['Student response captured from uploaded sheet', `[USN ${usn} · page fragment]`],
  };

  const scannedSnippet = template.lines.join('\n');
  return {
    scannedSnippet,
    snippetCaption: template.caption,
  };
}
