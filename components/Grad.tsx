import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { ReactNode } from 'react';

let seq = 0;

// A box with a top-to-bottom gradient (linear-gradient(180deg, from, to)).
export default function Grad({ from, to, style, children }: { from: string; to: string; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const id = `g${++seq}`;
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}
