/**
 * Spooky cemetery primitives for the Hall of Shame 😈 — bare gnarled trees and a
 * carved headstone, drawn as SVG silhouettes (no emoji). Used as a felt, restrained
 * atmosphere layer: dark shapes against the warm-dark base + ember glow, per the
 * one-quiet-ambient-layer rule. Everything is a silhouette so it reads as place,
 * not clutter.
 */

import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

// Numbered rank medallion drawn as SVG (replaces the 🥇🥈🥉 / "#n" emoji+text).
// Gold/silver/bronze discs for the top three, a dark headstone-grey disc beyond.
const RANK_PALETTE = [
  { face: '#E9C45A', rim: '#B8902F', num: '#3A2A10' }, // 1 gold
  { face: '#CDD2D8', rim: '#9AA1AA', num: '#2E3338' }, // 2 silver
  { face: '#D08A4E', rim: '#9A5E2C', num: '#3A2410' }, // 3 bronze
  { face: '#3A3346', rim: '#564D64', num: '#CFC8D6' }, // 4+ stone
];

export function RankBadge({ rank, size = 28 }: { rank: number; size?: number }) {
  const p = RANK_PALETTE[Math.min(rank, 4) - 1];
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Circle cx={16} cy={16} r={14} fill={p.face} stroke={p.rim} strokeWidth={2} />
        <Circle cx={16} cy={16} r={9.5} fill="none" stroke={p.rim} strokeWidth={1} opacity={0.45} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.rankCenter]}>
        <Text style={{ fontSize: size * 0.46, fontWeight: '800', color: p.num, letterSpacing: -0.5 }}>
          {rank}
        </Text>
      </View>
    </View>
  );
}

// A bare, dead tree: a thick trunk that forks into crooked branches and thin
// twigs. Round caps so the limbs look weathered rather than geometric.
export function WiltedTree({
  width = 60,
  height = 100,
  color = '#0B0710',
  opacity = 1,
  flip = false,
  style,
}: {
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
  flip?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      pointerEvents="none"
      style={[{ width, height, opacity }, flip && styles.flip, style]}
    >
      <Svg width={width} height={height} viewBox="0 0 60 104">
        {/* ground mound at the base so the tree is rooted, not floating */}
        <Ellipse cx={30} cy={100} rx={22} ry={4.5} fill={color} opacity={0.55} />
        <G stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* trunk */}
          <Path d="M30 100 C27 82 33 72 30 60" strokeWidth={7} />
          {/* primary forks */}
          <Path d="M30 64 C24 58 19 55 12 51" strokeWidth={4.6} />
          <Path d="M30 60 C37 55 42 50 49 47" strokeWidth={4.6} />
          <Path d="M30 61 C30 51 31 45 29 37" strokeWidth={4.6} />
          {/* secondary branches */}
          <Path d="M16 53 C12 49 9 47 5 45" strokeWidth={2.6} />
          <Path d="M45 49 C49 45 52 43 56 42" strokeWidth={2.6} />
          <Path d="M29 41 C25 37 22 35 18 32" strokeWidth={2.6} />
          <Path d="M29 43 C33 39 36 36 40 33" strokeWidth={2.6} />
          {/* twigs */}
          <Path d="M8 46 L3 42 M8 46 L4 49" strokeWidth={1.6} />
          <Path d="M54 43 L59 39 M54 43 L58 46" strokeWidth={1.6} />
          <Path d="M19 33 L15 29 M40 34 L44 30" strokeWidth={1.6} />
        </G>
      </Svg>
    </View>
  );
}

// A rounded-arch headstone with a carved cross + engraved border, sitting on a
// faint mound. Two stone tones give it depth without a gradient dependency.
export function Tombstone({
  width = 96,
  height = 112,
  face = '#C9C1B4',
  edge = '#9A9183',
  engrave = '#7C7468',
  style,
}: {
  width?: number;
  height?: number;
  face?: string;
  edge?: string;
  engrave?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={[{ width, height }, style]}>
      <Svg width={width} height={height} viewBox="0 0 120 140">
        {/* mound */}
        <Ellipse cx={60} cy={132} rx={52} ry={9} fill={edge} opacity={0.4} />
        {/* stone body */}
        <Path d="M28 138 L28 58 A32 32 0 0 1 92 58 L92 138 Z" fill={face} />
        {/* shaded right edge for depth */}
        <Path
          d="M82 138 L82 58 A32 32 0 0 0 78 43 A32 32 0 0 1 92 58 L92 138 Z"
          fill={edge}
          opacity={0.55}
        />
        {/* engraved inner border */}
        <Path
          d="M40 130 L40 60 A20 20 0 0 1 80 60 L80 130"
          fill="none"
          stroke={engrave}
          strokeWidth={2}
          opacity={0.45}
        />
        {/* carved cross */}
        <Rect x={56} y={64} width={8} height={36} rx={3} fill={engrave} opacity={0.55} />
        <Rect x={46} y={75} width={28} height={8} rx={3} fill={engrave} opacity={0.55} />
      </Svg>
    </View>
  );
}

// Fixed background atmosphere for the shame screen: a pale moon up high and a
// treeline of bare silhouettes rising along the bottom. Sits behind the content.
export function GraveyardBackdrop({ children }: { children?: ReactNode }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.moon} />
      <View style={styles.moonGlow} />
      {/* A low dark hill so the treeline reads as standing on ground. */}
      <View style={styles.ground} />
      <WiltedTree style={styles.t1} width={104} height={172} />
      <WiltedTree flip style={styles.t2} width={62} height={104} />
      <WiltedTree style={styles.t3} width={70} height={116} />
      <WiltedTree flip style={styles.t4} width={112} height={184} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  rankCenter: { alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  moon: {
    position: 'absolute',
    top: 96,
    right: 32,
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#F3ECDD',
    opacity: 0.1,
  },
  moonGlow: {
    position: 'absolute',
    top: 78,
    right: 14,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F3ECDD',
    opacity: 0.04,
  },
  // Wide gentle hill across the bottom — the ground the trees are planted in.
  ground: {
    position: 'absolute',
    left: -80,
    right: -80,
    bottom: -50,
    height: 180,
    backgroundColor: '#100B16',
    borderTopLeftRadius: 320,
    borderTopRightRadius: 320,
  },
  t1: { position: 'absolute', bottom: 30, left: -16, opacity: 0.92 },
  t2: { position: 'absolute', bottom: 52, left: 74, opacity: 0.85 },
  t3: { position: 'absolute', bottom: 44, right: 62, opacity: 0.85 },
  t4: { position: 'absolute', bottom: 26, right: -18, opacity: 0.92 },
});
