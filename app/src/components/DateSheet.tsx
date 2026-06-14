/**
 * A bottom-sheet month calendar for picking a date — pure JS (no native date
 * module, so it hot-reloads and stays on-brand). Works in local time on
 * `YYYY-MM-DD` strings. Days outside [minDate, maxDate] are disabled, e.g. a
 * lent-date can't be in the future, a due-date can't be in the past.
 */

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { Icon } from './Icon';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function startMonth(iso: string | undefined): { y: number; m: number } {
  const base = iso ? new Date(iso + 'T00:00:00') : new Date();
  return { y: base.getFullYear(), m: base.getMonth() };
}

interface Props {
  visible: boolean;
  value?: string;
  title?: string;
  /** Inclusive ISO bounds; days outside are disabled. */
  minDate?: string;
  maxDate?: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
}

export function DateSheet({ visible, value, title = 'Pick a date', minDate, maxDate, onSelect, onClose }: Props) {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [view, setView] = useState(() => startMonth(value));

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const disabled = (iso: string) =>
    (minDate != null && iso < minDate) || (maxDate != null && iso > maxDate);

  const step = (delta: number) => {
    const next = new Date(view.y, view.m + delta, 1);
    setView({ y: next.getFullYear(), m: next.getMonth() });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close date picker" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
        <Text style={[t.overline, styles.title]}>{title}</Text>

        <View style={styles.navRow}>
          <PressableScale onPress={() => step(-1)} scaleTo={0.9} style={styles.navBtn} accessibilityLabel="Previous month">
            <Icon name="chevronLeft" size={18} color={colors.inkSoft} strokeWidth={2.2} />
          </PressableScale>
          <Text style={styles.monthLabel}>{MONTHS[view.m]} {view.y}</Text>
          <PressableScale onPress={() => step(1)} scaleTo={0.9} style={styles.navBtn} accessibilityLabel="Next month">
            <Icon name="chevronRight" size={18} color={colors.inkSoft} strokeWidth={2.2} />
          </PressableScale>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} style={styles.weekday}>{d}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((day, i) => {
            if (day == null) return <View key={i} style={styles.cell} />;
            const iso = toIso(view.y, view.m, day);
            const isOff = disabled(iso);
            const selected = iso === value;
            return (
              <Pressable
                key={i}
                disabled={isOff}
                onPress={() => {
                  onSelect(iso);
                  onClose();
                }}
                style={styles.cell}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: isOff }}
              >
                <View style={[styles.dayDot, selected && styles.daySelected]}>
                  <Text style={[styles.dayText, isOff && styles.dayOff, selected && styles.dayTextSelected]}>
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (th: Theme) => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: th.colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xxxl,
    ...th.shadow.lifted,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: th.colors.hairline,
    marginBottom: space.lg,
  },
  title: { marginBottom: space.md },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: th.colors.surface,
    borderWidth: 1,
    borderColor: th.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { ...th.type.h3 },
  weekRow: { flexDirection: 'row', marginBottom: space.sm },
  weekday: { flex: 1, textAlign: 'center', ...th.type.small, color: th.colors.inkFaint },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayDot: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: th.colors.ink },
  dayText: { ...th.type.body, fontWeight: '600' },
  dayTextSelected: { color: th.colors.surface, fontWeight: '800' },
  dayOff: { color: th.colors.inkFaint, opacity: 0.4 },
});
