const TITLE_THRESHOLD = 0.6;
const ARTIST_THRESHOLD = 0.55;

export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bfeat\b\.?/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const distances: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) distances[i]![0] = i;
  for (let j = 0; j < cols; j++) distances[0]![j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      distances[i]![j] = Math.min(
        distances[i - 1]![j]! + 1,
        distances[i]![j - 1]! + 1,
        distances[i - 1]![j - 1]! + cost
      );
    }
  }

  return distances[rows - 1]![cols - 1]!;
}

export function similarity(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  const maxLength = Math.max(normA.length, normB.length);
  if (maxLength === 0) return 1;
  const distance = levenshtein(normA, normB);
  return 1 - distance / maxLength;
}

export function isMatch(
  query: { title: string; artist: string },
  candidate: { title: string; artist: string }
): boolean {
  return (
    similarity(query.title, candidate.title) >= TITLE_THRESHOLD &&
    similarity(query.artist, candidate.artist) >= ARTIST_THRESHOLD
  );
}
