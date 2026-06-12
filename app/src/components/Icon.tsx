/**
 * Custom line-icon set — stripped-back, rounded, friendly-but-premium, to match
 * OweMe's warm aesthetic (replaces the emoji UI glyphs). All on a 24×24 grid,
 * 2px rounded strokes, no fill. One component, `name`-switched, so sizing and
 * color stay consistent everywhere.
 */

import Svg, { Circle, Line, Path } from 'react-native-svg';
import Animated, { SharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors } from '../lib/theme';
import { spring } from '../lib/motion';

const AnimatedPath = Animated.createAnimatedComponent(Path) as any;
const AnimatedCircle = Animated.createAnimatedComponent(Circle) as any;
const AnimatedLine = Animated.createAnimatedComponent(Line) as any;

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
  | 'check';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  focused?: boolean;
  clickProgress?: SharedValue<number>;
}

export function Icon({ name, size = 24, color = colors.ink, strokeWidth = 2, focused = false, clickProgress }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  const progress = clickProgress || { value: 0 };

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

  return (
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
    </Svg>
  );
}
