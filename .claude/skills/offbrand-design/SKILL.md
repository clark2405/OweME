---
name: offbrand-design
description: Apply the OFF+BRAND design language — award-winning narrative-driven web design with cinematic scroll, WebGL/3D storytelling, Rive micro-interactions, stripped-back typography, and performance-as-design. Use when designing or building any UI, screen, landing page, animation, or interaction for this project.
---

# OFF+BRAND Design Language

A distillation of how OFF+BRAND (itsoffbrand.com) designs and builds — researched
from their 16 public case studies (Lando Norris [Awwwards Site of the Year 2025],
Aether 1, Vizcom, Jasper, Aptos Labs, Bella, David Lee, CMCC, Totem, Slack State
of Work, The Online School, Uplink, and others), their manifesto, and the live
code of their shipped sites. Follow this when making any design, animation, or
UX decision.

Their tagline: **"Where Different Is the Standard."** Their method: emotion +
innovation, executed with ruthless performance discipline.

---

## 1. Core philosophy (apply to every decision)

1. **Motion supports meaning, not decoration.** (Vizcom) Every animation must
   demonstrate something — a workflow, a product function, a state change. If an
   animation doesn't explain or guide, cut it.
2. **The hero is a story, not a banner.** The first viewport must make the
   product instantly understandable in seconds: who it's for, what it does, why
   it matters — with ONE clear primary action. Show the core loop in motion
   (Vizcom's hero literally plays sketch → transform → render).
3. **Show, don't tell.** (Aptos) Strip copy back and let visuals do the talking.
   Confident copy, clear hierarchy, "space to let the message land."
4. **No single element carries the story.** Visuals, motion, interaction, and
   words work together. Copy sets context for what visuals show; interactions
   guide attention.
5. **Performance IS the design.** Their mantra on Lando: "build a site that
   moves" — but it must hold 60fps on a low-end phone (they test against iPhone
   SE 2020). A janky immersive site is worse than a plain fast one.
6. **Less is more, but never sterile.** (CMCC) Scandinavian restraint in layout
   and palette, then ONE layer of subtle-but-striking motion to keep it
   cutting-edge. Trust comes from restraint; delight comes from the one thing
   that moves beautifully.
7. **Dense content must feel light.** (Online School, Slack) Counterbalance
   information density with playful brand moments, modular hierarchy, scroll
   pacing, and narrative flow — "a dense site that feels light."
8. **Playful, but trustworthy.** Quirk lives in microcopy, easter eggs, and
   micro-interactions — never in legibility, navigation, or data.

## 2. Visual language

### Color
- **Stripped-back base + one electric accent.** Deep/dark or off-white
  monochrome foundations, soft gradients, generous negative space. Then a single
  high-voltage accent (Lando: neon yellow on black; Aether: weightless light on
  deep space tones). Never two competing accents.
- High contrast, always passing contrast accessibility checks.
- Gradients are soft and atmospheric (light/smoke/depth), not rainbow SaaS
  gradients.

### Typography
- **Big, bold, modern grotesques.** Documented choices: PP Neue Montreal
  (Pangram Pangram) for premium/trust, GT Walsheim (Grilli Type) for
  friendly/playful, plus custom display faces for hero moments (Lando uses a
  bespoke "Brier" display font). Free fallbacks in the same spirit: Inter Tight,
  Space Grotesk, General Sans.
- Oversized headline scale — the headline is a layout element, not a label.
  Mix UPPERCASE statements with lowercase quirk ("off brand.", "build").
- **Typographic wordplay as brand.** Their "+" motif is injected into copy:
  "To+Gether", "every+thing", "skill+set", "OFF+BRAND." Find the project's own
  equivalent motif and use it consistently in microcopy.
- Numbered narrative fragments structure long pages: "01. People / 02. with
  dreams / 03. + methods / 04. to do better", with progress counters "(1/4)".

### Layout
- Generous whitespace; content blocks breathe. "Proper respect for space" (CMCC).
- Modular systems with strong visual hierarchy — built for scroll pacing, where
  each viewport-ish section is a "chapter" with one idea.
- Editorial, infographic-rich treatment for data (Slack annual report).

## 3. Signature interactions & animations

These are the recurring moves across their portfolio. Pick the ones that fit —
never all at once:

- **Percentage preloader.** Site loads behind a counter (5% → 100%) that doubles
  as a brand moment. (On their own site and most immersive builds.)
- **Smooth/cinematic scroll.** Lenis smooth-scrolling everywhere (confirmed in
  Lando's live code). Scroll is the narrative timeline: scroll-driven "chapters"
  revealed with scene swaps, baked camera paths through 3D scenes, parallax
  depth. Aether 1 even uses an *infinite* Lenis scroll through four product
  chapters.
- **GSAP + ScrollTrigger** for scene swaps, pinned sections, staggered text
  reveals, and sharp speed-inspired transitions.
- **Rive for UI micro-interactions.** Their live sites run Rive on nav
  hamburgers, button hover inverts, animated icons, color inputs, hover
  "circuits." Every interactive element gives animated feedback; buttons invert
  or morph on hover, never just change opacity.
- **WebGL/3D as the centerpiece, optimized above the fold.** Real-time 3D
  product displays where motion demonstrates function (Bella's appliances,
  Aether's earbuds with "bullet-time sound-waves"). Built in C4D/Blender,
  exported as clean .glb with baked ambient occlusion and custom matcaps for
  glass-like reflections that stay cheap on mobile.
- **Generative atmosphere:** GPGPU particle flow-fields, fluid-simulation
  cursor trails, audio-reactive waves, lighting/smoke that blends foreground
  into background (Totem) — used to give depth, tuned to stay at 60fps.
- **Easter eggs & open-world moments.** David Lee's site is a navigable 3D
  artist studio with non-traditional navigation and hidden surprises. Reward
  exploration, keep it optional.
- **Immersive media galleries** with sharp transitions and momentum (Lando).

### Motion feel
- Sharp and intentional, not floaty: quick eases, decisive transitions,
  "continuous momentum."
- Each transition guides the eye from concept to outcome — choreograph
  attention, don't just animate properties.
- Subtle hover states everywhere; nothing is static under the cursor.

## 3b. The premium feel — why their pages never feel dull

This is the quality people notice first in OFF+BRAND work. "Premium" is not a
color or a font — it is the accumulation of these specific habits. An agent
building to this language must apply ALL of them:

**Nothing is ever fully static.**
- Every page has a layer of *ambient, idle motion* even when the user does
  nothing: a slowly drifting WebGL scene, floating particles, a gradient that
  breathes, soft light/smoke moving in the background (Totem), a subtle marquee.
  It's quiet — felt more than watched — but it makes the page feel alive.
- Idle ≠ busy. ONE ambient layer, moving slowly. The dullness killer is depth,
  not clutter.

**Everything the user touches responds.**
- 100% interaction coverage: every link, button, card, image, and nav item has
  a deliberate hover/press behavior. Buttons invert or fill with a sweep, icons
  play a tiny Rive animation, images scale a few percent inside a clipped
  frame, cursor changes contextually (or becomes a custom cursor/fluid trail).
- The response is *immediate* (≤100ms) and *specific* to the element — not the
  same opacity fade on everything. If two different components share the exact
  same hover effect, one of them is underdesigned.

**Entrances are choreographed, never instant.**
- Content doesn't just appear; it *arrives*. Headlines reveal per-line or
  per-word with masked/clipped text rises; images unclip or scale-settle;
  sections stagger their children (60–120ms apart). Scrolling continuously
  rewards the user with the next reveal — that's why there's no dull moment.
- But arrival is FAST: sharp 0.6–0.9s eases, not 2s floats. Premium = decisive.

**Depth and materiality everywhere.**
- Pages are built in layers that move at different rates (parallax, pinned
  scenes, foreground/background blending). Flat solid-color boxes are rare;
  surfaces get soft gradients, grain, glass blur, baked reflections, real
  shadows from a consistent light direction.
- 3D objects feel like physical products: glass-like matcap reflections,
  accurate real-world proportions (Aether's buds were matched to real Apple
  earbud dimensions "for instant believability").

**Easing is the signature.**
- Default easing curves are custom (expo/quart-out style: fast start, long
  elegant settle — e.g. cubic-bezier(0.16, 1, 0.3, 1)), never linear, never
  default ease-in-out. Movement has weight and momentum, like the scroll
  itself (Lenis lerp). When in doubt: snappier start, longer tail.

**Transitions connect, they don't cut.**
- Between sections and pages, elements morph, slide, or carry over —
  position/scale continuity, shared elements, scene swaps along a camera path —
  so the whole site feels like one continuous space rather than separate pages.

**The premium tells in the details:**
- Generous padding inside components (cramped = cheap).
- Tiny typographic details everywhere: numbered labels (01., 02.), counters
  ((1/4)), uppercase micro-labels with wide tracking above headlines.
- Custom preloader that sets the tone before the first pixel of content.
- Even the footer is designed — oversized type, a final interactive moment —
  never a gray afterthought.

## 4. UX rules

- **First-seconds clarity:** who it's for + what it does + why it matters,
  visible without scrolling, with one unmistakable primary CTA ("Get Started").
- **Reduce cognitive load:** show the workflow instead of describing it; strip
  copy; one idea per section.
- **Mobile-first parity.** Immersive ≠ desktop-only. They design "mobile first,
  performative" and won Awwwards Mobile Excellence. Every effect needs its
  mobile answer.
- **Accessibility is non-negotiable** (Slack build): semantic HTML, ARIA,
  keyboard navigation, color contrast — "without compromising visual polish."
  Always ship a **reduced-motion fallback route** (Aether 1 has a dedicated
  reduced-motion experience with simplified effects).
- **Information architecture before decoration.** On CMCC they invested in
  messaging and IA refinement before any motion work; visitors "study the site,"
  so copy and structure convert, visuals persuade.
- **Measure it.** Their work targets conversions (Online School: +35%
  conversions). Design decisions should trace to engagement or conversion, not
  taste alone.

## 5. Performance discipline (their non-negotiables)

- Optimized asset delivery, lazy-loading, streamlined code; strip unused JS.
- WebGL above the fold must be optimized first, not retrofitted.
- Bake lighting (AO, matcaps) instead of computing it live; simplify raycasting;
  name and unwrap every mesh; clean .glb handoffs.
- Test on weak hardware (iPhone SE-class) — 60fps or simplify the effect.
- Fast first paint even on immersive sites; the preloader is for the 3D scene,
  not for bloat.

## 6. Voice & microcopy

- Confident, human, lightly irreverent: "How about we do a thing or two,"
  "super fine humans," "no egos."
- Cut jargon — "grounded, accessible language" that feels authoritative without
  being overwhelming (Slack).
- Microcopy is a brand surface: navigation labels, form errors, footers, and
  loaders all carry personality.

## 7. Applying this to OweMe (this repo)

OweMe's brand is playful/warm (PROJECT.md §8) — keep OweMe's voice and warm
palette, and apply OFF+BRAND's **craft**, not their dark-premium aesthetic:

- Warm off-white base + ONE bold accent; oversized friendly grotesque headlines
  (GT Walsheim energy); whitespace and one-idea-per-screen.
- Motion demonstrates meaning: the "mark returned" confetti, a loan card that
  physically "comes home" to history, nudge-send animations with momentum.
- Micro-interaction feedback on every tap (Rive-style: animated icons, morphing
  buttons). On mobile use Reanimated/Skia/Lottie/Rive-RN equivalents; on the
  Next.js nudge page, CSS/Framer Motion or Rive — keep the dependency rules in
  CLAUDE.md in mind and justify additions.
- The nudge page `/n/[token]` is the "hero-as-story": borrower understands in
  seconds what was lent, when, and the ONE action ("Mark as returned").
- OweMe's "+" equivalent: lean on the established phrases ("Out in the wild,"
  "It found its way home 🎉") as recurring typographic motifs.
- 15-second add-loan flow = their first-seconds-clarity rule applied to a form:
  show, minimize, one primary action per step.
- Always honor reduced-motion settings and 60fps on low-end Android.

## 8. Pre-ship checklist

- [ ] Hero/first screen passes the 5-second test (who/what/why + one CTA)
- [ ] Every animation explains or guides something; none are pure decoration
- [ ] One accent color; headlines set in a bold grotesque at oversized scale
- [ ] Every interactive element has an animated hover/press state — 100%
      coverage, and no two component types share the identical effect
- [ ] Page has one quiet ambient/idle motion layer (nothing is fully static)
- [ ] Entrances are staggered/masked reveals with sharp custom easing
      (expo-out style), no linear or default ease-in-out anywhere
- [ ] Layout has depth: parallax/layers/material surfaces, not flat boxes
- [ ] Scroll (web) is paced into chapters; transitions are sharp, not floaty
- [ ] Reduced-motion fallback exists and was actually tested
- [ ] Semantic HTML / ARIA / keyboard nav / contrast all pass
- [ ] 60fps on low-end hardware; assets lazy-loaded and optimized
- [ ] Microcopy carries brand voice (no sterile strings)
