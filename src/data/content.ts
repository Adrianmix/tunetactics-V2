export type WaitlistRole = 'Producer' | 'Singer' | 'Songwriter' | 'Other';
export type WaitlistGoal = 'Collabs' | 'Feedback' | 'Paid work' | 'Just showcasing';

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  metaLabel: string;
}

export interface HowItWorksStep {
  id: 'build' | 'discover' | 'collaborate';
  imageAlt: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface ProfileShowcase {
  id: 'producer' | 'singer';
  name: string;
  handle: string;
  roleLine: string;
  location: string;
  lookingFor: string;
  gearOrCredits: string;
  creditsLine: string;
  availabilityLine: string;
  trackTitle: string;
  trackMeta: string;
  waveform: number[];
  bpm: number;
}

export const SITE_CONTENT = {
  lang: 'en',
  meta: {
    title: 'TuneTactics — Show Your Sound. Find Collaborators.',
    description:
      'Showcase your beats, vocals, and reels on TuneTactics. Connect with producers, singers, and songwriters to collaborate—join the waitlist for free Pro.',
    siteName: 'TuneTactics',
    defaultSiteUrl: 'https://tunetactics.ir',
    keywords:
      'music collaboration, producer portfolio, singer collaboration, beatmakers and vocalists, music reels, remote music stems, songwriter network, TuneTactics',
    ogImagePath: '/og-cover.jpg',
    ogImageAlt: 'TuneTactics — Crimson acoustic waveform on a midnight navy recording studio desk',
    locale: 'en_US',
  },
  nav: {
    brand: 'TuneTactics',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Features', href: '#features' },
      { label: 'Preview', href: '#preview' },
      { label: 'FAQ', href: '#faq' },
    ],
    ctaLabel: 'Join waitlist',
    ctaHref: '#waitlist',
  },
  hero: {
    headline: 'Show your sound. Find your people.',
    subheadline:
      'A community for producers and singers to showcase their work and find collaborators.',
    primaryCta: 'Join the waitlist',
    trustMicroCopy: 'Founding members get Pro free for life.',
    visualizerCard: {
      trackTitle: 'Midnight Frequency',
      trackSubtitle: '96 BPM · Sample studio loop',
      collabHeading: 'Looking for collaboration',
      collabCopy:
        'Vocalist for a melodic trap EP. Needs Persian/English bilingual delivery.',
      collabMeta: 'Melodic Trap · Bilingual · Remote stems ready',
      collabCta: 'Connect & collab',
    },
  },
  problem: {
    heading: 'Finding the right collaborator is broken.',
    body: "Social profiles don't show skill. DMs get buried. There's no place built for musicians to showcase work and actually connect.",
    signals: [
      { label: 'Buried DMs', detail: 'No response in general inbox' },
      { label: 'No audio context', detail: 'Links scattered across 4 apps' },
      { label: 'Zero intent filter', detail: 'Hard to tell who wants collabs' },
    ],
  },
  howItWorks: {
    heading: 'How it works',
    steps: [
      {
        id: 'build',
        description: 'Build a profile that shows your actual work — beats, vocals, reels.',
      },
      {
        id: 'discover',
        description:
          "Discover producers and singers by role, genre, and what they're looking for.",
      },
      {
        id: 'collaborate',
        description: 'Connect and make something.',
      },
    ] satisfies Omit<HowItWorksStep, 'imageAlt'>[],
    scenes: {
      profile: {
        initials: 'KM',
        name: 'Kian Mercer',
        handle: '@kianmercer',
        bio: 'Neo-soul & trap producer · Berlin',
        skills: 'Beatmaking · Vocal Mix · Sound Design',
        tools: 'Ableton Live · Prophet-6 · UAD',
        projects: [
          { title: 'Midnight Tape (WIP)', meta: 'Project · 94 BPM · Open hook' },
          { title: 'Studio Vocal Reel', meta: 'Post · 0:24 clip · 6 stem replies' },
        ],
      },
      hub: {
        filters: ['Producers', 'Vocalists', 'Bilingual'],
        members: [
          {
            initials: 'TN',
            name: 'Tara N.',
            role: 'Singer · Alt-R&B',
            lookingFor: 'Looking for: Melodic trap beats',
          },
          {
            initials: 'DR',
            name: 'Dante R.',
            role: 'Producer · Synthwave',
            lookingFor: 'Looking for: Vocal hook & top-line',
          },
          {
            initials: 'LK',
            name: 'Lina K.',
            role: 'Songwriter · Neo-Soul',
            lookingFor: 'Looking for: Drum & bass stems',
          },
        ],
      },
      connect: {
        leftInitials: 'KM',
        leftName: 'Kian',
        leftRole: 'Producer',
        rightInitials: 'TN',
        rightName: 'Tara',
        rightRole: 'Vocalist',
        inviteText: 'Sent stems · 96 BPM',
        sessionTitle: 'Collab Started',
        sessionMeta: 'Beats + Bilingual Vocals · Synced',
      },
    },
  },
  preview: {
    heading: 'Built around your sound, not algorithms.',
    subheading:
      'Explore how portfolio profiles and stem-ready music reels make collaboration obvious at a glance.',
    profiles: [
      {
        id: 'producer',
        name: 'Kian Mercer',
        handle: '@kianmercer',
        roleLine: 'Producer · Neo-Soul & Electronic',
        location: 'Berlin · Remote ready',
        lookingFor: 'Looking for: Vocalist for 4-track EP',
        gearOrCredits: 'Prophet-6 · Ableton Live · Apollo Twin',
        creditsLine: '14 released beats · 6 vocal collabs completed',
        availabilityLine: 'Open for remote stem swaps · 48h turnaround',
        trackTitle: 'Midnight Tape (Open Hook)',
        trackMeta: '94 BPM · F Minor · Unreleased WIP',
        waveform: [
          28, 42, 65, 50, 84, 92, 62, 48, 76, 88, 95, 70, 52, 68, 90, 82, 56, 44, 74, 86,
          64, 50, 72, 60, 42, 34, 58, 78, 66, 48, 38, 26,
        ],
        bpm: 94,
      },
      {
        id: 'singer',
        name: 'Nora Vance',
        handle: '@noravance',
        roleLine: 'Singer & Top-liner · Alt-R&B',
        location: 'London · Remote ready',
        lookingFor: 'Looking for: Producers with dark synth grooves',
        gearOrCredits: 'Neumann U87 · Logic Pro · Dry + Wet Stems',
        creditsLine: '9 featured hooks · 3 label sync placements',
        availabilityLine: 'Delivering 24-bit WAV vocal stems · Remote',
        trackTitle: 'Glass Harbor (Vocal Sketch)',
        trackMeta: '108 BPM · C# Minor · Dry Acapella + Harmony',
        waveform: [
          18, 30, 46, 72, 86, 68, 54, 62, 88, 96, 74, 48, 36, 52, 78, 90, 84, 60, 44, 68,
          82, 70, 56, 42, 66, 80, 62, 46, 34, 28, 22, 16,
        ],
        bpm: 108,
      },
    ] satisfies ProfileShowcase[],
    reels: {
      creatorName: 'Maya Lin',
      creatorMeta: 'Singer · Alt-R&B · 112 BPM',
      clipTitle: 'Late night chorus idea — needs heavy drums & sub',
      duration: '0:28',
      stems: [
        { id: 'vocal', label: 'Lead vocal', author: '@mayalin' },
        { id: 'drums', label: 'Pocket drums', author: '@dante_beats' },
        { id: 'bass', label: 'Analog sub', author: '@kianmercer' },
      ],
      challengeLabel: 'Drop a verse or stem reply',
      replyCount: '14 stem replies',
    },
  },
  features: {
    heading: 'Everything built for finishing tracks together.',
    items: [
      {
        id: 'portfolio',
        title: 'Portfolio profiles',
        description:
          "Show your real work — embedded tracks, reels, skills, gear, and what you're looking for.",
        metaLabel: 'SoundCloud · Spotify · YouTube · Bandcamp',
      },
      {
        id: 'discovery',
        title: 'Discovery that works',
        description:
          'Filter by role, genre, location, and collab intent. No more scrolling aimlessly.',
        metaLabel: 'Role · Genre · Intent',
      },
      {
        id: 'reels',
        title: 'Reels for musicians',
        description:
          'Post short clips — a beat, a vocal run, a WIP. Get replies from people who want to build on it.',
        metaLabel: 'Stem replies · Open hooks',
      },
      {
        id: 'connect',
        title: 'Connect and message',
        description:
          'Skip the DMs that get buried. Reach the right people and start working.',
        metaLabel: 'Direct studio threads',
      },
    ] satisfies FeatureItem[],
  },
  waitlist: {
    heading: 'Be a founding member.',
    body: 'Join before launch and get Pro for life.',
    passTitle: 'Founding Member Pass',
    passSubtitle: 'Reserved for early producers, singers & songwriters',
    perks: [
      {
        title: 'Pro free for life',
        detail: 'Unlimited portfolio embeds, stem reels, and priority discovery tools.',
      },
      {
        title: 'First-wave private beta',
        detail: 'Get invited ahead of public launch and help shape collaboration features.',
      },
      {
        title: 'Founding studio profile',
        detail: 'Lock in your handle early with founding member recognition.',
      },
    ],
    emailLabel: 'Email',
    emailPlaceholder: 'you@studio.com',
    roleLabel: "I'm a…",
    roles: ['Producer', 'Singer', 'Songwriter', 'Other'] as WaitlistRole[],
    lookingForLabel: "I'm looking for…",
    lookingForOptions: [
      'Collabs',
      'Feedback',
      'Paid work',
      'Just showcasing',
    ] as WaitlistGoal[],
    submitLabel: 'Join the waitlist',
    loadingLabel: 'Joining…',
    feedback: {
      success: "You're in. We'll email you when we launch.",
      error: 'Something went wrong. Try again?',
      duplicate: "You're already on the list.",
      invalidEmail: 'Please enter a valid email address.',
    },
  },
  faq: {
    heading: 'FAQ',
    items: [
      {
        id: 'free',
        question: 'Is it free?',
        answer: 'Yes. Core features are free forever. Pro adds optional power tools.',
      },
      {
        id: 'launch',
        question: 'When does it launch?',
        answer:
          "We're targeting a private beta in the coming months. Waitlist members get in first.",
      },
      {
        id: 'platforms',
        question: 'Do I upload files or link to existing platforms?',
        answer:
          "At launch, you'll embed from SoundCloud, Spotify, YouTube, and Bandcamp. Native uploads come later.",
      },
      {
        id: 'audience',
        question: 'Who is it for?',
        answer:
          'Producers, singers, songwriters, and instrumentalists who want to collaborate — especially remotely.',
      },
      {
        id: 'data',
        question: 'How do you handle my data?',
        answer:
          'We store your email and your signup answers only. No spam, no resale.',
      },
    ] satisfies FaqItem[],
  },
  finalCta: {
    heading: 'Show your sound. Find your people.',
    subheading: 'Join the founding members before launch.',
    buttonLabel: 'Join the waitlist',
  },
  footer: {
    tagline: 'Show your sound. Find your people.',
    email: 'support@tunetactics.ir',
    links: [
      { label: 'Privacy', action: 'privacy' as const },
      { label: 'Terms', action: 'terms' as const },
      { label: 'Contact', href: 'mailto:support@tunetactics.ir' },
    ],
    legal: {
      privacyTitle: 'Privacy Policy',
      privacyBody:
        'TuneTactics collects only your email address, selected role, and collaboration goal when you join our pre-launch waitlist. Your information is used strictly to send your founding-member confirmation and launch invite. We never sell, rent, or share your data with third parties. To remove your entry at any time, email support@tunetactics.ir.',
      termsTitle: 'Terms of Access',
      termsBody:
        'Joining the TuneTactics waitlist reserves early access to our private beta and qualifies founding members for complimentary Pro tier features at launch. Waitlist registration does not create any paid obligation. Questions can be sent to support@tunetactics.ir.',
    },
  },
} as const;
