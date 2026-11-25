import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { SITE_CONTENT } from '../data/content';
import {
  HERO_SAMPLE_DURATION_SEC,
  studioAudio,
  type PreviewMode,
} from '../utils/audioPreview';
import { formatTrackTime } from '../utils/visualizerMath';

const _dummy = new THREE.Object3D();
const _baseBarColor = new THREE.Color('#163663');
const _limeBarColor = new THREE.Color('#ff204e');
const _workBarColor = new THREE.Color();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export default function HeroVisualizer() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [durationSec, setDurationSec] = useState(HERO_SAMPLE_DURATION_SEC);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    const syncProgress = () => {
      const progress = studioAudio.getHeroProgress();
      setElapsedSec(progress.currentTime);
      setDurationSec(progress.duration);
    };

    const unsubscribe = studioAudio.subscribe((mode: PreviewMode | null) => {
      setIsPlaying(mode === 'hero-visualizer');
      syncProgress();
    });
    return () => {
      unsubscribe();
      if (studioAudio.getActiveMode() === 'hero-visualizer') {
        studioAudio.stop(false);
      }
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const isSoftwareGl = detectSoftwareWebGL();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      setIsReady(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || 520, container.clientHeight || 360);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 360;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(0, 0.35, 7.2);
    camera.lookAt(0, 0, 0);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0x9eb8df, 0x001633, 1.05);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe6ee, 1.65);
    keyLight.position.set(5, 7, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff204e, 1.85);
    rimLight.position.set(-6, -2, -5);
    scene.add(rimLight);

    // Composite 3D Harmonic Visualizer Sculpture
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Midnight Navy Acoustic Core
    const coreGeometry = new THREE.IcosahedronGeometry(0.95, 1);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x00224d,
      roughness: 0.22,
      metalness: 0.88,
      flatShading: true,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    rootGroup.add(coreMesh);

    // 2. Reactive Crimson Wireframe Cage
    const cageGeometry = new THREE.IcosahedronGeometry(1.12, 1);
    const cageMaterial = new THREE.MeshBasicMaterial({
      color: 0xff204e,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const cageMesh = new THREE.Mesh(cageGeometry, cageMaterial);
    rootGroup.add(cageMesh);

    // 3. Concentric Metallic Frequency Rings
    const ringSpecs = [
      { radius: 1.52, tube: 0.026, color: 0x5d0e41, roughness: 0.24, metalness: 0.82, tiltX: 0.72, tiltY: 0.25 },
      { radius: 1.84, tube: 0.022, color: 0xff204e, roughness: 0.2, metalness: 0.65, tiltX: -0.58, tiltY: 0.5 },
      { radius: 2.15, tube: 0.02, color: 0xa0153e, roughness: 0.28, metalness: 0.78, tiltX: 0.32, tiltY: -0.62 },
    ];
    const ringGeometries: THREE.TorusGeometry[] = [];
    const ringMaterials: THREE.MeshStandardMaterial[] = [];
    const ringMeshes: THREE.Mesh[] = [];

    ringSpecs.forEach((spec) => {
      const geo = new THREE.TorusGeometry(spec.radius, spec.tube, 18, 96);
      const mat = new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: spec.roughness,
        metalness: spec.metalness,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.set(spec.tiltX, spec.tiltY, 0);
      ringGeometries.push(geo);
      ringMaterials.push(mat);
      ringMeshes.push(mesh);
      rootGroup.add(mesh);
    });

    // 4. Radial 3D Equalizer Monolith Halo (48 instances reacting to FFT bins)
    const barCount = 48;
    const barRadius = 2.48;
    const barGeometry = new THREE.BoxGeometry(0.055, 1, 0.055);
    const barMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.6,
    });
    const barMesh = new THREE.InstancedMesh(barGeometry, barMaterial, barCount);
    barMesh.frustumCulled = false;
    barMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(barCount * 3),
      3
    );
    rootGroup.add(barMesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Silent drag-to-rotate state
    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let targetRotY = 0.2;
    let targetRotX = 0.15;
    let currentRotY = 0.2;
    let currentRotX = 0.15;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevPointerX;
      const dy = e.clientY - prevPointerY;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
      targetRotY += dx * 0.008;
      targetRotX = THREE.MathUtils.clamp(targetRotX + dy * 0.006, -0.85, 0.85);
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 520;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', handleResize);

    // Pre-allocated FFT scratch buffer & smoothed band values
    const fftScratch = new Uint8Array(32);
    let smoothBass = 0;
    let smoothMid = 0;
    let smoothTreble = 0;

    const updateVisualizer = (elapsed: number, delta: number) => {
      const sample = studioAudio.sampleFrequencyData(fftScratch);
      const targetBass = sample.active ? sample.bands.bass : 0;
      const targetMid = sample.active ? sample.bands.mid : 0;
      const targetTreble = sample.active ? sample.bands.treble : 0;

      smoothBass = THREE.MathUtils.damp(smoothBass, targetBass, 14, delta);
      smoothMid = THREE.MathUtils.damp(smoothMid, targetMid, 12, delta);
      smoothTreble = THREE.MathUtils.damp(smoothTreble, targetTreble, 14, delta);

      if (!isDragging) {
        targetRotY += delta * (sample.active ? 0.42 + smoothMid * 0.6 : 0.16);
      }
      currentRotY = THREE.MathUtils.damp(currentRotY, targetRotY, 6.5, delta);
      currentRotX = THREE.MathUtils.damp(currentRotX, targetRotX, 6.5, delta);
      rootGroup.rotation.y = currentRotY;
      rootGroup.rotation.x = currentRotX;

      // Core reacts to bass kick/sub
      const coreScale = 1 + smoothBass * 0.34 + (sample.active ? 0 : Math.sin(elapsed * 1.4) * 0.03);
      coreMesh.scale.setScalar(coreScale);
      coreMesh.rotation.y = -elapsed * 0.25;

      // Wireframe cage reacts to treble shimmer
      const cageScale = 1 + smoothBass * 0.22 + smoothTreble * 0.25;
      cageMesh.scale.setScalar(cageScale);
      cageMesh.rotation.z = elapsed * 0.2;
      cageMaterial.opacity = 0.18 + smoothTreble * 0.55;

      // Rings react to mid & bass
      ringMeshes[0].rotation.z = elapsed * (0.28 + smoothMid * 0.9);
      ringMeshes[0].scale.setScalar(1 + smoothBass * 0.12);

      ringMeshes[1].rotation.z = -elapsed * (0.35 + smoothBass * 1.1);
      ringMeshes[1].scale.setScalar(1 + smoothMid * 0.14);

      ringMeshes[2].rotation.z = elapsed * (0.2 + smoothTreble * 0.8);
      ringMeshes[2].scale.setScalar(1 + smoothTreble * 0.1);

      // 48 Radial Equalizer Monoliths
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const binIdx = i % fftScratch.length;
        const binEnergy = sample.active ? fftScratch[binIdx] / 255 : 0;
        const idleWave = 0.5 + 0.5 * Math.sin(angle * 3 + elapsed * 1.6);
        const energy = sample.active ? binEnergy : idleWave * 0.22;

        const barLen = 0.22 + energy * 0.92;
        const r = barRadius + barLen * 0.5 - 0.1;

        _dummy.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
        _dummy.rotation.set(0, 0, angle - Math.PI / 2);
        _dummy.scale.set(1, barLen, 1);
        _dummy.updateMatrix();
        barMesh.setMatrixAt(i, _dummy.matrix);

        _workBarColor
          .copy(_baseBarColor)
          .lerp(_limeBarColor, sample.active ? Math.min(1, energy * 1.15) : energy * 0.8);
        barMesh.setColorAt(i, _workBarColor);
      }
      barMesh.instanceMatrix.needsUpdate = true;
      if (barMesh.instanceColor) {
        barMesh.instanceColor.needsUpdate = true;
      }
    };

    const startTimeMs = performance.now();
    let lastTimeMs = startTimeMs;
    let frameId = 0;
    let isDisposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (isDisposed) return;
      const nowMs = performance.now();
      const delta = Math.min((nowMs - lastTimeMs) / 1000, 0.08);
      const elapsed = (nowMs - startTimeMs) / 1000;
      lastTimeMs = nowMs;

      updateVisualizer(elapsed, delta);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    updateVisualizer(0, 0.016);
    renderer.render(scene, camera);
    setIsReady(true);

    if (!prefersReducedMotion) {
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
    };
    const handleContextRestored = () => {
      if (!prefersReducedMotion && !isDisposed) {
        tick();
      }
    };

    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      coreGeometry.dispose();
      coreMaterial.dispose();
      cageGeometry.dispose();
      cageMaterial.dispose();
      ringGeometries.forEach((g) => g.dispose());
      ringMaterials.forEach((m) => m.dispose());
      barGeometry.dispose();
      barMaterial.dispose();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const toggleSamplePlay = () => {
    if (isPlaying) {
      studioAudio.stop();
    } else {
      studioAudio.start('hero-visualizer');
    }
  };

  const scrollToWaitlist = () => {
    const target = document.getElementById('waitlist');
    if (target) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
    window.setTimeout(() => {
      const emailInput = document.getElementById('waitlist-email') as HTMLInputElement | null;
      emailInput?.focus({ preventScroll: true });
    }, 450);
  };

  const safeDuration = durationSec > 0 ? durationSec : HERO_SAMPLE_DURATION_SEC;
  const progressPct = Math.min(100, Math.max(0, (elapsedSec / safeDuration) * 100));
  const cardCopy = SITE_CONTENT.hero.visualizerCard;

  return (
    <div className="tt-card-float rounded-3xl bg-[#00224D] border border-[#5D0E41]/90 p-4 sm:p-5 shadow-[0_24px_70px_rgba(0,10,28,0.72)]">
      {/* Pure 3D Audio Visualizer Object (Zero extra labels or buttons over canvas) */}
      <div className="relative w-full h-[250px] sm:h-[290px] rounded-2xl bg-[#00142E] border border-[#193C70]/90 overflow-hidden">
        {!isReady && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-[#00142E]"
            aria-hidden="true"
          >
            <div className="w-28 h-28 rounded-full border-2 border-[#5D0E41] border-t-[#FF204E] animate-spin" />
          </div>
        )}

        {webglUnavailable ? (
          <div
            className="w-full h-full flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,32,78,0.2),transparent_62%)]"
            data-testid="hero-visualizer-fallback"
          >
            <div className="w-36 h-36 rounded-full border border-[#FF204E]/50 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border border-[#A0153E] bg-[#00224D]" />
            </div>
          </div>
        ) : (
          <div
            ref={mountRef}
            className={`w-full h-full cursor-grab active:cursor-grabbing transition-opacity duration-500 ${
              isReady ? 'opacity-100' : 'opacity-0'
            }`}
            data-testid="hero-visualizer-canvas"
            aria-label="Interactive 3D audio visualizer"
          />
        )}
      </div>

      {/* Mini Audio Player directly under the 3D object */}
      <div className="mt-3.5 rounded-2xl bg-[#001633] border border-[#193C70]/90 px-4 py-3.5 flex items-center gap-4">
        <button
          type="button"
          onClick={toggleSamplePlay}
          aria-label={isPlaying ? 'Pause sample track' : 'Play sample track'}
          className="tt-btn w-12 h-12 rounded-full bg-[#FF204E] text-white hover:bg-[#A0153E] active:scale-95 flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#001633]"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" aria-hidden="true" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" aria-hidden="true" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-base font-medium text-[#F4F7FC] truncate">
              {cardCopy.trackTitle}
            </p>
            <span className="text-xs sm:text-sm text-[#9FB4D1] tabular-nums shrink-0">
              {formatTrackTime(elapsedSec)} / {formatTrackTime(safeDuration)}
            </span>
          </div>

          <p className="mt-0.5 text-sm text-[#9FB4D1] truncate">
            {cardCopy.trackSubtitle}
          </p>

          {/* Progress Bar */}
          <div
            className="mt-2.5 h-1.5 w-full rounded-full bg-[#00224D] overflow-hidden"
            role="progressbar"
            aria-label="Sample track playback progress"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[#FF204E] transition-transform duration-150 origin-left"
              style={{ transform: `scaleX(${Math.max(0.02, progressPct / 100)})` }}
            />
          </div>
        </div>
      </div>

      {/* App-Like Collaboration Strip Under Mini Audio Player */}
      <div className="mt-3 rounded-2xl bg-[#001633] border border-[#5D0E41]/80 p-4 flex flex-col gap-3.5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-sans text-xs uppercase tracking-[0.09em] text-[#FF6B8A]">
              {cardCopy.collabHeading}
            </p>
            <p className="mt-1.5 text-base text-[#F4F7FC] leading-snug">
              {cardCopy.collabCopy}
            </p>
            <p className="mt-1.5 text-sm text-[#9FB4D1]">
              {cardCopy.collabMeta}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-[#193C70]/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#5D0E41]/80 border border-[#FF204E]/65 overflow-hidden flex items-center justify-center font-sans text-xs tracking-wider text-white shrink-0">
              {!avatarFailed && cardCopy.creatorAvatar ? (
                <img
                  src={cardCopy.creatorAvatar}
                  alt={`${cardCopy.creatorName} profile picture`}
                  width={40}
                  height={40}
                  onError={() => setAvatarFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                cardCopy.creatorInitials
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-[#F4F7FC] truncate">{cardCopy.creatorName}</p>
              <p className="text-xs text-[#9FB4D1] truncate">{cardCopy.creatorMeta}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={scrollToWaitlist}
            className="tt-btn h-10 px-4 rounded-full bg-[#5D0E41] border border-[#FF204E]/75 text-white hover:bg-[#FF204E] text-sm inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E]"
          >
            <span>{cardCopy.collabCta}</span>
            <ArrowUpRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
