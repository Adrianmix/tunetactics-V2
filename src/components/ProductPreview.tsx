import { useEffect, useState } from 'react';
import { Disc3, Layers, Mic2, Pause, Play, Sliders, Volume2 } from 'lucide-react';
import { SITE_CONTENT, type ProfileShowcase } from '../data/content';
import {
  PRODUCER_SAMPLE_DURATION_SEC,
  studioAudio,
  type PreviewMode,
} from '../utils/audioPreview';
import { formatTrackTime } from '../utils/visualizerMath';
import ContinuousEqProgress from './ContinuousEqProgress';

interface ProductPreviewProps {
  reelImageSrc?: string;
  trackCoverSrc?: string;
}

export default function ProductPreview({
  reelImageSrc = '',
  trackCoverSrc = '',
}: ProductPreviewProps) {
  const [activeProfileId, setActiveProfileId] = useState<'producer' | 'singer'>('producer');
  const [playingMode, setPlayingMode] = useState<PreviewMode | null>(null);
  const [playStep, setPlayStep] = useState(0);
  const [producerElapsed, setProducerElapsed] = useState(0);
  const [producerDuration, setProducerDuration] = useState(PRODUCER_SAMPLE_DURATION_SEC);
  const [stems, setStems] = useState({
    vocal: true,
    drums: true,
    bass: false,
  });
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const activeProfile: ProfileShowcase =
    SITE_CONTENT.preview.profiles.find((p) => p.id === activeProfileId) ??
    SITE_CONTENT.preview.profiles[0];

  useEffect(() => {
    studioAudio.setStemLayers(stems);
  }, [stems]);

  useEffect(() => {
    const unsub = studioAudio.subscribe((mode, step) => {
      setPlayingMode(mode);
      setPlayStep(step);
      const progress = studioAudio.getProducerProgress();
      setProducerElapsed(progress.currentTime);
      setProducerDuration(progress.duration);
    });
    return () => {
      unsub();
      if (studioAudio.getActiveMode() !== 'hero-visualizer') {
        studioAudio.stop(false);
      }
    };
  }, []);

  const toggleAudio = (mode: PreviewMode) => {
    if (playingMode === mode) {
      studioAudio.stop();
      setPlayingMode(null);
      return;
    }
    setPlayingMode(mode);
    studioAudio.start(mode, (step) => {
      setPlayStep(step);
    });
  };

  const handleProfileSwitch = (id: 'producer' | 'singer') => {
    setActiveProfileId(id);
    if (playingMode === 'portfolio-producer' || playingMode === 'portfolio-singer') {
      const nextMode: PreviewMode =
        id === 'producer' ? 'portfolio-producer' : 'portfolio-singer';
      setPlayingMode(nextMode);
      studioAudio.start(nextMode, (step) => {
        setPlayStep(step);
      });
    }
  };

  const toggleStem = (key: 'vocal' | 'drums' | 'bass') => {
    setStems((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.vocal && !next.drums && !next.bass) {
        next.vocal = true;
      }
      return next;
    });
  };

  const scrollToWaitlist = () => {
    const el = document.getElementById('waitlist');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const currentPortfolioMode: PreviewMode =
    activeProfile.id === 'producer' ? 'portfolio-producer' : 'portfolio-singer';
  const isPortfolioPlaying = playingMode === currentPortfolioMode;
  const isReelPlaying = playingMode === 'reel-full';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
      {/* Left: Producer / Singer Portfolio Profile Card */}
      <div className="tt-card-float group lg:col-span-7 bg-[#00224D] border border-[#1E447A]/90 rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
        <div>
          {/* Switcher Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#193C70]/85">
            <span className="font-sans text-xs uppercase tracking-[0.09em] text-[#B8CCE6]">
              Portfolio preview
            </span>
            <div
              className="inline-flex items-center p-1 bg-[#001633] border border-[#5D0E41]/80 rounded-full"
              role="tablist"
              aria-label="Preview profile role"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeProfileId === 'producer'}
                onClick={() => handleProfileSwitch('producer')}
                className={`tt-btn px-4 py-2 text-sm rounded-full whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] ${
                  activeProfileId === 'producer'
                    ? 'bg-[#FF204E] text-white'
                    : 'text-[#C2D4EC] hover:text-white'
                }`}
              >
                Producer profile
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeProfileId === 'singer'}
                onClick={() => handleProfileSwitch('singer')}
                className={`tt-btn px-4 py-2 text-sm rounded-full whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] ${
                  activeProfileId === 'singer'
                    ? 'bg-[#FF204E] text-white'
                    : 'text-[#C2D4EC] hover:text-white'
                }`}
              >
                Singer profile
              </button>
            </div>
          </div>

          {/* Profile Identity */}
          <div className="mt-6 flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#001633] border border-[#5D0E41]/80 shrink-0 flex items-center justify-center">
              {!brokenImages[activeProfile.id] && (activeProfile.avatarSrc || reelImageSrc) ? (
                <img
                  src={activeProfile.avatarSrc ?? reelImageSrc}
                  alt={`${activeProfile.name} studio portrait`}
                  width={80}
                  height={80}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setBrokenImages((prev) => ({ ...prev, [activeProfile.id]: true }))
                  }
                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <Mic2 className="w-7 h-7 text-[#9FB4D1]" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-2xl sm:text-[1.65rem] text-[#F4F7FC] tracking-wide">
                  {activeProfile.name}
                </h3>
                <span className="text-sm text-[#9FB4D1] tabular-nums">
                  {activeProfile.handle}
                </span>
              </div>
              <p className="mt-1 text-base text-[#E2ECFA]">{activeProfile.roleLine}</p>
              <p className="mt-1 text-sm text-[#9FB4D1]">
                {activeProfile.location}
                <span aria-hidden="true"> · </span>
                {activeProfile.gearOrCredits}
              </p>
            </div>
          </div>

          {/* Looking For Intent Line & Studio Details */}
          <div className="mt-6 pt-5 border-t border-[#193C70]/85 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base text-[#FF5C7D]">
                {activeProfile.lookingFor}
              </p>
              <button
                type="button"
                onClick={scrollToWaitlist}
                className="text-sm text-[#F4F7FC] hover:text-[#FF5C7D] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] rounded-full px-1"
              >
                Connect on launch
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#193C70]/70">
              <div>
                <p className="text-xs text-[#9FB4D1]">
                  Studio track record
                </p>
                <p className="mt-1 text-sm text-[#E2ECFA]">
                  {activeProfile.creditsLine}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9FB4D1]">
                  Collaboration workflow
                </p>
                <p className="mt-1 text-sm text-[#E2ECFA]">
                  {activeProfile.availabilityLine}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Embedded Waveform Track Preview */}
        <div className="mt-6 bg-[#001633] border border-[#5D0E41]/80 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#00224D] border border-[#193C70] shrink-0 flex items-center justify-center">
              {!brokenImages.cover && trackCoverSrc ? (
                <img
                  src={trackCoverSrc}
                  alt={`${activeProfile.trackTitle} artwork`}
                  width={56}
                  height={56}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setBrokenImages((prev) => ({ ...prev, cover: true }))
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <Disc3 className="w-5 h-5 text-[#9FB4D1]" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base text-[#F4F7FC] truncate">
                  {activeProfile.trackTitle}
                </p>
                <span className="text-sm text-[#9FB4D1] tabular-nums shrink-0">
                  {activeProfile.id === 'producer' && (isPortfolioPlaying || producerElapsed > 0)
                    ? `${formatTrackTime(producerElapsed)} / ${formatTrackTime(producerDuration)} · `
                    : ''}
                  {activeProfile.bpm} BPM
                </span>
              </div>
              <p className="mt-0.5 text-sm text-[#9FB4D1] truncate">
                {activeProfile.trackMeta}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleAudio(currentPortfolioMode)}
              aria-label={
                isPortfolioPlaying
                  ? `Pause ${activeProfile.trackTitle}`
                  : `Play ${activeProfile.trackTitle}`
              }
              className="tt-btn w-12 h-12 rounded-full bg-[#FF204E] text-white hover:bg-[#A0153E] flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#001633]"
            >
              {isPortfolioPlaying ? (
                <Pause className="w-5 h-5 fill-current" aria-hidden="true" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Continuous Progress Rail with Curvy Dots & Smooth Line EQ Visualizer */}
          <ContinuousEqProgress
            profileId={activeProfile.id}
            trackTitle={activeProfile.trackTitle}
            waveform={activeProfile.waveform}
            isPlaying={isPortfolioPlaying}
            playStep={playStep}
            elapsedSec={producerElapsed}
            durationSec={producerDuration}
            onSeek={
              activeProfile.id === 'producer'
                ? (ratio) => studioAudio.seekProducer(ratio)
                : undefined
            }
          />
        </div>
      </div>

      {/* Right: Reels-Style Vertical Music Clip & Stem Reply Mockup */}
      <div className="tt-card-float group lg:col-span-5 bg-[#00224D] border border-[#1E447A]/90 rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#193C70]/85">
          <span className="font-sans text-xs uppercase tracking-[0.09em] text-[#B8CCE6]">
            Reels stem challenge
          </span>
          <span className="text-sm text-[#9FB4D1] tabular-nums">
            {SITE_CONTENT.preview.reels.replyCount}
          </span>
        </div>

        {/* Vertical Clip Viewport */}
        <div className="mt-5 relative rounded-2xl overflow-hidden border border-[#5D0E41]/90 bg-[#001633] min-h-[450px] sm:min-h-0 sm:aspect-[16/15] lg:aspect-[5/6] flex flex-col justify-between">
          {!brokenImages.reel && reelImageSrc ? (
            <img
              src={reelImageSrc}
              alt="Vocalist recording clip inside acoustic booth"
              width={600}
              height={1075}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() =>
                setBrokenImages((prev) => ({ ...prev, reel: true }))
              }
              className="absolute inset-0 w-full h-full object-cover object-center opacity-80 transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#5D0E41] via-[#00224D] to-[#00142E] flex items-center justify-center">
              <Volume2 className="w-10 h-10 text-[#9FB4D1]" aria-hidden="true" />
            </div>
          )}

          {/* Measured contrast scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#00122A]/95 via-[#001633]/55 to-[#5D0E41]/40" />

          {/* Top Bar Inside Reel */}
          <div className="relative z-10 p-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base text-white truncate">
                {SITE_CONTENT.preview.reels.creatorName}
              </p>
              <p className="text-sm text-[#D6E2F5] truncate">
                {SITE_CONTENT.preview.reels.creatorMeta}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleAudio('reel-full')}
              aria-label={isReelPlaying ? 'Pause stem reel' : 'Play stem reel'}
              className="tt-btn px-4 py-2 rounded-full bg-[#001633]/90 border border-[#A0153E] text-sm text-white hover:bg-[#FF204E] hover:border-[#FF204E] inline-flex items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E]"
            >
              {isReelPlaying ? (
                <>
                  <Pause className="w-4 h-4" aria-hidden="true" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" aria-hidden="true" />
                  <span>Audition</span>
                </>
              )}
            </button>
          </div>

          {/* Bottom Interactive Stem Mixer + Reply CTA */}
          <div className="relative z-10 p-4 space-y-3">
            <p className="text-base text-white leading-snug">
              {SITE_CONTENT.preview.reels.clipTitle}
            </p>

            {/* Stem layer toggles */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm text-[#D6E2F5]">
                <Layers className="w-4 h-4 text-[#FF204E]" aria-hidden="true" />
                <span>Active stem layers</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SITE_CONTENT.preview.reels.stems.map((stem) => {
                  const key = stem.id as 'vocal' | 'drums' | 'bass';
                  const active = stems[key];
                  return (
                    <button
                      key={stem.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleStem(key)}
                      className={`tt-btn px-3.5 py-2.5 sm:px-3 sm:py-2 rounded-2xl border text-left flex items-center justify-between gap-2 sm:block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E] ${
                        active
                          ? 'bg-[#5D0E41]/90 border-[#FF204E] text-white'
                          : 'bg-[#001633]/90 border-[#1E447A] text-[#B8CCE6] hover:text-white'
                      }`}
                    >
                      <span className="block text-xs truncate">
                        {stem.label}
                      </span>
                      <span className="block text-[11px] text-[#B8CCE6] truncate sm:mt-0.5 shrink-0">
                        {stem.author}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={scrollToWaitlist}
              className="tt-btn w-full py-3 px-5 rounded-full bg-[#FF204E] text-white text-sm hover:bg-[#A0153E] flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF204E]"
            >
              <Sliders className="w-4 h-4" aria-hidden="true" />
              <span>{SITE_CONTENT.preview.reels.challengeLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
