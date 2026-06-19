/**
 * Custom line-icon set — stripped-back, rounded, friendly-but-premium, to match
 * OweMe's warm aesthetic (replaces the emoji UI glyphs). All on a 24×24 grid,
 * 2px rounded strokes, no fill. One component, `name`-switched, so sizing and
 * color stay consistent everywhere.
 */

import Svg, { Circle, Line, Path } from 'react-native-svg';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, useAnimatedReaction, withTiming } from 'react-native-reanimated';
import { useTheme } from '../lib/theme-context';
import { expoOut } from '../lib/motion';

const AnimatedPath = Animated.createAnimatedComponent(Path) as any;
const AnimatedCircle = Animated.createAnimatedComponent(Circle) as any;
const AnimatedLine = Animated.createAnimatedComponent(Line) as any;

// Illustrative multi-tone palette for the celebratory/status glyphs (trophy,
// party, snail, grave). These are emoji replacements, so they're intentionally
// colorful and ignore the passed `color` — mid-tones chosen to read on both the
// dark "feature" cards and the lighter status chips.
const GLYPH = {
  gold: '#F4C44E',
  goldDeep: '#D89F36',
  cone: '#FF6B4F',
  confetti: ['#FFCE83', '#63C99A', '#FF8A5C', '#B79CE0'],
  shell: '#D7A86E',
  shellSpiral: '#9C6B3F',
  body: '#9FB39C',
  stone: '#A39CB0',
  stoneEtch: '#6E6878',
  // Isometric cardboard box faces (matches the onboarding box / logo).
  kraftTop: '#F2E1C4',
  kraftLeft: '#E6CBA4',
  kraftRight: '#CDAE83',
  kraftStroke: '#6E5436',
  // Empty-state illustrations (cactus / duo / mailbox / hourglass).
  cactus: '#6FBF73',
  terracotta: '#D98E5A',
  terracottaDeep: '#C2784A',
  bloom: '#FF8FA3',
  skin: '#F0B98D',
  duoBlue: '#6BA6D8',
  duoCoral: '#FF8A5C',
  mailBlue: '#5AA9E0',
  mailDeep: '#3D7FB5',
  flagRed: '#FF5A4D',
  post: '#9C6B3F',
  sand: '#F4C44E',
  glassFrame: '#C99A5B',
  // Nudge envelope (warm coral message) — replaces 📨.
  envBody: '#FFC7B0',
  envFlap: '#FF6B4F',
  envStroke: '#E07C58',
};

export type IconName =
  | 'home'
  | 'people'
  | 'history'
  | 'settings'
  | 'box'
  | 'money'
  | 'plus'
  | 'chevronRight'
  | 'chevronLeft'
  | 'close'
  | 'send'
  | 'search'
  | 'edit'
  | 'trash'
  | 'camera'
  | 'image'
  | 'check'
  | 'ledger'
  | 'eye'
  | 'bug'
  | 'bulb'
  | 'heart'
  | 'trophy'
  | 'snail'
  | 'party'
  | 'grave'
  | 'star'
  | 'bellOff'
  | 'parcel'
  | 'cactus'
  | 'duo'
  | 'mailbox'
  | 'envelope'
  | 'logout'
  | 'hourglass';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  focused?: boolean;
  clickProgress?: SharedValue<number>;
}

export function Icon({ name, size = 24, color, strokeWidth = 2, focused = false, clickProgress }: Props) {
  const { colors } = useTheme();
  const common = {
    stroke: color ?? colors.ink,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  const fallbackProgress = useSharedValue(0);
  const progress = clickProgress || fallbackProgress;

  const rotation = useSharedValue(0);

  useAnimatedReaction(
    () => progress.value,
    (curr, prev) => {
      if (prev !== null && curr > prev && prev === 0) {
        rotation.value = withTiming(rotation.value + 360, { duration: 600, easing: expoOut });
      }
    }
  );

  // Home
  const homeRoofStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * -2 }],
  }));
  const homeDoorStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * -1.5 }],
  }));

  // People
  const peopleHeadStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * -2 }],
  }));
  const peopleSecondStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * -1.2 },
      { translateX: progress.value * 1.2 },
    ],
  }));

  // History
  const historyLidStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * -2.5 }],
  }));
  const historyDrawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * 1.2 }],
  }));

  // Settings
  const settingsTopKnobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 4 }],
  }));
  const settingsBottomKnobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * -4 }],
  }));

  // Plus — 360° twirl + scale pop on tap.
  const plusStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: 1 + progress.value * 0.2 },
    ],
  }));

  const svg = (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <>
          <AnimatedPath d="M3.5 10.8 12 4l8.5 6.8" style={homeRoofStyle} {...common} />
          <Path d="M5.5 9.6V19a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V9.6" {...common} />
          <AnimatedPath d="M9.7 20v-5.2a1 1 0 0 1 1-1h2.6a1 1 0 0 1 1 1V20" style={homeDoorStyle} {...common} />
        </>
      )}

      {name === 'people' && (
        <>
          <AnimatedCircle cx="9" cy="8" r="3.2" style={peopleHeadStyle} {...common} />
          <Path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" {...common} />
          <AnimatedPath d="M15.5 5.4a3.2 3.2 0 0 1 0 5.6" style={peopleSecondStyle} {...common} />
          <AnimatedPath d="M16.5 14.8c2.3.5 4 2.3 4 4.7" style={peopleSecondStyle} {...common} />
        </>
      )}

      {name === 'history' && (
        <>
          {/* archive tray — matches the "the archive" copy */}
          <AnimatedPath d="M3.5 6.5a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v2.4a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z" style={historyLidStyle} {...common} />
          <AnimatedPath d="M5 9.9V18.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.9" style={historyDrawerStyle} {...common} />
          <AnimatedLine x1="9.6" y1="13.4" x2="14.4" y2="13.4" style={historyDrawerStyle} {...common} />
        </>
      )}

      {name === 'settings' && (
        <>
          {/* sliders — modern, less busy than a gear */}
          <Line x1="4" y1="8" x2="20" y2="8" {...common} />
          <Line x1="4" y1="16" x2="20" y2="16" {...common} />
          <AnimatedCircle cx="9" cy="8" r="2.5" style={settingsTopKnobStyle} {...common} fill={colors.surface} />
          <AnimatedCircle cx="15" cy="16" r="2.5" style={settingsBottomKnobStyle} {...common} fill={colors.surface} />
        </>
      )}

      {name === 'box' && (
        <>
          {/* parcel — echoes the OweMe 📦 brand */}
          <Path d="M5 7.5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z" {...common} />
          <Line x1="5" y1="11" x2="19" y2="11" {...common} />
          <Line x1="12" y1="6.5" x2="12" y2="11" {...common} />
        </>
      )}

      {name === 'money' && (
        <>
          {/* banknote — same 14-wide rounded footprint as `box` so the two read
              as a balanced pair in the type toggle */}
          <Path d="M5 7.5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z" {...common} />
          <Circle cx="12" cy="12" r="2.1" {...common} />
          <Line x1="8" y1="10" x2="8" y2="14" {...common} />
          <Line x1="16" y1="10" x2="16" y2="14" {...common} />
        </>
      )}

      {name === 'plus' && (
        <>
          <Line x1="12" y1="5.5" x2="12" y2="18.5" {...common} />
          <Line x1="5.5" y1="12" x2="18.5" y2="12" {...common} />
        </>
      )}

      {name === 'chevronRight' && <Path d="M9.5 6l6 6-6 6" {...common} />}
      {name === 'chevronLeft' && <Path d="M14.5 6l-6 6 6 6" {...common} />}

      {name === 'close' && (
        <>
          <Line x1="6.5" y1="6.5" x2="17.5" y2="17.5" {...common} />
          <Line x1="17.5" y1="6.5" x2="6.5" y2="17.5" {...common} />
        </>
      )}

      {name === 'send' && (
        <>
          <Path d="M20 4 3.5 11.5l6.2 2.3L20 4Z" {...common} />
          <Path d="M20 4l-5.6 16-3-7.2" {...common} />
        </>
      )}

      {name === 'search' && (
        <>
          <Circle cx="11" cy="11" r="6.2" {...common} />
          <Line x1="16" y1="16" x2="20" y2="20" {...common} />
        </>
      )}

      {name === 'edit' && (
        <>
          <Path d="M14.5 5.5 18.5 9.5 9 19l-4.5 1 1-4.5 9-10Z" {...common} />
          <Line x1="13" y1="7" x2="17" y2="11" {...common} />
        </>
      )}

      {name === 'trash' && (
        <>
          <Path d="M5.5 7.5h13" {...common} />
          <Path d="M9 7.5V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" {...common} />
          <Path d="M7 7.5 7.7 19a1 1 0 0 0 1 .9h6.6a1 1 0 0 0 1-.9L17 7.5" {...common} />
          <Line x1="10.5" y1="10.5" x2="10.5" y2="16.5" {...common} />
          <Line x1="13.5" y1="10.5" x2="13.5" y2="16.5" {...common} />
        </>
      )}

      {name === 'camera' && (
        <>
          <Path d="M4.5 8.5a1 1 0 0 1 1-1h2l1.2-1.6a1 1 0 0 1 .8-.4h3a1 1 0 0 1 .8.4L14.5 7.5h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1Z" {...common} />
          <Circle cx="11" cy="12.5" r="2.8" {...common} />
        </>
      )}

      {name === 'image' && (
        <>
          {/* framed photo — mountain + sun, the universal gallery glyph */}
          <Path d="M4.5 6.5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" {...common} />
          <Circle cx="9" cy="10" r="1.5" {...common} />
          <Path d="M5 16.5 9.5 12l2.5 2.4L15 11l4 4.2" {...common} />
        </>
      )}

      {name === 'check' && <Path d="M5 12.5 10 17.5 19.5 7" {...common} />}

      {name === 'ledger' && (
        <>
          {/* a little notebook — what you lent, written down */}
          <Path d="M6.5 4.5h10a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-10a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 6.5 4.5Z" {...common} />
          <Line x1="8.5" y1="9" x2="14.5" y2="9" {...common} />
          <Line x1="8.5" y1="12.3" x2="14.5" y2="12.3" {...common} />
          <Line x1="8.5" y1="15.6" x2="12" y2="15.6" {...common} />
        </>
      )}

      {name === 'eye' && (
        <>
          <Path d="M2.7 12S6.2 5.8 12 5.8 21.3 12 21.3 12 17.8 18.2 12 18.2 2.7 12 2.7 12Z" {...common} />
          <Circle cx="12" cy="12" r="3.1" {...common} />
        </>
      )}

      {name === 'bug' && (
        <>
          <Path d="M9.3 8.6a2.7 2.7 0 0 1 5.4 0" {...common} />
          <Path d="M8 13a4 4 0 0 1 8 0v1a4 4 0 0 1-8 0Z" {...common} />
          <Line x1="12" y1="10.4" x2="12" y2="18" {...common} />
          <Path d="M10.1 7.1 8.9 5.6" {...common} />
          <Path d="M13.9 7.1 15.1 5.6" {...common} />
          <Line x1="8.1" y1="12.4" x2="5.4" y2="11.2" {...common} />
          <Line x1="8" y1="15.2" x2="5.2" y2="15.2" {...common} />
          <Line x1="8.1" y1="18" x2="5.4" y2="19.2" {...common} />
          <Line x1="15.9" y1="12.4" x2="18.6" y2="11.2" {...common} />
          <Line x1="16" y1="15.2" x2="18.8" y2="15.2" {...common} />
          <Line x1="15.9" y1="18" x2="18.6" y2="19.2" {...common} />
        </>
      )}

      {name === 'bulb' && (
        <>
          <Path d="M8.4 14.3a5 5 0 1 1 7.2 0c-.7.8-1.2 1.5-1.4 2.4H9.8c-.2-.9-.7-1.6-1.4-2.4Z" {...common} />
          <Line x1="9.9" y1="18.6" x2="14.1" y2="18.6" {...common} />
          <Line x1="10.7" y1="20.9" x2="13.3" y2="20.9" {...common} />
        </>
      )}

      {name === 'heart' && (
        <Path
          d="M12 19.6C12 19.6 4.4 15 4.4 9.7A3.5 3.5 0 0 1 12 7.6a3.5 3.5 0 0 1 7.6 2.1C19.6 15 12 19.6 12 19.6Z"
          {...common}
        />
      )}

      {/* The celebratory/status glyphs are drawn SOLID + multi-tone so they carry
          the same colorful weight as the emoji they replaced (they ignore the
          passed `color`; see GLYPH). */}
      {name === 'trophy' && (
        <>
          {/* gold cup + stem + base, with thin wire handles */}
          <Path d="M6.5 4h11v3.4a5.5 5.5 0 0 1-11 0Z" fill={GLYPH.gold} />
          <Path d="M6.7 5.3H5a1.7 1.7 0 0 0 0 3.4h2" fill="none" stroke={GLYPH.gold} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M17.3 5.3H19a1.7 1.7 0 0 1 0 3.4h-2" fill="none" stroke={GLYPH.gold} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M10.7 12.2h2.6V16h-2.6Z" fill={GLYPH.goldDeep} />
          <Path d="M7.6 20.4 9.1 16.3h5.8l1.5 4.1Z" fill={GLYPH.goldDeep} />
        </>
      )}

      {name === 'snail' && (
        <>
          {/* sage body + tan shell with a brown spiral + antennae */}
          <Path d="M3 18.7c-.7-2.5.6-4.6 2.9-5.3.9-.3 1.9-.2 2.7.1l.7 5.2H3.2Z" fill={GLYPH.body} />
          <Path d="M5.6 13.2 4.3 10.9" fill="none" stroke={GLYPH.body} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M5.6 13.2 7.2 11.4" fill="none" stroke={GLYPH.body} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx="13.6" cy="12.3" r="5.3" fill={GLYPH.shell} />
          <Path d="M13.6 12.3a2.6 2.6 0 1 1-2.5-2.6" fill="none" stroke={GLYPH.shellSpiral} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}

      {name === 'party' && (
        <>
          {/* coral popper cone + multicolor confetti — "came home" */}
          <Path d="M3.5 20.5 8 9.5l6.5 6.5Z" fill={GLYPH.cone} />
          <Circle cx="13.2" cy="5" r="1.3" fill={GLYPH.confetti[0]} />
          <Circle cx="19.4" cy="8.4" r="1.3" fill={GLYPH.confetti[1]} />
          <Circle cx="20" cy="14" r="1.3" fill={GLYPH.confetti[2]} />
          <Path d="M15 8.2 16.7 6.5" fill="none" stroke={GLYPH.confetti[3]} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M15.9 12.4 17.9 13.2" fill="none" stroke={GLYPH.confetti[0]} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      )}

      {name === 'grave' && (
        <>
          {/* slate headstone with an etched cross + ground — "written off" */}
          <Path d="M6 21V10a6 6 0 0 1 12 0v11Z" fill={GLYPH.stone} />
          <Path d="M12 12.2v6" fill="none" stroke={GLYPH.stoneEtch} strokeWidth={2.2} strokeLinecap="round" />
          <Path d="M9.3 14.4h5.4" fill="none" stroke={GLYPH.stoneEtch} strokeWidth={2.2} strokeLinecap="round" />
          <Path d="M4 21h16" fill="none" stroke={GLYPH.stone} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      )}

      {name === 'star' && (
        <Path
          d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          fill={common.stroke}
          stroke={common.stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      )}

      {name === 'bellOff' && (
        <>
          {/* refined domed bell + clapper, with a slash that cuts through (a
              background knockout under it gives a clean gap) — "notifications off" */}
          <Path d="M12 4.2a1.4 1.4 0 0 0-1.4 1.4v.5A5.3 5.3 0 0 0 6.8 11.6c0 3-.7 4.2-1.4 5a.7.7 0 0 0 .5 1.2h12.2a.7.7 0 0 0 .5-1.2c-.7-.8-1.4-2-1.4-5a5.3 5.3 0 0 0-3.8-5.5v-.5A1.4 1.4 0 0 0 12 4.2Z" {...common} />
          <Path d="M9.8 19.2a2.3 2.3 0 0 0 4.4 0" {...common} />
          <Path d="M4.5 4.5 19.5 19.5" fill="none" stroke={colors.bg} strokeWidth={strokeWidth + 2.5} strokeLinecap="round" />
          <Path d="M4.5 4.5 19.5 19.5" {...common} />
        </>
      )}

      {name === 'parcel' && (
        <>
          {/* 3D isometric kraft box — the OweMe 📦 brand mark (matches the
              onboarding box). Top lightest, left mid, right darkest. */}
          <Path d="M12 3 20 7.5 12 12 4 7.5Z" fill={GLYPH.kraftTop} stroke={GLYPH.kraftStroke} strokeWidth={1.3} strokeLinejoin="round" />
          <Path d="M4 7.5 12 12 12 20.5 4 16Z" fill={GLYPH.kraftLeft} stroke={GLYPH.kraftStroke} strokeWidth={1.3} strokeLinejoin="round" />
          <Path d="M20 7.5 12 12 12 20.5 20 16Z" fill={GLYPH.kraftRight} stroke={GLYPH.kraftStroke} strokeWidth={1.3} strokeLinejoin="round" />
        </>
      )}

      {name === 'cactus' && (
        <>
          {/* potted cactus — "nobody owes you anything" (replaces 🌵) */}
          <Path d="M8 18.2h8l-.8 3a.8.8 0 0 1-.8.6H9.6a.8.8 0 0 1-.8-.6Z" fill={GLYPH.terracotta} />
          <Path d="M7.5 18.2h9" fill="none" stroke={GLYPH.terracottaDeep} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M10.6 18.2V9.4a1.4 1.4 0 0 1 2.8 0v8.8Z" fill={GLYPH.cactus} />
          <Path d="M10.6 13.2H9.2a1.3 1.3 0 0 0-1.3 1.3v1.4" fill="none" stroke={GLYPH.cactus} strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M13.4 11.6h1.3a1.3 1.3 0 0 1 1.3 1.3v1.6" fill="none" stroke={GLYPH.cactus} strokeWidth={2.4} strokeLinecap="round" />
          <Circle cx="12" cy="8" r="1.2" fill={GLYPH.bloom} />
        </>
      )}

      {name === 'duo' && (
        <>
          {/* two friends — "the usual suspects" (replaces 🧑‍🤝‍🧑) */}
          <Path d="M3 20.5a5 5 0 0 1 10 0Z" fill={GLYPH.duoBlue} />
          <Path d="M11 20.5a5 5 0 0 1 10 0Z" fill={GLYPH.duoCoral} />
          <Circle cx="8" cy="12.5" r="3" fill={GLYPH.skin} />
          <Circle cx="16" cy="12.5" r="3" fill={GLYPH.skin} />
        </>
      )}

      {name === 'mailbox' && (
        <>
          {/* blue mailbox, flag up — "the archive" (replaces 📬). The body (the
              dominant mass) is centred on x=12 so it reads centred; the flag sits
              in the right half, where a mailbox flag belongs. */}
          <Path d="M12 21V16.8" fill="none" stroke={GLYPH.post} strokeWidth={2.6} strokeLinecap="round" />
          <Path d="M10 21h4" fill="none" stroke={GLYPH.post} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M8.4 17V13a3.6 3.6 0 0 1 7.2 0v4Z" fill={GLYPH.mailBlue} />
          <Path d="M9.8 13.6H14.2" fill="none" stroke={GLYPH.mailDeep} strokeWidth={1.6} strokeLinecap="round" />
          <Path d="M15.6 16V9.2" fill="none" stroke={GLYPH.flagRed} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M15.6 9.2H17.9l-0.8 1 0.8 1H15.6Z" fill={GLYPH.flagRed} />
        </>
      )}

      {name === 'envelope' && (
        <>
          {/* coral envelope — a friendly nudge (replaces 📨) */}
          <Path d="M4 8a1.6 1.6 0 0 1 1.6-1.6h12.8A1.6 1.6 0 0 1 20 8v8a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 16Z" fill={GLYPH.envBody} stroke={GLYPH.envStroke} strokeWidth={1.3} strokeLinejoin="round" />
          <Path d="M4.6 7.6 12 12.6 19.4 7.6" fill="none" stroke={GLYPH.envFlap} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {name === 'logout' && (
        <>
          {/* door frame + arrow leaving — "sign out" */}
          <Path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" {...common} />
          <Path d="M10.5 12H21" {...common} />
          <Path d="M17.5 8 21.5 12 17.5 16" {...common} />
        </>
      )}

      {name === 'hourglass' && (
        <>
          {/* hourglass — "give it time" (replaces ⏳) */}
          <Path d="M7 4h10" fill="none" stroke={GLYPH.glassFrame} strokeWidth={2.6} strokeLinecap="round" />
          <Path d="M7 20h10" fill="none" stroke={GLYPH.glassFrame} strokeWidth={2.6} strokeLinecap="round" />
          <Path d="M8.5 4.6 15.5 4.6 12 12 15.5 19.4 8.5 19.4 12 12Z" fill="none" stroke={GLYPH.glassFrame} strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M9.8 6 14.2 6 12 10.6Z" fill={GLYPH.sand} />
          <Path d="M9.6 18.4 14.4 18.4 12 14.2Z" fill={GLYPH.sand} />
          <Path d="M12 11.6v3" fill="none" stroke={GLYPH.sand} strokeWidth={1.4} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );

  if (name === 'plus') {
    return (
      <Animated.View style={[plusStyle, { width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}>
        {svg}
      </Animated.View>
    );
  }

  return svg;
}
