Use this design system for all UI in this project. Apply it consistently on every screen and component.

## Feel
Warm, premium, and a little playful. Think of an editorial magazine crossed with a calm iOS app. Use a pared-back warm off-white base with ONE electric accent color. Headlines are huge and bold, cards are soft and rounded with gentle depth, and motion has a fast start and a long, smooth settle. Nothing should look flat, cold, or generic.

## Hard rules
1. **One accent only:** coral. Use it ONLY for the single primary action on a screen (main CTA, FAB) or the one thing that must catch the eye. Never use it for decoration, and never introduce a second accent color.
2. **Categories and statuses** get soft tonal chips (sand / mint / grey) plus an emoji or icon. Never give them extra bright colors.
3. **Warm everything:** warm off-white backgrounds, warm near-black ink, warm greys. No cold blue-greys, including in dark mode.
4. **No screen is ever fully static.** A slow ambient layer of soft blurred blobs drifts behind the content.
5. **Respect reduced-motion.** When the OS asks for reduced motion, collapse animations to near 0 and stop ambient loops.

## Color tokens
| Token | Light | Dark | Use |
|---|---|---|---|
| bg | #FFFBF5 | #17120D | page background |
| bgSunken | #F6EFE4 | #0F0B07 | inset areas, segmented-control track |
| surface | #FFFFFF | #211A12 | cards |
| surfaceWarm | #FFF7EC | #2A2117 | secondary cards, inputs |
| ink | #1A1714 | #F5EEE3 | primary text |
| inkSoft | #6B6157 | #B4A99A | secondary text |
| inkFaint | #A89E92 | #7C7264 | overlines, placeholders, inactive icons |
| hairline | #ECE3D6 | rgba(255,255,255,0.09) | dividers, borders |
| accent | #FF5A3C | #FF6B4F | THE accent (primary action only) |
| accentPress | #E8472B | #FF5235 | pressed accent, "warn" chip text |
| accentSoft | #FFE7E0 | rgba(255,107,79,0.16) | warn chip background, accent tints |
| onAccent | #FFFFFF | #FFFFFF | text on accent |
| danger | #C4402F | #F2705E | destructive text/icons (redder than the accent) |
| dangerSoft | #FBE7E3 | rgba(242,112,94,0.16) | destructive tint |
| sand / sandInk | #F0E6D6 / #8A7A60 | #2E2519 / #C6AE86 | neutral chip |
| mint / mintInk | #E4F1E6 / #3F7A52 | #1C2A20 / #8FD4A3 | positive chip ("returned", "done") |
| grave / graveInk | #ECE7E2 / #8A8178 | #262019 / #B0A595 | archived / written-off chip |
| feature | #1A1714 | #2C2218 | inverted "feature slab" card |
| onFeature | #FFFFFF | #F5EEE3 | text on the feature slab |
| onFeatureDim | #A89E92 | #B4A99A | secondary text on the feature slab |
| shadow | #3A2A18 | #000000 | shadow color |

**Feature slab:** at most one per screen. It's an inverted dark card (a dark ink card on the cream page) for the most important stat or highlight, such as a total, a hero metric, or a "most wanted" item. In dark mode it becomes a slightly elevated warm surface, never a bright white slab.

**Optional special zone:** a "night room" palette for one playful or dramatic section. Use it sparingly, and keep coral as the only accent inside it.
base #15101B, plot #241833, stone #221A2E, text #F3ECDD, textSoft #B9AFC2, textFaint #897F93, hairline rgba(255,255,255,0.08)

## Typography
Use the system font (SF Pro / Inter-like grotesque) with heavy weights and tight tracking. Headlines are layout elements, so make them oversized.
| Style | Size / line height | Weight | Letter spacing | Notes |
|---|---|---|---|---|
| hero | 44 / 46 | 800 | -1.2 | onboarding, big moments |
| title | 32 / 36 | 800 | -1.2 | screen titles ("You're owed") |
| h2 | 24 / 28 | 800 | -0.6 | |
| h3 | 18 / 22 | 700 | -0.3 | card titles |
| body | 16 / 23 | 500 | 0 | |
| bodySoft | 15 / 22 | 500 | 0 | inkSoft color |
| small | 13 / 18 | 600 | 0 | inkSoft color, meta lines |
| overline | 12 / 14 | 700 | +1.6 | UPPERCASE, inkFaint, sits above titles and sections, e.g. "OUT IN THE WILD", "THE LINEUP · OLDEST FIRST" |
| numeral | 40 / 42 | 800 | -1.5 | tabular numbers for stats and money |

Every screen header follows the same pattern: a small uppercase overline (often with an emoji or icon and a "·" separator), then a huge bold title, with an optional circular icon button on the right.

## Spacing & shape
- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48. Screen side padding is 24. The gap between cards is 12–16.
- **Corner radius:** sm 12, md 18, lg 24 (cards), xl 32 (big feature cards and sheets), and pill 999 (buttons, chips, segmented controls, tab bar).
- **Shadows** (soft, light from the top, warm-tinted):
  - card: opacity 0.08, blur 18, y-offset 8
  - lifted (FAB, tab bar, popovers): opacity 0.16, blur 26, y-offset 14

## Components
- **Cards:** white surface, radius 24, card shadow, padding 16–20, no visible border in light mode (a hairline is fine in dark mode). List rows sit inside cards: a round 48px avatar or emoji on the left, a bold title plus a small soft meta line ("Name · 3 weeks ago"), a status chip on the right, and a chevron.
- **Stat tiles:** two side by side. One is white and the other is the feature slab. Each shows a big numeral on top and a small label underneath.
- **Primary button:** full-width pill, accent background, white bold text, about 56px tall. Disabled state is the accent at roughly 45% opacity.
- **Secondary button:** pill with a surface or white fill and ink text, plus a hairline border or card shadow.
- **Tertiary:** plain inkSoft text link, centered (e.g. "Write it off").
- **Segmented toggle:** pill track in bgSunken. The active segment is a solid ink pill with white text (inverted in dark mode); inactive segments are inkSoft text.
- **Chips:** small pill, 12–13px weight-700 text, tonal background with matching ink color, optional leading icon. Tones: sand (neutral), mint (positive), grave (archived), warn (accentSoft background with accentPress text) for "Overdue" or "Aging".
- **Selectable chips** (filters, quick picks): pill outlined or on surfaceWarm. When selected, use a solid ink fill with white text.
- **Inputs:** surfaceWarm or white, radius 18, tall (about 52px), placeholder in inkFaint. The focused border is a 2px warm amber/accent tint.
- **Floating tab bar:** a glassy, blurred pill floating above the bottom safe area, about 74px tall, with the lifted shadow and 4 tabs. Icons are thin stroked line icons. The active tab is ink with a bold label; inactive tabs are inkFaint. The active icon pops with a spring scale when selected.
- **FAB:** a big coral pill ("+ Lend something" style) floating just above the tab bar. It has a lighter circular "+" badge on its left and the lifted shadow.
- **Icons:** custom thin line icons with about a 1.75 stroke and rounded caps. Pair them with emoji for personality (avatars, categories).
- **Section headers:** an overline in UPPERCASE with wide tracking. Use accent-colored text only for an urgent count (e.g. "1 OVERDUE").
- **Empty states and success moments:** friendly copy, plus confetti on the big payoff action.

## Motion
- **Signature easing:** cubic-bezier(0.16, 1, 0.3, 1) (expo-out). Never use linear or the default ease-in-out.
- **Snappier variant for presses:** cubic-bezier(0.25, 1, 0.5, 1).
- **Durations:** press 120ms, fast 240ms, base 420ms, slow 680ms, ambient loop 7000ms.
- **Springs:** press {damping 18, stiffness 320, mass 0.7}; pop {damping 12, stiffness 220, mass 0.9}.
- **Press feedback:** every tappable element scales to 0.96 with a slight downward nudge, then springs back. This is a weighted settle, not an opacity fade. Add a light haptic on mobile.
- **Entrances:** sections fade in and slide up 8–16px with the expo-out easing, and children are staggered about 70ms apart. Keep entrances sharp (0.4–0.8s), never floaty.
- **Ambient layer:** 2–3 huge, low-opacity, soft warm blobs (accentSoft, sand, surfaceWarm tints) behind the content. They drift and breathe slowly on a 7s loop. Re-tint and reposition them per tab or section so each area feels a little different, while the base and accent stay constant.

## Voice & copy
Playful, warm, short. Use cheeky overlines ("THE USUAL SUSPECTS", "THE FINE PRINT", "THE ARCHIVE"), human titles ("You're owed", "Lend something"), and a small emoji here and there. Never corporate.

## Dark mode
Support it everywhere using the dark tokens above ("warm charcoal", not blue-grey). Keep the same layout. The accent is slightly brighter. Shadows go to black so depth still reads.
