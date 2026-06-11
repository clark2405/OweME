/**
 * The single, persistent ambient layer that lives behind ALL tabs (in the tabs
 * layout, not per screen). When the active tab changes it cross-fades from the
 * old variant to the new one, so the background eases between sections instead
 * of jumping. One continuous space (offbrand-design §3b: transitions connect).
 */

import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { AmbientBackground, AmbientVariant } from './AmbientBackground';
import { duration } from '../lib/motion';

export function TabAmbient({ variant }: { variant: AmbientVariant }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Keyed by variant: on change, the old layer plays its exit fade while the
          new one fades in → a soft cross-fade between sections. */}
      <Animated.View
        key={variant}
        entering={FadeIn.duration(duration.slow)}
        exiting={FadeOut.duration(duration.slow)}
        style={StyleSheet.absoluteFill}
      >
        <AmbientBackground variant={variant} />
      </Animated.View>
    </View>
  );
}
