export interface LyricLine {
  time: number; // seconds
  text: string;
}

/**
 * Parse LRC format into an array of timed lyric lines.
 * Format: [mm:ss.xx] text
 */
export function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/;

  for (const rawLine of lrc.split('\n')) {
    const match = rawLine.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centiseconds = parseInt(match[3], 10);
      const ms = match[3].length === 3 ? centiseconds : centiseconds * 10;
      const time = minutes * 60 + seconds + ms / 1000;
      const text = match[4]?.trim() ?? '';
      if (text) {
        lines.push({ time, text });
      }
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

/**
 * Find the index of the current lyric line based on elapsed time.
 * Returns -1 if no line matches yet.
 */
export function findCurrentLine(lines: LyricLine[], elapsed: number): number {
  let current = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= elapsed) {
      current = i;
    } else {
      break;
    }
  }
  return current;
}
