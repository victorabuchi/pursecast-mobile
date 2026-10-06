import Svg, { Path } from 'react-native-svg';
import { P } from '../lib/icon-paths';

export type IconName = keyof typeof P;

// Stroke icons, the same drawings as the web app's Icon component.
export default function I({ d, size = 16, stroke = 2, color }: { d: IconName; size?: number; stroke?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color ?? '#000'} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <Path d={P[d]} />
    </Svg>
  );
}
