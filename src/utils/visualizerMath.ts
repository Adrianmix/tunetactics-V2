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

export function clampProgressRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  return Math.min(1, Math.max(0, ratio));
}

export interface SmoothEqPoint {
  x: number;
  lineY: number;
  dotY: number;
  energy: number;
}

export function buildSmoothEqPoints(params: {
  count: number;
  width: number;
  baselineY: number;
  maxLift: number;
  timeSec: number;
  smoothedEnergy: ArrayLike<number>;
  baseWaveform: readonly number[];
  isPlaying: boolean;
}): SmoothEqPoint[] {
  const {
    count,
    width,
    baselineY,
    maxLift,
    timeSec,
    smoothedEnergy,
    baseWaveform,
    isPlaying,
  } = params;

  if (count < 2 || width <= 0) return [];

  const points: SmoothEqPoint[] = new Array(count);
  const waveLen = baseWaveform.length || 1;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const x = t * width;

    // Sample static track contour smoothly from baseWaveform (0..1)
    const wfFloat = t * (waveLen - 1);
    const wfIdx = Math.floor(wfFloat);
    const wfFrac = wfFloat - wfIdx;
    const w0 = (baseWaveform[wfIdx] ?? 40) / 100;
    const w1 = (baseWaveform[Math.min(waveLen - 1, wfIdx + 1)] ?? 40) / 100;
    const contour = w0 + (w1 - w0) * wfFrac;

    const live = Math.min(1, Math.max(0, smoothedEnergy[i] ?? 0));

    // Organic continuous wave motion
    const primaryWave = Math.sin(t * Math.PI * 3.4 - timeSec * (isPlaying ? 3.8 : 1.15));
    const secondaryWave = Math.cos(t * Math.PI * 6.2 + timeSec * (isPlaying ? 2.5 : 0.8));
    const harmonic = 0.5 + 0.5 * (primaryWave * 0.62 + secondaryWave * 0.38);

    const effectiveEnergy = isPlaying
      ? Math.min(1, contour * 0.35 + live * 0.55 + harmonic * 0.25)
      : Math.min(1, contour * 0.42 + harmonic * 0.16);

    const lineLift = (0.14 + effectiveEnergy * 0.86) * maxLift;
    const lineY = baselineY - lineLift;

    // Curvy dots arc smoothly above/around the EQ curve in a complementary wave
    const dotPhase = Math.sin(t * Math.PI * 4.5 + timeSec * (isPlaying ? 3.1 : 1.0));
    const dotLift =
      lineLift * (0.68 + 0.32 * (0.5 + 0.5 * dotPhase)) +
      (isPlaying ? 5 + live * 6 : 3.5);
    const dotY = Math.max(6, baselineY - dotLift);

    points[i] = {
      x,
      lineY,
      dotY,
      energy: effectiveEnergy,
    };
  }

  return points;
}

