/**
 * Two-option segmented control (Item / Money) with a sliding indicator that
 * moves with expo-out easing — the indicator carries over rather than cutting.
 * Indicator is ink, not accent: the accent stays reserved for the screen's one
 * primary CTA.
 */

import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { Icon, IconName } from './Icon';
import { colors, radius, space, type as t } from '../lib/theme';
import { duration, expoOut, reduceMotion } from '../lib/motion';

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface Props<T extends string> {
  options: [Segment<T>, Segment<T>];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedToggle<T extends string>({ options, value, onChange }: Props<T>) {
  const [w, setW] = useState(0);
  const reduce = useReducedMotion();
  const activeIndex = options.findIndex((o) => o.value === value);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const indicator = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming((w - 8) / 2 * activeIndex, {
          duration: reduce ? 0 : duration.fast,
          easing: expoOut,
          reduceMotion,
        }),
      },
    ],
  }));

  return (
    <View style={styles.track} onLayout={onLayout}>
      {w > 0 && (
        <Animated.View style={[styles.indicator, { width: (w - 8) / 2 }, indicator]} />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            scaleTo={0.97}
            style={styles.segment}
          >
            {o.icon && (
              <Icon
                name={o.icon}
                size={19}
                color={active ? colors.surface : colors.inkSoft}
                strokeWidth={2}
              />
            )}
            <Text style={[styles.label, active ? styles.labelActive : styles.labelIdle]}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.bgSunken,
    borderRadius: radius.pill,
    padding: 4,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
  },
  segment: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...t.h3, fontSize: 16 },
  labelActive: { color: colors.surface },
  labelIdle: { color: colors.inkSoft },
});
