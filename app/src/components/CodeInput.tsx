/**
 * Segmented one-time-code field — N cells with a single hidden TextInput behind
 * them, the standard RN OTP pattern. The cells are presentation only; all input
 * (keyboard, paste, SMS autofill) flows through the overlaid field. On-brand:
 * the active cell lifts with an accent ring and a softly blinking caret, filled
 * cells settle into ink. Reduced-motion drops the blink.
 */

import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { space } from '../lib/theme';
import { Theme, useThemedStyles } from '../lib/theme-context';

interface Props {
  value: string;
  onChange: (next: string) => void;
  /** Fired when the last cell fills — lets the screen auto-submit. */
  onComplete?: (code: string) => void;
  cellCount?: number;
  autoFocus?: boolean;
}

export function CodeInput({ value, onChange, onComplete, cellCount = 6, autoFocus }: Props) {
  const styles = useThemedStyles(makeStyles);
  const reduced = useReducedMotion();
  const inputRef = useRef<TextInput>(null);
  const blink = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    blink.value = withRepeat(withTiming(0, { duration: 560, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [blink, reduced]);

  const caretStyle = useAnimatedStyle(() => ({ opacity: blink.value }));

  const handle = (raw: string) => {
    const next = raw.replace(/[^0-9]/g, '').slice(0, cellCount);
    onChange(next);
    if (next.length === cellCount) onComplete?.(next);
  };

  const cells = Array.from({ length: cellCount });
  const activeIndex = Math.min(value.length, cellCount - 1);

  return (
    <Pressable style={styles.row} onPress={() => inputRef.current?.focus()}>
      {cells.map((_, i) => {
        const char = value[i] ?? '';
        const filled = char !== '';
        const active = i === value.length;
        return (
          <View key={i} style={[styles.cell, filled && styles.cellFilled, active && styles.cellActive]}>
            <Animated.Text style={styles.cellText}>{char}</Animated.Text>
            {active && !filled && <Animated.View style={[styles.caret, caretStyle]} />}
          </View>
        );
      })}

      {/* The real input: covers the cells, invisible, captures everything. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handle}
        style={styles.hidden}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={cellCount}
        caretHidden
        autoFocus={autoFocus}
        // eslint-disable-next-line react-native/no-inline-styles
        selectionColor="transparent"
      />
    </Pressable>
  );
}

const makeStyles = (th: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
    cell: {
      flex: 1,
      aspectRatio: 0.82,
      maxWidth: 56,
      borderRadius: 14,
      backgroundColor: th.colors.surface,
      borderWidth: 1.5,
      borderColor: th.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellFilled: { borderColor: th.colors.inkFaint },
    cellActive: {
      borderColor: th.colors.accent,
      backgroundColor: th.colors.surfaceWarm,
      ...th.shadow.card,
    },
    cellText: { fontSize: 26, fontWeight: '800', color: th.colors.ink },
    caret: {
      position: 'absolute',
      width: 2,
      height: 26,
      borderRadius: 1,
      backgroundColor: th.colors.accent,
    },
    hidden: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, color: 'transparent' },
  });
