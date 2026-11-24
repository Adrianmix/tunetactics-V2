import { useEffect, useState } from 'react';
import { Disc3, Layers, Mic2, Pause, Play, Sliders, Volume2 } from 'lucide-react';
import { STUDIO_ASSETS } from '../data/assets';
import { SITE_CONTENT } from '../data/content';
import { studioAudio, type PreviewMode } from '../utils/audioPreview';

export default function ProductPreview() {
  const [activeProfileId, setActiveProfileId] = useState<'producer' | 'singer'>('producer');
  const [playingMode, setPlayingMode] = useState<PreviewMode | null>(null);
  const [playStep, setPlayStep] = useState(0);
  const [stems, setStems] = useState({
    vocal: true,
    drums: true,
    bass: false,
  });
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const activeProfile =
    SITE_CONTENT.preview.profiles.find((p) => p.id === activeProfileId) ??
    SITE_CONTENT.preview.profiles[0];

  useEffect(() => {
    studioAudio.setStemLayers(stems);
  }, [stems]);

  useEffect(() => {
    const unsub = studioAudio.subscribe((mode, step) => {
      setPlayingMode(mode);
      setPlayStep(step);
    });
    return () => {
      unsub();
      studioAudio.stop();
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
      <div className="tt-card-float group lg:col-span-7 bg-[#111115] border border-zinc-800/90 rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
        <div>
          {/* Switcher Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
            <span className="text-sm font-medium text-zinc-400">
              Portfolio preview
            </span>
            <div
              className="inline-flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-full"
              role="tablist"
              aria-label="Preview profile role"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeProfileId === 'producer'}
                onClick={() => handleProfileSwitch('producer')}
                className={`tt-btn px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] ${
                  activeProfileId === 'producer'
                    ? 'bg-[#C8FF00] text-zinc-950'
                    : 'text-zinc-300 hover:text-zinc-100'
                }`}
              >
                Producer profile
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeProfileId === 'singer'}
                onClick={() => handleProfileSwitch('singer')}
                className={`tt-btn px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] ${
                  activeProfileId === 'singer'
                    ? 'bg-[#C8FF00] text-zinc-950'
                    : 'text-zinc-300 hover:text-zinc-100'
                }`}
              >
                Singer profile
              </button>
            </div>
          </div>

          {/* Profile Identity */}
          <div className="mt-6 flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 flex items-center justify-center">
              {!brokenImages[activeProfile.id] ? (
                <img
                  src={
                    activeProfile.id === 'producer'
                      ? STUDIO_ASSETS.producerAvatar
                      : STUDIO_ASSETS.singerReelsFrame
                  }
                  alt={`${activeProfile.name} studio portrait`}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setBrokenImages((prev) => ({ ...prev, [activeProfile.id]: true }))
                  }
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <Mic2 className="w-7 h-7 text-zinc-500" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-2xl font-semibold text-zinc-50 tracking-tight">
                  {activeProfile.name}
                </h3>
                <span className="text-sm font-mono text-zinc-400 tabular-nums">
                  {activeProfile.handle}
                </span>
              </div>
              <p className="mt-1 text-base text-zinc-200">{activeProfile.roleLine}</p>
              <p className="mt-1 text-sm text-zinc-400">
                {activeProfile.location}
                <span aria-hidden="true"> · </span>
                {activeProfile.gearOrCredits}
              </p>
            </div>
          </div>

          {/* Looking For Intent Line & Studio Details */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base font-medium text-[#C8FF00]">
                {activeProfile.lookingFor}
              </p>
              <button
                type="button"
                onClick={scrollToWaitlist}
                className="text-sm font-medium text-zinc-200 hover:text-[#C8FF00] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] rounded-full px-1"
              >
                Connect on launch
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/70">
              <div>
                <p className="text-xs font-medium text-zinc-400">
                  Studio track record
                </p>
                <p className="mt-1 text-sm text-zinc-200">
                  {activeProfile.creditsLine}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-400">
                  Collaboration workflow
                </p>
                <p className="mt-1 text-sm text-zinc-200">
                  {activeProfile.availabilityLine}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Embedded Waveform Track Preview */}
        <div className="mt-6 bg-[#09090B] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 flex items-center justify-center">
              {!brokenImages.cover ? (
                <img
                  src={STUDIO_ASSETS.trackCoverArt}
                  alt={`${activeProfile.trackTitle} artwork`}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setBrokenImages((prev) => ({ ...prev, cover: true }))
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <Disc3 className="w-5 h-5 text-zinc-500" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-zinc-100 truncate">
                  {activeProfile.trackTitle}
                </p>
                <span className="text-sm font-mono text-zinc-400 tabular-nums shrink-0">
                  {activeProfile.bpm} BPM
                </span>
              </div>
              <p className="mt-0.5 text-sm text-zinc-400 truncate">
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
              className="tt-btn w-12 h-12 rounded-full bg-[#C8FF00] text-zinc-950 hover:bg-[#D8FF42] flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]"
            >
              {isPortfolioPlaying ? (
                <Pause className="w-5 h-5 fill-current" aria-hidden="true" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Interactive Waveform Bars */}
          <div
            className="mt-4 h-12 flex items-end gap-[3px]"
            aria-label="Track audio waveform preview"
          >
            {activeProfile.waveform.map((heightPct, index) => {
              const normalizedProgress = isPortfolioPlaying
                ? ((playStep % 32) / 32) * activeProfile.waveform.length
                : 10;
              const isPlayed = index <= normalizedProgress;
              return (
                <div
                  key={index}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    isPlayed ? 'bg-[#C8FF00]' : 'bg-zinc-700/70'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Reels-Style Vertical Music Clip & Stem Reply Mockup */}
      <div className="tt-card-float group lg:col-span-5 bg-[#111115] border border-zinc-800/90 rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
          <span className="text-sm font-medium text-zinc-400">
            Reels stem challenge
          </span>
          <span className="text-sm text-zinc-400 tabular-nums">
            {SITE_CONTENT.preview.reels.replyCount}
          </span>
        </div>

        {/* Vertical Clip Viewport */}
        <div className="mt-5 relative rounded-2xl overflow-hidden border border-zinc-800 bg-[#09090B] aspect-[4/5] sm:aspect-[16/15] lg:aspect-[5/6] flex flex-col justify-between">
          {!brokenImages.reel ? (
            <img
              src={STUDIO_ASSETS.singerReelsFrame}
              alt="Vocalist recording clip inside acoustic booth"
              referrerPolicy="no-referrer"
              onError={() =>
                setBrokenImages((prev) => ({ ...prev, reel: true }))
              }
              className="absolute inset-0 w-full h-full object-cover object-center opacity-85 transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black flex items-center justify-center">
              <Volume2 className="w-10 h-10 text-zinc-700" aria-hidden="true" />
            </div>
          )}

          {/* Measured contrast scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/35" />

          {/* Top Bar Inside Reel */}
          <div className="relative z-10 p-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base font-semibold text-white truncate">
                {SITE_CONTENT.preview.reels.creatorName}
              </p>
              <p className="text-sm text-zinc-300 truncate">
                {SITE_CONTENT.preview.reels.creatorMeta}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleAudio('reel-full')}
              aria-label={isReelPlaying ? 'Pause stem reel' : 'Play stem reel'}
              className="tt-btn px-4 py-2 rounded-full bg-zinc-950/90 border border-zinc-600 text-sm font-medium text-zinc-100 hover:border-[#C8FF00] hover:text-[#C8FF00] inline-flex items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00]"
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
            <p className="text-base font-medium text-zinc-100 leading-snug">
              {SITE_CONTENT.preview.reels.clipTitle}
            </p>

            {/* Stem layer toggles */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm text-zinc-300">
                <Layers className="w-4 h-4 text-[#C8FF00]" aria-hidden="true" />
                <span>Active stem layers</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SITE_CONTENT.preview.reels.stems.map((stem) => {
                  const key = stem.id as 'vocal' | 'drums' | 'bass';
                  const active = stems[key];
                  return (
                    <button
                      key={stem.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleStem(key)}
                      className={`tt-btn px-3 py-2 rounded-2xl border text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00] ${
                        active
                          ? 'bg-zinc-900/95 border-[#C8FF00]/80 text-zinc-100'
                          : 'bg-zinc-950/85 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="block text-xs font-medium truncate">
                        {stem.label}
                      </span>
                      <span className="block text-[11px] text-zinc-400 truncate mt-0.5">
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
              className="tt-btn w-full py-3 px-5 rounded-full bg-[#C8FF00] text-zinc-950 text-sm font-semibold hover:bg-[#D8FF42] flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8FF00]"
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
