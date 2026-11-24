// Procedural Web Audio API synthesizer + AnalyserNode FFT stream for interactive previews.
// Zero external audio file dependencies.

import { computeAudioBands, type AudioBands } from './visualizerMath';

export type PreviewMode =
  | 'hero-visualizer'
  | 'portfolio-producer'
  | 'portfolio-singer'
  | 'reel-vocal'
  | 'reel-full';

export const HERO_SAMPLE_DURATION_SEC = 16;

type Listener = (mode: PreviewMode | null, step: number) => void;

class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private freqBuffer: Uint8Array<ArrayBuffer> | null = null;
  private timerId: number | null = null;
  private step = 0;
  private activeMode: PreviewMode | null = null;
  private listeners = new Set<Listener>();
  private activeStemLayers = {
    vocal: true,
    drums: true,
    bass: false,
  };

  private ensureGraph(): { ctx: AudioContext; destination: AudioNode } | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.78;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.freqBuffer = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    return {
      ctx: this.ctx,
      destination: this.masterGain ?? this.ctx.destination,
    };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.activeMode, this.step));
  }

  public getActiveMode(): PreviewMode | null {
    return this.activeMode;
  }

  public getStep(): number {
    return this.step;
  }

  public setStemLayers(layers: { vocal: boolean; drums: boolean; bass: boolean }) {
    this.activeStemLayers = { ...layers };
  }

  public sampleFrequencyData(outBins?: Uint8Array): {
    active: boolean;
    bands: AudioBands;
    bins: Uint8Array | null;
  } {
    if (!this.activeMode || !this.analyser || !this.freqBuffer) {
      return {
        active: false,
        bands: { bass: 0, mid: 0, treble: 0, overall: 0 },
        bins: null,
      };
    }

    this.analyser.getByteFrequencyData(this.freqBuffer);
    if (outBins) {
      const len = Math.min(outBins.length, this.freqBuffer.length);
      for (let i = 0; i < len; i++) {
        outBins[i] = this.freqBuffer[i];
      }
    }

    return {
      active: true,
      bands: computeAudioBands(this.freqBuffer),
      bins: this.freqBuffer,
    };
  }

  public start(mode: PreviewMode, onTick?: (step: number) => void) {
    this.stop(false);
    const graph = this.ensureGraph();
    this.activeMode = mode;
    this.step = 0;

    const bpm =
      mode === 'hero-visualizer'
        ? 96
        : mode === 'portfolio-singer'
          ? 108
          : mode === 'portfolio-producer'
            ? 94
            : 112;
    const stepMs = (60 / bpm / 4) * 1000; // 16th-note resolution for hero visualizer & tight groove

    const playStep = () => {
      if (this.activeMode !== mode) return;
      if (graph) {
        this.triggerSound(graph.ctx, graph.destination, mode, this.step);
      }
      onTick?.(this.step);
      this.notify();
      const maxSteps = mode === 'hero-visualizer' ? 64 : 32;
      this.step = (this.step + 1) % maxSteps;
    };

    playStep();
    this.timerId = window.setInterval(playStep, stepMs);
  }

  public stop(emit = true) {
    this.activeMode = null;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (emit) {
      this.notify();
    }
  }

  private triggerSound(
    ctx: AudioContext,
    dest: AudioNode,
    mode: PreviewMode,
    step: number
  ) {
    const now = ctx.currentTime;

    if (mode === 'hero-visualizer') {
      // 4-bar Neo-Soul / Electronic studio groove at 96 BPM (64 sixteenth steps)
      const bar = Math.floor(step / 16) % 4;
      const stepInBar = step % 16;

      // Punchy kick pattern
      if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10 || (bar === 3 && stepInBar === 14)) {
        this.playKick(ctx, dest, now, 0.24);
      }
      // Crisp snare on 2 and 4
      if (stepInBar === 4 || stepInBar === 12) {
        this.playSnare(ctx, dest, now, 0.085);
      }
      // 16th/8th hi-hat pocket
      if (stepInBar % 2 === 0 || stepInBar === 11 || stepInBar === 15) {
        const accent = stepInBar % 4 === 2 ? 0.032 : 0.018;
        this.playHat(ctx, dest, now, accent);
      }

      // Warm electric piano chords (bar changes)
      const chords = [
        [174.61, 207.65, 261.63, 311.13], // Fm7
        [155.56, 196.0, 233.08, 293.66],  // EbMaj7
        [138.59, 174.61, 207.65, 261.63], // DbMaj7
        [130.81, 164.81, 196.0, 233.08],  // C7
      ];
      if (stepInBar === 0 || stepInBar === 10) {
        const chord = chords[bar];
        const dur = stepInBar === 0 ? 0.72 : 0.36;
        chord.forEach((freq) =>
          this.playWarmTone(ctx, dest, freq, now, dur, 0.052, 'triangle', 1400)
        );
      }

      // Sub bass following root notes
      const roots = [87.31, 77.78, 69.3, 65.41];
      if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) {
        this.playWarmTone(ctx, dest, roots[bar], now, 0.34, 0.14, 'sawtooth', 260);
      }

      // Top bell melody shimmer
      const melody: Record<number, number> = {
        2: 523.25,
        7: 622.25,
        12: 466.16,
        14: 523.25,
      };
      if (melody[stepInBar]) {
        const transpose = bar >= 2 ? 0.8909 : 1;
        this.playWarmTone(
          ctx,
          dest,
          melody[stepInBar] * transpose,
          now,
          0.25,
          0.035,
          'sine',
          2200
        );
      }
      return;
    }

    if (mode === 'portfolio-producer') {
      const s = Math.floor(step / 2);
      if (step % 2 !== 0) return;
      const chords = [
        [174.61, 207.65, 261.63, 311.13],
        [155.56, 196.0, 233.08, 293.66],
      ];
      if (s % 8 === 0) {
        const chord = chords[Math.floor(s / 8) % chords.length];
        chord.forEach((freq) =>
          this.playWarmTone(ctx, dest, freq, now, 0.55, 0.045, 'triangle', 1200)
        );
      }
      if (s % 4 === 0) {
        this.playKick(ctx, dest, now, 0.16);
      } else if (s % 2 === 1) {
        this.playHat(ctx, dest, now, 0.02);
      }
      return;
    }

    if (mode === 'portfolio-singer') {
      const s = Math.floor(step / 2);
      if (step % 2 !== 0) return;
      const notes = [277.18, 329.63, 369.99, 415.3, 329.63, 277.18, 246.94, 277.18];
      if (s % 2 === 0) {
        const note = notes[(s / 2) % notes.length];
        this.playWarmTone(ctx, dest, note, now, 0.38, 0.06, 'sine', 1400);
      }
      return;
    }

    // Reels stem preview
    const s = Math.floor(step / 2);
    if (step % 2 !== 0) return;
    if (this.activeStemLayers.vocal && s % 2 === 0) {
      const vocalNotes = [329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 329.63, 392.0];
      this.playWarmTone(
        ctx,
        dest,
        vocalNotes[(s / 2) % vocalNotes.length],
        now,
        0.32,
        0.05,
        'sine',
        1500
      );
    }
    if (this.activeStemLayers.drums && (s % 4 === 0 || s === 6 || s === 14)) {
      this.playKick(ctx, dest, now, 0.14);
    }
    if (this.activeStemLayers.drums && s % 2 === 1) {
      this.playHat(ctx, dest, now, 0.02);
    }
    if (this.activeStemLayers.bass && s % 4 === 0) {
      const bassFreqs = [82.41, 82.41, 73.42, 98.0];
      this.playWarmTone(
        ctx,
        dest,
        bassFreqs[(s / 4) % bassFreqs.length],
        now,
        0.4,
        0.09,
        'sawtooth',
        320
      );
    }
  }

  private playWarmTone(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    duration: number,
    peakGain: number,
    type: OscillatorType,
    cutoff: number
  ) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peakGain, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private playKick(ctx: AudioContext, dest: AudioNode, time: number, peakGain: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.13);

    gain.gain.setValueAtTime(peakGain, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playSnare(ctx: AudioContext, dest: AudioNode, time: number, peakGain: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, time);
    osc.frequency.exponentialRampToValueAtTime(110, time + 0.08);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, time);

    gain.gain.setValueAtTime(peakGain, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  private playHat(ctx: AudioContext, dest: AudioNode, time: number, peakGain: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(6400, time);
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, time);

    gain.gain.setValueAtTime(peakGain, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.055);
  }
}

export const studioAudio = new StudioAudioEngine();
