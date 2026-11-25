import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import {
  PRODUCER_SAMPLE_DURATION_SEC,
  studioAudio,
} from '../utils/audioPreview';
import { buildSmoothEqPoints, clampProgressRatio } from '../utils/visualizerMath';

interface ContinuousEqProgressProps {
  profileId: 'producer' | 'singer';
  trackTitle: string;
  waveform: readonly number[];
  isPlaying: boolean;
  playStep: number;
  elapsedSec: number;
  durationSec: number;
  onSeek?: (ratio: number) => void;
}

const NODE_COUNT = 38;

function traceSplinePath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[]
) {
  if (points.length < 2) return;
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) * 0.5;
    const midY = (points[i].y + points[i + 1].y) * 0.5;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

export default function ContinuousEqProgress({
  profileId,
  trackTitle,
  waveform,
  isPlaying,
  playStep,
  elapsedSec,
  durationSec,
  onSeek,
}: ContinuousEqProgressProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isScrubbingRef = useRef(false);

  // Store reactive props in refs so the 60fps canvas loop mounts once smoothly
  const stateRef = useRef({
    profileId,
    waveform,
    isPlaying,
    playStep,
    elapsedSec,
    durationSec,
  });
  stateRef.current = {
    profileId,
    waveform,
    isPlaying,
    playStep,
    elapsedSec,
    durationSec,
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let cssWidth = Math.max(200, container.clientWidth);
    let cssHeight = Math.max(68, container.clientHeight);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      cssWidth = Math.max(200, container.clientWidth);
      cssHeight = Math.max(68, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
    };
    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);

    const fftScratch = new Uint8Array(32);
    const smoothedEnergy = new Float32Array(NODE_COUNT);
    let smoothedProgress = profileId === 'producer' ? 0 : 0.3;
    let rafId = 0;
    let lastTimeMs = performance.now();
    const startTimeMs = lastTimeMs;

    const drawFrame = (nowMs: number) => {
      const dt = Math.min(0.05, Math.max(0.004, (nowMs - lastTimeMs) / 1000));
      lastTimeMs = nowMs;
      const elapsedAnim = prefersReducedMotion ? 0 : (nowMs - startTimeMs) / 1000;

      const s = stateRef.current;

      // Determine continuous target progress [0..1]
      let targetProgress = 0;
      if (s.profileId === 'producer') {
        const live = studioAudio.getProducerProgress();
        const safeDur =
          live.duration > 0 ? live.duration : PRODUCER_SAMPLE_DURATION_SEC;
        targetProgress = clampProgressRatio(live.currentTime / safeDur);
      } else {
        targetProgress = s.isPlaying
          ? clampProgressRatio((s.playStep % 32) / 31)
          : 0.31;
      }

      // Smooth progress interpolation (snap quickly when looping/seeking)
      const progressDiff = Math.abs(targetProgress - smoothedProgress);
      if (progressDiff > 0.2 || !s.isPlaying) {
        smoothedProgress = targetProgress;
      } else {
        const progRate = 1 - Math.exp(-16 * dt);
        smoothedProgress += (targetProgress - smoothedProgress) * progRate;
      }

      // Sample live Web Audio FFT bins when active
      const fftSample = studioAudio.sampleFrequencyData(fftScratch);
      const isFftActive = s.isPlaying && fftSample.active;

      for (let i = 0; i < NODE_COUNT; i++) {
        let targetBin = 0;
        if (isFftActive) {
          // Fold symmetric/musical low-mid-treble profile across the horizontal span
          const normPos = i / (NODE_COUNT - 1);
          const mirrorPos = 1 - Math.abs(normPos * 2 - 1); // peaks in mid/bass center
          const binFloat = (1 - mirrorPos) * (fftScratch.length * 0.72);
          const idx0 = Math.min(fftScratch.length - 1, Math.floor(binFloat));
          const idx1 = Math.min(fftScratch.length - 1, idx0 + 1);
          const frac = binFloat - idx0;
          const v0 = fftScratch[idx0] / 255;
          const v1 = fftScratch[idx1] / 255;
          targetBin = v0 + (v1 - v0) * frac;
        }
        const speed = targetBin > smoothedEnergy[i] ? 14 : 6.5;
        const alpha = 1 - Math.exp(-speed * dt);
        smoothedEnergy[i] += (targetBin - smoothedEnergy[i]) * alpha;
      }

      const baselineY = cssHeight - 10;
      const maxLift = Math.max(28, baselineY - 12);
      const points = buildSmoothEqPoints({
        count: NODE_COUNT,
        width: cssWidth,
        baselineY,
        maxLift,
        timeSec: elapsedAnim,
        smoothedEnergy,
        baseWaveform: s.waveform,
        isPlaying: s.isPlaying,
      });

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      if (points.length >= 2) {
        const progressX = clampProgressRatio(smoothedProgress) * cssWidth;
        const linePts = points.map((p) => ({ x: p.x, y: p.lineY }));
        const dotPts = points.map((p) => ({ x: p.x, y: p.dotY }));

        // 1. Unplayed smooth Line EQ + subtle gradient fill
        ctx.beginPath();
        traceSplinePath(ctx, linePts);
        ctx.strokeStyle = 'rgba(78, 121, 184, 0.48)';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Fill under unplayed line
        ctx.lineTo(cssWidth, baselineY);
        ctx.lineTo(0, baselineY);
        ctx.closePath();
        const unplayedFill = ctx.createLinearGradient(0, 8, 0, baselineY);
        unplayedFill.addColorStop(0, 'rgba(30, 68, 122, 0.18)');
        unplayedFill.addColorStop(1, 'rgba(0, 22, 51, 0)');
        ctx.fillStyle = unplayedFill;
        ctx.fill();

        // Faint gossamer wave guiding the curvy dots (unplayed)
        ctx.beginPath();
        traceSplinePath(ctx, dotPts);
        ctx.strokeStyle = 'rgba(159, 180, 209, 0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. Played region clipped smoothly up to progressX
        if (progressX > 0.5) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, progressX, cssHeight);
          ctx.clip();

          // Crimson area fill beneath active EQ curve
          ctx.beginPath();
          traceSplinePath(ctx, linePts);
          ctx.lineTo(cssWidth, baselineY);
          ctx.lineTo(0, baselineY);
          ctx.closePath();
          const activeFill = ctx.createLinearGradient(0, 8, 0, baselineY);
          activeFill.addColorStop(0, 'rgba(255, 32, 78, 0.34)');
          activeFill.addColorStop(0.75, 'rgba(160, 21, 62, 0.12)');
          activeFill.addColorStop(1, 'rgba(93, 14, 65, 0.02)');
          ctx.fillStyle = activeFill;
          ctx.fill();

          // Glowing active Line EQ stroke
          ctx.beginPath();
          traceSplinePath(ctx, linePts);
          const lineGrad = ctx.createLinearGradient(0, 0, cssWidth, 0);
          lineGrad.addColorStop(0, '#A0153E');
          lineGrad.addColorStop(0.55, '#FF204E');
          lineGrad.addColorStop(1, '#FF6B8A');
          ctx.strokeStyle = lineGrad;
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Subtle crimson curve guiding played curvy dots
          ctx.beginPath();
          traceSplinePath(ctx, dotPts);
          ctx.strokeStyle = 'rgba(255, 107, 138, 0.35)';
          ctx.lineWidth = 1.1;
          ctx.stroke();

          ctx.restore();
        }

        // 3. Curvy Dots along the harmonic ribbon
        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          const isPlayedDot = pt.x <= progressX;
          const radius = isPlayedDot
            ? 2.1 + pt.energy * 2.1
            : 1.5 + pt.energy * 1.15;

          if (isPlayedDot) {
            // Soft outer glow halo
            ctx.beginPath();
            ctx.arc(pt.x, pt.dotY, radius + 2.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 32, 78, 0.24)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(pt.x, pt.dotY, radius, 0, Math.PI * 2);
            ctx.fillStyle = i % 3 === 0 ? '#FF859E' : '#FF204E';
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(pt.x, pt.dotY, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(96, 138, 196, 0.65)';
            ctx.fill();
          }
        }

        // 4. Continuous Progress Bar Rail at baselineY
        const railStart = 2;
        const railEnd = cssWidth - 2;
        const clampedHeadX = Math.min(railEnd, Math.max(railStart, progressX));

        ctx.beginPath();
        ctx.moveTo(railStart, baselineY);
        ctx.lineTo(railEnd, baselineY);
        ctx.strokeStyle = '#193C70';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        if (clampedHeadX > railStart) {
          ctx.beginPath();
          ctx.moveTo(railStart, baselineY);
          ctx.lineTo(clampedHeadX, baselineY);
          const railGrad = ctx.createLinearGradient(0, 0, clampedHeadX, 0);
          railGrad.addColorStop(0, '#A0153E');
          railGrad.addColorStop(1, '#FF204E');
          ctx.strokeStyle = railGrad;
          ctx.lineWidth = 3.2;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Subtle playhead guide up into the EQ curve
        const headCurveY =
          points[
            Math.min(
              points.length - 1,
              Math.max(0, Math.round(clampProgressRatio(smoothedProgress) * (points.length - 1)))
            )
          ].lineY;
        ctx.beginPath();
        ctx.moveTo(clampedHeadX, headCurveY);
        ctx.lineTo(clampedHeadX, baselineY);
        ctx.strokeStyle = 'rgba(255, 107, 138, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Glowing playhead dot on the continuous progress bar
        ctx.beginPath();
        ctx.arc(clampedHeadX, baselineY, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 32, 78, 0.34)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(clampedHeadX, baselineY, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#FF204E';
        ctx.stroke();
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(drawFrame);
    };

    rafId = window.requestAnimationFrame(drawFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [profileId]);

  const computeRatioFromClientX = (clientX: number): number => {
    const el = containerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return clampProgressRatio((clientX - rect.left) / rect.width);
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    isScrubbingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSeek(computeRatioFromClientX(e.clientX));
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!onSeek || !isScrubbingRef.current) return;
    onSeek(computeRatioFromClientX(e.clientX));
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    isScrubbingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const safeDuration =
    durationSec > 0 ? durationSec : PRODUCER_SAMPLE_DURATION_SEC;
  const pct =
    profileId === 'producer'
      ? Math.round(clampProgressRatio(elapsedSec / safeDuration) * 100)
      : isPlaying
        ? Math.round(((playStep % 32) / 31) * 100)
        : 31;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const currentRatio = clampProgressRatio(elapsedSec / safeDuration);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onSeek(clampProgressRatio(currentRatio + 0.05));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onSeek(clampProgressRatio(currentRatio - 0.05));
    }
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={onSeek ? 0 : -1}
      aria-label={`${trackTitle} continuous progress and EQ visualizer`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      data-testid="producer-eq-visualizer"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={`mt-4 relative h-[74px] w-full select-none touch-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] ${
        onSeek ? 'cursor-pointer' : ''
      }`}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        aria-hidden="true"
      />
    </div>
  );
}
