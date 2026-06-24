/**
 * Two-option segmented control.
 *
 * Platform-split, mirroring the tab bar (see `(tabs)/_layout.tsx`):
 *  - iOS → the REAL native SwiftUI segmented `Picker` (`@expo/ui/swift-ui`). It's
 *    the system control, so it looks and behaves exactly like iOS — on iOS 26 it
 *    picks up Liquid Glass, the press-and-drag thumb, and haptics for free. No
 *    custom emulation. (Text-only: the system control doesn't take our SVG icons.)
 *  - Android / non-iOS → the original custom control (ink pill on a sunken track,
 *    tap or drag). Left as-is for now.
 *
 * Both share one API.
 */

import { useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Host, Label, Picker, Text as UIText } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';
import { PressableScale } from './PressableScale';
import { Icon, IconName } from './Icon';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';
import { duration, expoOut, reduceMotion } from '../lib/motion';

export interface Segment<T extends string> {
  value: T;
  label: string;
  /** Custom SVG icon for the Android/custom control. */
  icon?: IconName;
  /** SF Symbol for the native iOS control (e.g. 'shippingbox', 'dollarsign'). */
  sfSymbol?: SFSymbol;
}

interface Props<T extends string> {
  options: [Segment<T>, Segment<T>];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedToggle<T extends string>(props: Props<T>) {
  return Platform.OS === 'ios' ? <NativeSegmented {...props} /> : <PlainSegmented {...props} />;
}

// --- iOS: the real native SwiftUI segmented control --------------------------

function NativeSegmented<T extends string>({ options, value, onChange }: Props<T>) {
  const styles = useThemedStyles(makeNativeStyles);
  // Measure the available width and give the SwiftUI picker an explicit frame —
  // a standalone segmented Picker otherwise hugs its content and sits left.
  const [w, setW] = useState(0);
  return (
    <View style={styles.wrap} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Host style={{ width: w, height: 40 }}>
          <Picker
            selection={value}
            onSelectionChange={(sel) => {
              if (sel != null && sel !== value) onChange(sel as T);
            }}
            modifiers={[pickerStyle('segmented'), frame({ width: w })]}
          >
            {options.map((o) =>
              o.sfSymbol ? (
                <Label key={o.value} title={o.label} systemImage={o.sfSymbol} modifiers={[tag(o.value)]} />
              ) : (
                <UIText key={o.value} modifiers={[tag(o.value)]}>
                  {o.label}
                </UIText>
              ),
            )}
          </Picker>
        </Host>
      )}
    </View>
  );
}

// --- Android / non-iOS (original custom control) -----------------------------

function PlainSegmented<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [w, setW] = useState(0);
  const reduce = useReducedMotion();
  const seg = (w - 8) / 2;
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const dragX = useSharedValue(-1);

  const indicator = useAnimatedStyle(() => {
    const resting = seg * activeIndex;
    const x =
      dragX.value >= 0
        ? dragX.value
        : withTiming(resting, { duration: reduce ? 0 : duration.fast, easing: expoOut, reduceMotion });
    return { transform: [{ translateX: x }] };
  });

  const pan = Gesture.Pan()
    .enabled(w > 0)
    .activeOffsetX([-8, 8])
    .onUpdate((e) => {
      dragX.value = Math.max(0, Math.min(seg, e.x - 4 - seg / 2));
    })
    .onEnd((e) => {
      const idx = e.x > w / 2 ? 1 : 0;
      dragX.value = -1;
      if (options[idx].value !== value) runOnJS(onChange)(options[idx].value);
    });

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.track} onLayout={onLayout}>
        {w > 0 && <Animated.View style={[styles.indicator, { width: seg }, indicator]} />}
        {options.map((o) => {
          const active = o.value === value;
          return (
            <PressableScale
              key={o.value}
              onPress={() => onChange(o.value)}
              scaleTo={0.97}
              style={styles.segment}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.label}
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
    </GestureDetector>
  );
}

const makeNativeStyles = (_th: Theme) => StyleSheet.create({
  // Full-width wrapper we measure; the Host/Picker then gets an explicit width.
  wrap: { width: '100%', height: 40, justifyContent: 'center' },
});

const makeStyles = (th: Theme) => StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: th.colors.bgSunken,
    borderRadius: radius.pill,
    padding: 4,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: th.colors.ink,
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
  label: { ...th.type.h3, fontSize: 16 },
  labelActive: { color: th.colors.surface },
  labelIdle: { color: th.colors.inkSoft },
});
