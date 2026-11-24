// Pure math helpers for audio spectrum band aggregation and player time formatting

export interface AudioBands {
  bass: number;   // 0..1
  mid: number;    // 0..1
  treble: number; // 0..1
  overall: number; // 0..1
}

export function computeAudioBands(bins: ArrayLike<number>): AudioBands {
  const len = bins.length;
  if (len === 0) {
    return { bass: 0, mid: 0, treble: 0, overall: 0 };
  }

  const bassEnd = Math.max(1, Math.floor(len * 0.2));
  const midEnd = Math.max(bassEnd + 1, Math.floor(len * 0.58));

  let bassSum = 0;
  let midSum = 0;
  let trebleSum = 0;

  for (let i = 0; i < len; i++) {
    const norm = Math.min(1, Math.max(0, bins[i] / 255));
    if (i < bassEnd) {
      bassSum += norm;
    } else if (i < midEnd) {
      midSum += norm;
    } else {
      trebleSum += norm;
    }
  }

  const bass = bassSum / bassEnd;
  const mid = midSum / Math.max(1, midEnd - bassEnd);
  const treble = trebleSum / Math.max(1, len - midEnd);
  const overall = bass * 0.45 + mid * 0.35 + treble * 0.2;

  return { bass, mid, treble, overall };
}

export function formatTrackTime(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
