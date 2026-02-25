export const config = {
  env: {
    firecrawl: process.env.FIRECRAWL_API_KEY!,
    google: process.env.GOOGLE_AI_API_KEY!,
    elevenlabs: process.env.ELEVENLABS_API_KEY!,
  },
  voices: {
    ux: "EXAVITQu4vr4xnSDxMaL",   // Sarah — mature, reassuring, confident (female)
    cro: "TX3LPaxmHKxFdv7VOQHJ",   // Liam — energetic, confident (male)
    roast: "IKne3meq5aSn9XLyUdCD",  // Charlie — deep, confident, energetic (male)
  },
  model: "gemini-2.5-flash",
} as const;

export type Persona = "ux" | "cro" | "roast";

export const personaMeta: Record<
  Persona,
  {
    name: string;
    title: string;
    description: string;
    avatar: string;
    color: string;
    loadingQuotes: string[];
  }
> = {
  ux: {
    name: "Ada",
    title: "UX Consultant",
    description: "Flow & usability",
    avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Ada&backgroundColor=f5ede5",
    color: "#6366f1",
    loadingQuotes: [
      "Checking the visual hierarchy...",
      "Hmm, let me trace the user journey...",
      "Evaluating touch targets and spacing...",
      "Running through Nielsen's heuristics...",
      "Mapping the information architecture...",
      "Assessing cognitive load...",
    ],
  },
  cro: {
    name: "Marcus",
    title: "CRO Specialist",
    description: "Conversion & growth",
    avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Marcus&backgroundColor=f5ede5",
    color: "#10b981",
    loadingQuotes: [
      "Analyzing the conversion funnel...",
      "Counting CTAs above the fold...",
      "Where's the social proof? Let me check...",
      "Running A/B test scenarios in my head...",
      "Estimating potential revenue lift...",
      "Benchmarking against top performers...",
    ],
  },
  roast: {
    name: "Rex",
    title: "The Roaster",
    description: "Brutally honest",
    avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Rex&backgroundColor=f5ede5",
    color: "#ef4444",
    loadingQuotes: [
      "Oh boy... where do I even start...",
      "This is going to be fun...",
      "Loading my arsenal of sarcasm...",
      "Cracking my knuckles for this one...",
      "Already found three things wrong...",
      "You sure you want to hear this?",
    ],
  },
};

export type AuditResult = {
  summary: string;
  overallScore: number;
  script: string;
  scriptWithMarkers?: string;
  chapters: {
    title: string;
    startTime: number;
    scrollY: number;
    summary: string;
    wordFraction?: number;
  }[];
  hotspots: {
    label: string;
    x: number;
    y: number;
    score: number;
    chapter: number;
  }[];
  stats: {
    label: string;
    value: string;
    chapter: number;
  }[];
  fixes: {
    chapter: number;
    description: string;
    css: string;
  }[];
};
