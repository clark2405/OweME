/**
 * Screen header: a wide-tracked uppercase micro-label over an oversized
 * grotesque title — the headline is a layout element, not a label. Both arrive
 * as staggered masked rises.
 */

import { StyleSheet, Text, View } from 'react-native';
import { Reveal } from './Reveal';
import { space, type as t } from '../lib/theme';

interface Props {
  overline: string;
  title: string;
  /** Optional trailing element (e.g. a count or avatar) on the title row. */
  trailing?: React.ReactNode;
}

export function Header({ overline, title, trailing }: Props) {
  return (
    <View style={styles.wrap}>
      <Reveal index={0} from={10}>
        <Text style={t.overline}>{overline}</Text>
      </Reveal>
      <Reveal index={1} clip from={40}>
        <View style={styles.titleRow}>
          <Text style={[t.title, styles.title]}>{title}</Text>
          {trailing}
        </View>
      </Reveal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, marginBottom: space.xl },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title: { flexShrink: 1 },
});
