import { View } from 'react-native';
import type { Sky as SkyName } from '../lib/money/forecast';
import { sky as skyColor } from '../lib/theme';
import { useTheme } from '../lib/theme-context';
import I from './Icon';

export const SKY_ICON: Record<SkyName, 'sun' | 'partly' | 'cloud' | 'storm'> = { sun: 'sun', partly: 'partly', cloud: 'cloud', storm: 'storm' };
export const CONDITION: Record<SkyName, string> = { sun: 'Clear skies', partly: 'Mostly sunny', cloud: 'Covered', storm: 'Storm ahead' };

// A small weather icon inside a sentence or title, in the sky's own colour
// (.skyInline).
export function SkyInline({ sky }: { sky: SkyName }) {
  const { c } = useTheme();
  const tint = { sun: `${c.sun}29`, partly: '#d9770624', cloud: c.soft, storm: '#7c3aed29' }[sky];
  const color = { sun: c.sun, partly: '#d97706', cloud: c.muted, storm: '#7c3aed' }[sky];
  return (
    <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', marginRight: 2 }}>
      <I d={SKY_ICON[sky]} size={15} stroke={2.2} color={color} />
    </View>
  );
}

// The big sky icon in the page's own colour (.sky_*).
export function SkyIcon({ sky, size }: { sky: SkyName; size: number }) {
  return <I d={SKY_ICON[sky]} size={size} color={skyColor[sky]} />;
}
