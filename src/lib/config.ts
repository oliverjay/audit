export const config = {
  env: {
    firecrawl: process.env.FIRECRAWL_API_KEY!,
    google: process.env.GOOGLE_AI_API_KEY!,
    openai: process.env.OPENAI_API_KEY!,
    inworld: process.env.INWORLD_API_KEY ?? "",
  },
  voices: {
    ux: "nova" as const,
    cro: "ash" as const,
    roast: "onyx" as const,
  },
  inworldVoices: {
    ux: "Jessica",
    cro: "Tyler",
    roast: "Mark",
  },
  voiceInstructions: {
    ux: "Speak in a warm, thoughtful, and measured tone — like a senior UX consultant giving a private critique. Be calm, articulate, and encouraging but direct. Pause briefly before key insights. Sound like a trusted advisor, not a lecturer.",
    cro: "Speak with confident energy and authority — like a top CRO consultant presenting findings to a boardroom. Be crisp, data-driven, and persuasive. Emphasise numbers and impact. Sound like someone who's seen hundreds of funnels and knows exactly what converts.",
    roast: "Speak with dry wit, sarcasm, and comedic timing — like a sharp stand-up comedian roasting a website. Be brutally honest but entertaining. Use dramatic pauses before punchlines. Sound amused and slightly incredulous at bad design choices.",
  },
  model: "gemini-2.5-flash" as "gpt-5-mini" | "gemini-2.5-flash",
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
    avatar: "/avatars/ada.webp",
    color: "#6366f1",
    loadingQuotes: [
      "Scanning the visual hierarchy...",
      "Tracing the user journey end-to-end...",
      "Evaluating touch targets and spacing...",
      "Running through Nielsen's 10 heuristics...",
      "Mapping the information architecture...",
      "Assessing cognitive load on each section...",
      "Checking colour contrast ratios...",
      "Looking for consistent interaction patterns...",
      "Tip: Users scan in an F-pattern — is key content top-left?",
      "Tip: 88% of users won't return after a bad UX experience",
      "Reviewing navigation discoverability...",
      "Testing the visual flow from hero to CTA...",
      "Checking for Hick's Law violations...",
      "Tip: The best interfaces feel invisible",
      "Analysing whitespace and breathing room...",
      "Inspecting mobile-first responsiveness...",
      "Tip: Users form an opinion in 0.05 seconds",
      "Evaluating form usability and error states...",
      "Looking at scroll depth vs content priority...",
      "Checking accessibility landmarks and headings...",
    ],
  },
  cro: {
    name: "Marcus",
    title: "CRO Specialist",
    description: "Conversion & growth",
    avatar: "/avatars/marcus.webp",
    color: "#10b981",
    loadingQuotes: [
      "Analysing the conversion funnel...",
      "Counting CTAs above the fold...",
      "Where's the social proof? Let me check...",
      "Running A/B test scenarios in my head...",
      "Estimating potential revenue lift...",
      "Benchmarking against top performers...",
      "Checking headline clarity and value prop...",
      "Tip: Pages with one CTA convert 266% more than those with many",
      "Evaluating pricing page psychology...",
      "Looking for trust signals near decision points...",
      "Tip: The average SaaS homepage converts at 2-5%",
      "Scanning for urgency and scarcity cues...",
      "Checking the fold — what's visible without scrolling?",
      "Reviewing testimonial placement and credibility...",
      "Tip: Social proof near CTAs boosts conversions by 34%",
      "Analysing button copy — is it action-oriented?",
      "Looking for friction in the signup flow...",
      "Tip: Every additional form field reduces conversions by ~11%",
      "Checking for clear benefit statements...",
      "Evaluating exit intent and retention hooks...",
    ],
  },
  roast: {
    name: "Rex",
    title: "The Roaster",
    description: "Brutally honest",
    avatar: "/avatars/rex.webp",
    color: "#ef4444",
    loadingQuotes: [
      "Oh boy... where do I even start...",
      "This is going to be fun...",
      "Loading my arsenal of sarcasm...",
      "Cracking my knuckles for this one...",
      "Already found three things wrong...",
      "You sure you want to hear this?",
      "Counting the design sins...",
      "This hero section is... interesting...",
      "Who approved this font choice?",
      "Tip: If your CTA says 'Submit', you've already lost",
      "Checking if the site passes the 5-second test... barely",
      "Looking for the 'Contact Us' link... still looking...",
      "Tip: Your bounce rate is a direct measure of your first impression",
      "Inspecting the mobile experience... oh dear",
      "Whoever picked these stock photos...",
      "Calculating how many users bounced just now...",
      "Tip: 94% of first impressions are design-related",
      "Reviewing the footer — the graveyard of missed opportunities",
      "Checking load time... grab a coffee...",
      "Finding all the things your competitor does better...",
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
    elementIndex?: number;
    summary: string;
    wordFraction?: number;
    learnUrl?: string;
    learnLabel?: string;
  }[];
  hotspots: {
    label: string;
    x: number;
    y: number;
    elementIndex?: number;
    score: number;
    chapter: number;
  }[];
  stats: {
    label: string;
    value: string;
    chapter: number;
  }[];
};
