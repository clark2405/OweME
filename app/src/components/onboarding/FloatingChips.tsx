/**
 * Page-1 hero visual — an INTERACTIVE brand story on an isometric box:
 *
 *   0. REST     — a CLOSED isometric cardboard box (bold-outlined cube, proper
 *                 height, two compartments inside) below six floating things.
 *   1. OPEN     — on tap the two lid flaps swing open around the centre seam.
 *   2. PACK UP  — the chips drop in and SORT: things into the left compartment,
 *                 money into the right; each shrinks + fades as it sinks in.
 *   3. CLOSE    — the flaps swing back down and seal.
 *   4. SUCK IN  — the sealed box is pulled up and sucked into a black hole
 *                 (uniform spinning collapse); the OweMe icon spins out.
 *
 * The box is SVG. Each lid flap is an Animated <Path> (animating `d` is the
 * technique react-native-svg + reanimated actually drives). One driver `o`:
 * rests at 0 (closed); a tap runs 0→1 (open+pack) then 1→2 (close+suck).
 * Reduced motion: resolved logo, stilled.
 */

import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { PressableScale } from '../PressableScale';
import { haptics } from '../../lib/haptics';
import { radius, space } from '../../lib/theme';
import { Theme, useThemedStyles } from '../../lib/theme-context';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface ChipSpec {
  emoji: string;
  label: string;
  kind: 'thing' | 'money';
  sx: number;
  sy: number;
  drift: number;
  phase: number;
}

// Three things + three money, SCATTERED and intermixed (kinds not grouped — so
// the resting layout doesn't telegraph where each will go). On tap they sort:
// things fly to the left compartment, money to the right. Collision-free.
const CHIPS: ChipSpec[] = [
  { emoji: '💸', label: '₱500', kind: 'money', sx: 100, sy: 4, drift: 6, phase: 2400 },
  { emoji: '🔧', label: 'Cordless drill', kind: 'thing', sx: -80, sy: 20, drift: 6, phase: 0 },
  { emoji: '🪙', label: '₱750', kind: 'money', sx: -35, sy: 60, drift: 5, phase: 1500 },
  { emoji: '🎧', label: 'AirPods', kind: 'thing', sx: 95, sy: 66, drift: 7, phase: 700 },
  { emoji: '💵', label: '₱1,200', kind: 'money', sx: 50, sy: 110, drift: 5, phase: 2900 },
  { emoji: '☂️', label: 'Umbrella', kind: 'thing', sx: -90, sy: 104, drift: 6, phase: 400 },
];
const N = CHIPS.length;

const WRAP_H = 400;
const CHIP_H = 36;

// ——— Isometric cube (taller), drawn in an SVG viewBox (0 0 240 200) ———
const VB_W = 240;
const VB_H = 200;
const SVG_TOP = 150;
const SEAM_Y = 54;
const TARGET_Y = SVG_TOP + SEAM_Y + 4;
const BOX_CENTER_Y = SVG_TOP + 102;
// Where chips converge before sinking in — things land left, money lands right
// (their CENTRES at ≈ wrap-centre ∓45), so the split is clearly off-centre into
// the two compartments rather than down the middle.
const TARGET_THING = -45;
const TARGET_MONEY = 45;

const KRAFT_TOP = '#F2E1C4';
const KRAFT_LEFT = '#E6CBA4';
const KRAFT_RIGHT = '#CDAE83';
const KRAFT_INSIDE = '#574230';
const KRAFT_DIVIDER = '#8A6F4E';
const STROKE = '#36281A';
const STROKE_W = 5;
const STENCIL = '#6E5436';

const TILE = 100;
const LOGO_BLOCK_H = TILE + 10 + 32 + 20;
const LOGO_TOP = (WRAP_H - LOGO_BLOCK_H) / 2 - 6;
const MORPH_RISE = BOX_CENTER_Y - (LOGO_TOP + TILE / 2);

const PACK_START = 0.16;
const FLIGHT = 0.2;
const STEP = (1 - PACK_START - FLIGHT) / (N - 1);
const LAND_AT = CHIPS.map((_, i) => PACK_START + i * STEP + FLIGHT * 0.95);
const OPEN_SPAN = 0.12;
const CLOSE_SPAN = 0.26;

const expoOutFn = (x: number): number => {
  'worklet';
  return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
};
const backOutFn = (x: number): number => {
  'worklet';
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const clamp01 = (x: number): number => {
  'worklet';
  return Math.min(1, Math.max(0, x));
};

const boxPose = (ov: number, entry: number) => {
  'worklet';
  let pulse = 0;
  for (let i = 0; i < N; i++) {
    const d = (ov - LAND_AT[i]) / 0.08;
    if (d > 0 && d < 1) pulse += Math.sin(d * Math.PI);
  }
  pulse = Math.min(pulse, 1);
  const m = clamp01(ov - 1);
  const closeP = clamp01(m / CLOSE_SPAN);
  const thunk = Math.sin(closeP * Math.PI);
  const sm = clamp01((m - CLOSE_SPAN) / (1 - CLOSE_SPAN));
  const shrinkP = clamp01(sm / 0.45);
  const small = 1 - shrinkP * shrinkP * 0.82;
  const phaseB = clamp01((sm - 0.45) / 0.55);
  const spin = phaseB * phaseB * 760;
  const rise = sm * sm * (3 - 2 * sm);
  const sc = small * (1 - phaseB);
  const morphFade = clamp01((sm - 0.82) / 0.16);
  const entryScale = 0.5 + 0.5 * entry;
  return {
    opacity: (1 - morphFade) * entry,
    transform: [
      { translateY: pulse * 3 + thunk * 4 - MORPH_RISE * rise },
      { rotate: `${spin}deg` },
      { scaleX: (1 + pulse * 0.05 + thunk * 0.05) * sc * entryScale },
      { scaleY: (1 - pulse * 0.06 - thunk * 0.06) * sc * entryScale },
    ],
  };
};

function Chip({ spec, index, o }: { spec: ChipSpec; index: number; o: SharedValue<number> }) {
  const styles = useThemedStyles(makeStyles);
  const v = useSharedValue(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    v.value = withDelay(
      spec.phase,
      withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [v, reduce, spec.phase]);

  // Land in this chip's compartment (things left, money right).
  const tx = (spec.kind === 'money' ? TARGET_MONEY : TARGET_THING) + (index % 2) * 6;
  const style = useAnimatedStyle(() => {
    const raw = clamp01((o.value - (PACK_START + index * STEP)) / FLIGHT);
    const ix = expoOutFn(clamp01(raw / 0.55));
    const drop = clamp01((raw - 0.2) / 0.8);
    const gravity = drop * drop;
    const hover = Math.sin(clamp01(raw / 0.3) * Math.PI) * 9;
    const idle = 1 - ix;
    const sink = clamp01((gravity - 0.6) / 0.4);
    // Genie warp: squeeze width, stretch-then-compress height, skew/rotate as it enters
    const genieP = clamp01((gravity - 0.15) / 0.85);
    const genieEased = genieP * genieP;
    
    // Scale down width almost completely
    const scaleX = Math.max(0.01, 1 - Math.pow(genieP, 1.2) * 0.98);
    // Stretch height first, then compress to 0
    const scaleY = Math.max(0.01, (1 - genieP) + 0.6 * Math.sin(Math.pow(genieP, 0.8) * Math.PI));
    
    // Skew and rotate based on horizontal entry direction to simulate organic suction
    const travelDir = Math.sign(spec.sx - tx);
    const skewVal = travelDir * genieEased * 15;
    const rotateVal = travelDir * genieEased * 10;

    return {
      opacity: 1 - sink,
      transform: [
        { translateX: (spec.sx - tx) * (1 - ix) + (v.value - 0.5) * spec.drift * 0.5 * idle },
        {
          translateY:
            (spec.sy - TARGET_Y) * (1 - gravity) - hover + (v.value - 0.5) * spec.drift * idle,
        },
        { scaleX },
        { scaleY },
        { skewY: `${skewVal}deg` },
        { rotate: `${rotateVal}deg` },
      ],
    };
  });

  return (
    <View style={[styles.chipContainer, { left: '50%', marginLeft: tx - 120, top: TARGET_Y }]} pointerEvents="none">
      <Animated.View style={[styles.chip, style]}>
        <Text style={styles.emoji}>{spec.emoji}</Text>
        <Text style={styles.label} numberOfLines={1}>{spec.label}</Text>
      </Animated.View>
    </View>
  );
}

/** The isometric cube — taller, bold warm faces, a centre divider (two
 *  compartments). The two lid flaps are Animated <Path>s swinging open→closed
 *  around the seam. `e`: 1 = closed, 0 = open. */
function IsoBox({ o }: { o: SharedValue<number> }) {
  const leftFlap = useAnimatedProps(() => {
    const openP = clamp01(o.value / OPEN_SPAN);
    const closeP = clamp01((o.value - 1) / CLOSE_SPAN);
    const e0 = 1 - openP + closeP;
    const e = e0 * e0 * (3 - 2 * e0);
    const midX = 118 - 96 * e; // seam 118 (open) → corner 22 (closed)
    return { d: `M118,16 L${midX},54 L118,92 Z` };
  });
  const rightFlap = useAnimatedProps(() => {
    const openP = clamp01(o.value / OPEN_SPAN);
    const closeP = clamp01((o.value - 1 - 0.04) / CLOSE_SPAN);
    const e0 = 1 - openP + closeP;
    const e = e0 * e0 * (3 - 2 * e0);
    const midX = 122 + 96 * e; // seam 122 (open) → corner 218 (closed)
    return { d: `M122,16 L${midX},54 L122,92 Z` };
  });

  return (
    <Svg width={VB_W} height={VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {/* Cube body — front-left + right faces (taller) */}
      <Polygon
        points="22,54 120,94 120,190 22,150"
        fill={KRAFT_LEFT}
        stroke={STROKE}
        strokeWidth={STROKE_W}
        strokeLinejoin="round"
      />
      <Polygon
        points="120,94 218,54 218,150 120,190"
        fill={KRAFT_RIGHT}
        stroke={STROKE}
        strokeWidth={STROKE_W}
        strokeLinejoin="round"
      />
      {/* "RETURN TO SENDER" stamp on the left face — left-aligned, hugging the edge */}
      <G transform="translate(48 140) skewY(20) translate(-48 -140)">
        <SvgText x={30} y={136} fontSize={7.5} fontWeight="800" fill={STENCIL} textAnchor="start" letterSpacing={0.3}>
          RETURN TO
        </SvgText>
        <SvgText x={30} y={147} fontSize={7.5} fontWeight="800" fill={STENCIL} textAnchor="start" letterSpacing={0.3}>
          SENDER
        </SvgText>
      </G>
      {/* "OweMe" painted on the right face — right-aligned, near the right corner */}
      <G transform="translate(185 148) skewY(-20) translate(-185 -148)">
        <SvgText x={210} y={148} fontSize={13} fontWeight="800" fill={STENCIL} textAnchor="end">
          OweMe
        </SvgText>
      </G>
      {/* Dark interior + centre divider (two compartments) */}
      <Polygon points="120,14 218,54 120,94 22,54" fill={KRAFT_INSIDE} />
      <Line x1={120} y1={18} x2={120} y2={92} stroke={KRAFT_DIVIDER} strokeWidth={5} strokeLinecap="round" />
      {/* Two lid flaps — swing open then closed around the centre seam */}
      <AnimatedPath
        animatedProps={leftFlap}
        d="M118,16 L22,54 L118,92 Z"
        fill={KRAFT_TOP}
        stroke={STROKE}
        strokeWidth={STROKE_W}
        strokeLinejoin="round"
      />
      <AnimatedPath
        animatedProps={rightFlap}
        d="M122,16 L218,54 L122,92 Z"
        fill={KRAFT_TOP}
        stroke={STROKE}
        strokeWidth={STROKE_W}
        strokeLinejoin="round"
      />
      {/* Crisp rim outline + front vertical edge */}
      <Polygon
        points="120,14 218,54 120,94 22,54"
        fill="none"
        stroke={STROKE}
        strokeWidth={STROKE_W}
        strokeLinejoin="round"
      />
      <Line x1={120} y1={94} x2={120} y2={190} stroke={STROKE} strokeWidth={STROKE_W} />
    </Svg>
  );
}

function OrganizeButton({ onPress }: { onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.04 }] }));
  return (
    <Animated.View style={style}>
      <PressableScale
        onPress={onPress}
        scaleTo={0.93}
        style={styles.ctaBtn}
        accessibilityLabel="Round them up"
        accessibilityHint="Packs your scattered items into OweMe"
      >
        <Text style={styles.ctaIcon}>📦</Text>
        <Text style={styles.ctaLabel}>Round them up</Text>
      </PressableScale>
    </Animated.View>
  );
}

export function FloatingChips() {
  const styles = useThemedStyles(makeStyles);
  const reduce = useReducedMotion();
  const o = useSharedValue(reduce ? 2 : 0);
  const boxEntry = useSharedValue(reduce ? 1 : 0);
  const float = useSharedValue(0);
  const [armed, setArmed] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  // Haptic beats scheduled across the pack animation; cleared on unmount.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (reduce) return;
    float.value = withRepeat(
      withTiming(1, { duration: 4600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    const id = setTimeout(() => setArmed(true), 650);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  const organize = () => {
    setOrganizing(true);
    haptics.soft();
    // Pop the box in with a bouncy entrance
    boxEntry.value = withTiming(1, { duration: 400, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
    // After 500ms settle, start the pack animation
    o.value = withDelay(500, withSequence(
      withTiming(1, { duration: 2500, easing: Easing.linear }),
      withDelay(150, withTiming(2, { duration: 1100, easing: Easing.linear })),
    ));
    // A soft thud as each thing drops into the box (the pack runs o:0→1 over the
    // 2.5s starting at +500ms, so a chip lands at +500 + LAND_AT·2500), then a
    // celebratory success once the lid seals.
    LAND_AT.forEach((p) => {
      timers.current.push(setTimeout(haptics.soft, 500 + p * 2500));
    });
    timers.current.push(setTimeout(haptics.success, 3450));
  };

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (float.value - 0.5) * 8 }],
  }));
  const boxStyle = useAnimatedStyle(() => boxPose(o.value, boxEntry.value));
  const swirlStyle = useAnimatedStyle(() => {
    const p = clamp01((o.value - 1.5) / 0.4);
    return {
      opacity: p <= 0 || p >= 1 ? 0 : (1 - p) * 0.55,
      transform: [{ rotate: `${p * 220}deg` }, { scale: 0.4 + p * 1.5 }],
    };
  });
  const tileStyle = useAnimatedStyle(() => {
    const p = clamp01((o.value - 1.55) / 0.4);
    const e = backOutFn(p);
    return {
      opacity: clamp01((o.value - 1.52) / 0.16),
      transform: [{ rotate: `${(1 - p) * 220}deg` }, { scale: 0.2 + 0.8 * e }],
    };
  });
  const nameStyle = useAnimatedStyle(() => {
    const p = expoOutFn(clamp01((o.value - 1.8) / 0.18));
    return { opacity: p, transform: [{ translateY: (1 - p) * 16 }] };
  });
  const tagStyle = useAnimatedStyle(() => {
    const p = expoOutFn(clamp01((o.value - 1.9) / 0.1));
    return { opacity: p, transform: [{ translateY: (1 - p) * 10 }] };
  });

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View style={[styles.wrap, wrapStyle]} pointerEvents="none">
        <Animated.View style={[styles.boxWrap, boxStyle]}>
          <IsoBox o={o} />
        </Animated.View>

        {CHIPS.map((c, i) => (
          <Chip key={c.label} spec={c} index={i} o={o} />
        ))}

        <View style={styles.logoBlock} pointerEvents="none">
          <View style={styles.tileSpot}>
            <Animated.View style={[styles.swirl, swirlStyle]} />
            <Animated.View style={[styles.tileShadow, tileStyle]}>
              <Image
                source={require('../../../assets/images/OweMeLogoSmall.png')}
                style={styles.tileImg}
                resizeMode="contain"
              />
            </Animated.View>
          </View>
          <Animated.View style={nameStyle}>
            <Text style={styles.name}>
              Owe<Text style={styles.nameAccent}>Me</Text>
            </Text>
          </Animated.View>
          <Animated.View style={tagStyle}>
            <Text style={styles.tagline}>Everything you lend, remembered.</Text>
          </Animated.View>
        </View>
      </Animated.View>

      {armed && !organizing && (
        <Animated.View
          style={styles.cta}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(180)}
          pointerEvents="box-none"
        >
          <OrganizeButton onPress={organize} />
        </Animated.View>
      )}
    </View>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  root: { height: WRAP_H, alignSelf: 'stretch' },
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  boxWrap: {
    position: 'absolute',
    top: SVG_TOP,
    left: '50%',
    marginLeft: -VB_W / 2,
    width: VB_W,
    height: VB_H,
  },
  chipContainer: {
    position: 'absolute',
    width: 240,
    alignItems: 'center',
  },
  chip: {
    height: CHIP_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: th.colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: th.colors.hairline,
    shadowColor: th.colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emoji: { fontSize: 16 },
  label: { ...th.type.small, color: th.colors.ink, fontWeight: '700', letterSpacing: -0.1 },

  cta: {
    position: 'absolute',
    top: SVG_TOP + 206,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: th.colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 11,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: th.colors.hairline,
    ...th.shadow.lifted,
  },
  ctaIcon: { fontSize: 16 },
  ctaLabel: { ...th.type.h3, fontSize: 15, color: th.colors.accent, letterSpacing: -0.2 },

  logoBlock: {
    position: 'absolute',
    top: LOGO_TOP,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 10,
  },
  tileSpot: { width: TILE, height: TILE, alignItems: 'center', justifyContent: 'center' },
  swirl: {
    position: 'absolute',
    width: TILE + 30,
    height: TILE + 30,
    borderRadius: (TILE + 30) / 2,
    borderWidth: 3,
    borderColor: th.colors.accent,
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  tileShadow: { ...th.shadow.lifted },
  tileImg: { width: TILE, height: TILE },
  name: { fontSize: 27, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8, color: th.colors.ink },
  nameAccent: { color: th.colors.accent },
  tagline: { ...th.type.small, color: th.colors.inkSoft },
});
