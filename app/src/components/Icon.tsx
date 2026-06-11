/**
 * Custom line-icon set — stripped-back, rounded, friendly-but-premium, to match
 * OweMe's warm aesthetic (replaces the emoji UI glyphs). All on a 24×24 grid,
 * 2px rounded strokes, no fill. One component, `name`-switched, so sizing and
 * color stay consistent everywhere.
 */

import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors } from '../lib/theme';

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
  | 'search';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = colors.ink, strokeWidth = 2 }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <>
          <Path d="M3.5 10.8 12 4l8.5 6.8" {...common} />
          <Path d="M5.5 9.6V19a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V9.6" {...common} />
          <Path d="M9.7 20v-5.2a1 1 0 0 1 1-1h2.6a1 1 0 0 1 1 1V20" {...common} />
        </>
      )}

      {name === 'people' && (
        <>
          <Circle cx="9" cy="8" r="3.2" {...common} />
          <Path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" {...common} />
          <Path d="M15.5 5.4a3.2 3.2 0 0 1 0 5.6" {...common} />
          <Path d="M16.5 14.8c2.3.5 4 2.3 4 4.7" {...common} />
        </>
      )}

      {name === 'history' && (
        <>
          {/* archive tray — matches the "the archive" copy */}
          <Path d="M3.5 6.5a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v2.4a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z" {...common} />
          <Path d="M5 9.9V18.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.9" {...common} />
          <Line x1="9.6" y1="13.4" x2="14.4" y2="13.4" {...common} />
        </>
      )}

      {name === 'settings' && (
        <>
          {/* sliders — modern, less busy than a gear */}
          <Line x1="4" y1="8" x2="20" y2="8" {...common} />
          <Line x1="4" y1="16" x2="20" y2="16" {...common} />
          <Circle cx="9" cy="8" r="2.5" {...common} fill={colors.surface} />
          <Circle cx="15" cy="16" r="2.5" {...common} fill={colors.surface} />
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
    </Svg>
  );
}
