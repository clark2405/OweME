/**
 * A compact single-select menu, platform-split (mirrors SegmentedToggle):
 *  - iOS → the REAL native iOS-26 menu via `@expo/ui/swift-ui` `Picker` with
 *    `pickerStyle('menu')`. Tapping the button opens the system menu list.
 *  - Android / non-iOS → a custom on-brand dropdown: a labelled button + chevron
 *    that opens a small popover list of options.
 *
 * One API. Used for the graph's Sort / Show selectors.
 */

import { useState } from 'react';
import { LayoutRectangle, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Host, Picker, Text as UIText } from '@expo/ui/swift-ui';
import { fixedSize, pickerStyle, tag, tint } from '@expo/ui/swift-ui/modifiers';
import { PressableScale } from './PressableScale';
import { Icon } from './Icon';
import { haptics } from '../lib/haptics';
import { duration, expoOut, reduceMotion } from '../lib/motion';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

export interface MenuOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  /** Small label above/inside the button (e.g. "Sort", "Show"). */
  title: string;
  options: MenuOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function MenuSelect<T extends string>(props: Props<T>) {
  return Platform.OS === 'ios' ? <NativeMenu {...props} /> : <PlainMenu {...props} />;
}

// --- iOS: native SwiftUI menu picker ---------------------------------------

function NativeMenu<T extends string>({ title, options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const current = options.find((o) => o.value === value);
  return (
    <View style={styles.nativeWrap}>
      <Text style={styles.nativeTitle}>{title}</Text>
      {/* matchContents keeps the SwiftUI host sized to the button (no oversized
          invisible bounding box overlaying the graph); tint recolors the menu's
          value + chevron from iOS-system blue to our ink so it reads on-brand. */}
      <Host matchContents>
        <Picker
          label={current?.label ?? title}
          selection={value}
          onSelectionChange={(sel) => {
            if (sel != null && sel !== value) onChange(sel as T);
          }}
          modifiers={[pickerStyle('menu'), fixedSize(), tint(colors.ink)]}
        >
          {options.map((o) => (
            <UIText key={o.value} modifiers={[tag(o.value)]}>
              {o.label}
            </UIText>
          ))}
        </Picker>
      </Host>
    </View>
  );
}

// --- Android / non-iOS: custom dropdown popover ----------------------------

function PlainMenu<T extends string>({ title, options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<LayoutRectangle | null>(null);
  const current = options.find((o) => o.value === value);
  const progress = useSharedValue(0);

  const openMenu = () => {
    haptics.tap();
    setOpen(true);
    progress.value = withTiming(1, { duration: reduce ? 0 : duration.fast, easing: expoOut, reduceMotion });
  };
  const close = () => {
    progress.value = withTiming(0, { duration: reduce ? 0 : 160, easing: expoOut, reduceMotion });
    setOpen(false);
  };

  const popStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.94 + progress.value * 0.06 }, { translateY: (1 - progress.value) * -6 }],
  }));

  return (
    <>
      <PressableScale
        onPress={openMenu}
        scaleTo={0.96}
        style={styles.button}
        onLayout={(e) => setAnchor(e.nativeEvent.layout)}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${current?.label ?? ''}`}
      >
        <Text style={styles.buttonTitle}>{title}</Text>
        <Text style={styles.buttonValue} numberOfLines={1}>
          {current?.label}
        </Text>
        <View style={styles.chevron}>
          <Icon name="chevronRight" size={15} color={colors.inkSoft} strokeWidth={2.2} />
        </View>
      </PressableScale>

      <Modal visible={open} transparent animationType="none" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Animated.View
            style={[
              styles.popover,
              anchor ? { position: 'absolute', top: anchor.y + anchor.height + 6, left: anchor.x } : null,
              popStyle,
            ]}
          >
            {options.map((o) => {
              const on = o.value === value;
              return (
                <PressableScale
                  key={o.value}
                  onPress={() => {
                    if (o.value !== value) onChange(o.value);
                    close();
                  }}
                  scaleTo={0.97}
                  style={[styles.item, on && styles.itemOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.itemText, on && styles.itemTextOn]}>{o.label}</Text>
                  {on && <Icon name="check" size={15} color={colors.ink} strokeWidth={2.4} />}
                </PressableScale>
              );
            })}
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (th: Theme) =>
  StyleSheet.create({
    nativeWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: space.sm,
      height: 40,
      paddingLeft: space.md,
      paddingRight: space.sm,
      borderRadius: radius.pill,
      backgroundColor: th.colors.surface,
      borderWidth: 1,
      borderColor: th.colors.hairline,
      // Clip any host bleed so the native menu button can't paint past the pill
      // into the graph canvas below (the popover is a system overlay, not clipped).
      overflow: 'hidden',
    },
    nativeTitle: { ...th.type.small, color: th.colors.inkFaint, fontWeight: '700' },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingVertical: space.sm,
      paddingHorizontal: space.lg,
      borderRadius: radius.pill,
      backgroundColor: th.colors.surface,
      borderWidth: 1,
      borderColor: th.colors.hairline,
    },
    buttonTitle: { ...th.type.small, color: th.colors.inkFaint, fontWeight: '700' },
    buttonValue: { ...th.type.small, color: th.colors.ink, fontWeight: '700' },
    chevron: { transform: [{ rotate: '90deg' }] },
    backdrop: { flex: 1 },
    popover: {
      minWidth: 168,
      backgroundColor: th.colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: th.colors.hairline,
      paddingVertical: space.xs,
      ...th.shadow.lifted,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.md,
      paddingVertical: space.md,
      paddingHorizontal: space.lg,
    },
    itemOn: { backgroundColor: th.colors.bgSunken },
    itemText: { ...th.type.body, color: th.colors.inkSoft },
    itemTextOn: { color: th.colors.ink, fontWeight: '700' },
  });
