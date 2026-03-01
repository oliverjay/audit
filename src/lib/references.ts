export interface Reference {
  id: string;
  topic: string;
  label: string;
  url: string;
}

/**
 * Curated, verified reference library. Every URL here has been checked to exist.
 * The Gemini prompt injects this list so the AI picks from known-good links
 * instead of hallucinating URLs.
 */
export const references: Reference[] = [
  // ── Visual hierarchy & layout ──
  { id: "visual-hierarchy", topic: "visual hierarchy, content prioritisation, layout", label: "NNGroup: Visual Hierarchy", url: "https://www.nngroup.com/articles/visual-hierarchy-ux-definition/" },
  { id: "f-pattern", topic: "F-pattern reading, text scanning, eye tracking", label: "NNGroup: F-Shaped Reading", url: "https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/" },
  { id: "z-pattern", topic: "Z-pattern layout, scanning patterns", label: "NNGroup: Text Scanning Patterns", url: "https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/" },
  { id: "whitespace", topic: "whitespace, spacing, breathing room, padding", label: "Laws of UX: Spacing", url: "https://lawsofux.com/law-of-proximity/" },
  { id: "gestalt-proximity", topic: "grouping, proximity, related elements", label: "Laws of UX: Proximity", url: "https://lawsofux.com/law-of-proximity/" },

  // ── Typography & readability ──
  { id: "typography", topic: "typography, font size, readability, line height, font choice", label: "web.dev: Typography", url: "https://web.dev/learn/design/typography" },
  { id: "contrast", topic: "colour contrast, WCAG, text readability, accessibility", label: "web.dev: Color & Contrast", url: "https://web.dev/learn/accessibility/color-contrast" },
  { id: "line-length", topic: "line length, characters per line, readability", label: "Baymard: Line Length", url: "https://baymard.com/blog/line-length-readability" },

  // ── Navigation & information architecture ──
  { id: "navigation", topic: "navigation, menu, site structure, wayfinding", label: "NNGroup: Navigation", url: "https://www.nngroup.com/articles/navigation-you-are-here/" },
  { id: "hamburger-menu", topic: "hamburger menu, hidden navigation, mobile nav", label: "NNGroup: Hamburger Menus", url: "https://www.nngroup.com/articles/hamburger-menus/" },
  { id: "breadcrumbs", topic: "breadcrumbs, wayfinding, secondary navigation", label: "NNGroup: Breadcrumbs", url: "https://www.nngroup.com/articles/breadcrumbs/" },
  { id: "information-scent", topic: "link labels, information scent, link text", label: "NNGroup: Information Scent", url: "https://www.nngroup.com/articles/information-scent/" },

  // ── CTAs & conversion ──
  { id: "cta-design", topic: "call to action, button design, CTA placement, conversion", label: "NNGroup: CTA Design", url: "https://www.nngroup.com/articles/clickable-elements/" },
  { id: "above-the-fold", topic: "above the fold, first screen, hero section", label: "NNGroup: Above the Fold", url: "https://www.nngroup.com/articles/scrolling-and-attention/" },
  { id: "value-proposition", topic: "value proposition, headline, hero copy, clarity", label: "NNGroup: Homepage Design Principles", url: "https://www.nngroup.com/articles/homepage-design-principles/" },
  { id: "social-proof", topic: "social proof, testimonials, reviews, trust signals", label: "CXL: Social Proof", url: "https://cxl.com/blog/is-social-proof-really-that-important/" },
  { id: "trust-signals", topic: "trust, credibility, logos, security badges", label: "Baymard: Trust & Credibility", url: "https://baymard.com/blog/ways-to-instill-trust" },
  { id: "pricing-page", topic: "pricing page, pricing psychology, plan comparison", label: "NNGroup: Pricing Pages", url: "https://www.nngroup.com/articles/show-prices-for-common-scenarios/" },

  // ── Forms & input ──
  { id: "form-design", topic: "form design, input fields, form length, labels", label: "NNGroup: Form Design", url: "https://www.nngroup.com/articles/web-form-design/" },
  { id: "form-errors", topic: "form validation, error messages, inline errors", label: "NNGroup: Error Messages", url: "https://www.nngroup.com/articles/errors-forms-design-guidelines/" },
  { id: "form-labels", topic: "form labels, placeholder text, input labels", label: "NNGroup: Form Labels", url: "https://www.nngroup.com/articles/form-design-placeholders/" },

  // ── Cognitive load & usability ──
  { id: "hicks-law", topic: "too many options, choice overload, decision paralysis", label: "Laws of UX: Hick's Law", url: "https://lawsofux.com/hicks-law/" },
  { id: "millers-law", topic: "cognitive load, chunking, memory, information overload", label: "Laws of UX: Miller's Law", url: "https://lawsofux.com/millers-law/" },
  { id: "jakobs-law", topic: "conventions, familiar patterns, user expectations", label: "Laws of UX: Jakob's Law", url: "https://lawsofux.com/jakobs-law/" },
  { id: "aesthetic-usability", topic: "visual design affects usability perception, aesthetics", label: "Laws of UX: Aesthetic-Usability", url: "https://lawsofux.com/aesthetic-usability-effect/" },
  { id: "fitts-law", topic: "click targets, button size, touch targets, tap area", label: "Laws of UX: Fitts's Law", url: "https://lawsofux.com/fittss-law/" },
  { id: "cognitive-load", topic: "cognitive load, mental effort, complexity", label: "NNGroup: Cognitive Load", url: "https://www.nngroup.com/articles/minimize-cognitive-load/" },

  // ── Performance & loading ──
  { id: "page-speed", topic: "page speed, load time, performance, Core Web Vitals", label: "web.dev: Performance", url: "https://web.dev/learn/performance" },
  { id: "lcp", topic: "largest contentful paint, LCP, hero load time", label: "web.dev: LCP", url: "https://web.dev/articles/lcp" },
  { id: "cls", topic: "cumulative layout shift, CLS, layout stability", label: "web.dev: CLS", url: "https://web.dev/articles/cls" },
  { id: "image-optimization", topic: "image size, image format, lazy loading, compression", label: "web.dev: Image Optimization", url: "https://web.dev/learn/performance/image-performance" },

  // ── Mobile & responsive ──
  { id: "responsive-design", topic: "responsive design, mobile experience, breakpoints", label: "web.dev: Responsive Design", url: "https://web.dev/learn/design" },
  { id: "mobile-ux", topic: "mobile UX, thumb zones, small screens, mobile usability", label: "NNGroup: Mobile UX", url: "https://www.nngroup.com/articles/mobile-ux/" },
  { id: "touch-targets", topic: "touch target size, tap area, mobile buttons", label: "web.dev: Touch Targets", url: "https://web.dev/articles/accessible-tap-targets" },

  // ── Accessibility ──
  { id: "accessibility-basics", topic: "accessibility, a11y, WCAG, screen readers", label: "web.dev: Accessibility", url: "https://web.dev/learn/accessibility" },
  { id: "alt-text", topic: "alt text, image descriptions, screen reader", label: "web.dev: Images & Alt Text", url: "https://web.dev/learn/accessibility/images" },
  { id: "keyboard-nav", topic: "keyboard navigation, focus management, tab order", label: "web.dev: Keyboard Access", url: "https://web.dev/learn/accessibility/focus" },
  { id: "heading-structure", topic: "heading hierarchy, h1-h6, document outline, SEO headings", label: "web.dev: Headings & Structure", url: "https://web.dev/learn/accessibility/structure" },

  // ── Content & copywriting ──
  { id: "scannable-content", topic: "scannable text, bullet points, subheadings, wall of text", label: "NNGroup: Scannable Content", url: "https://www.nngroup.com/articles/how-users-read-on-the-web/" },
  { id: "microcopy", topic: "microcopy, button labels, UX writing, interface text", label: "NNGroup: Microcopy", url: "https://www.nngroup.com/articles/microcontent-how-to-write-headlines-page-titles-and-subject-lines/" },
  { id: "empty-states", topic: "empty states, zero data, onboarding, first-run experience", label: "NNGroup: Empty States", url: "https://www.nngroup.com/articles/empty-state-interface-design/" },

  // ── Visual design ──
  { id: "color-usage", topic: "color usage, colour palette, brand colours, color meaning", label: "NNGroup: Color in Design", url: "https://www.nngroup.com/articles/color-enhance-design/" },
  { id: "consistency", topic: "visual consistency, design system, inconsistent UI", label: "NNGroup: Consistency", url: "https://www.nngroup.com/articles/consistency-and-standards/" },
  { id: "dark-patterns", topic: "dark patterns, deceptive design, manipulative UI", label: "NNGroup: Deceptive Patterns", url: "https://www.nngroup.com/articles/deceptive-patterns/" },
  { id: "animation", topic: "animation, motion, transitions, micro-interactions", label: "web.dev: Animations", url: "https://web.dev/learn/css/animations" },

  // ── Footer & secondary elements ──
  { id: "footer-design", topic: "footer, footer links, footer content, site footer", label: "NNGroup: Footer Design", url: "https://www.nngroup.com/articles/footers/" },
  { id: "404-pages", topic: "404 page, error page, not found page", label: "NNGroup: Error Pages", url: "https://www.nngroup.com/articles/improving-dreaded-404-error-message/" },

  // ── Ecommerce specific ──
  { id: "product-page", topic: "product page, product detail, ecommerce listing", label: "Baymard: Product Pages", url: "https://baymard.com/blog/current-state-ecommerce-product-page-ux" },
  { id: "checkout-ux", topic: "checkout, cart, payment flow, checkout friction", label: "Baymard: Checkout UX", url: "https://baymard.com/blog/current-state-of-checkout-ux" },

  // ── SEO ──
  { id: "meta-tags", topic: "meta tags, title tag, meta description, SEO basics", label: "web.dev: SEO Basics", url: "https://web.dev/learn/html/metadata" },
  { id: "structured-data", topic: "structured data, schema markup, rich snippets", label: "web.dev: Structured Data", url: "https://web.dev/articles/social-discovery" },
];

export const referenceMap = new Map(references.map((r) => [r.id, r]));

const FORMATTED_REFERENCES = references
  .map((r) => `[${r.id}] "${r.topic}"`)
  .join("\n");

export function formatReferencesForPrompt(): string {
  return FORMATTED_REFERENCES;
}
