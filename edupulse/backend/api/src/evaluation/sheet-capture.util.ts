const USN_PATTERN = /PES1UG23CS\d{3}/i;

export function detectSheetCorners(cornerPoints?: [number, number][]): boolean {
  if (!cornerPoints || cornerPoints.length !== 4) return false;
  return cornerPoints.every(([x, y]) => x >= 0.02 && x <= 0.98 && y >= 0.02 && y <= 0.98);
}

export function extractUsnFromHeader(headerText: string | undefined, rosterUsns: string[]): string | null {
  if (!headerText?.trim()) return null;
  const match = headerText.match(USN_PATTERN);
  if (!match) return null;
  const usn = match[0].toUpperCase();
  return rosterUsns.includes(usn) ? usn : null;
}

export const CORNER_REPOSITION_WARNING =
  'Sheet corners not detected — reposition the page so all four edges are visible in the frame.';
