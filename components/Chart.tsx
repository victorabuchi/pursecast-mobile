import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { VB, smooth, type Pt } from '../lib/chart';
import { useTheme } from '../lib/theme-context';
import { Txt } from './ui';

// Line charts, as on the web, drawn in pixels once the width is known so
// strokes and dots stay sharp. Points come in the web's 600 x 200 box
// (lib/chart.ts) and are scaled to the card.
export type Box = { w: number; h: number };
export const px = (p: Pt, { w, h }: Box): Pt => [(p[0] / VB.w) * w, (p[1] / VB.h) * h];

export function Chart({ height, children }: { height: number; children: (box: Box) => ReactNode }) {
  const [w, setW] = useState(0);
  return (
    <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? children({ w, h: height }) : null}
    </View>
  );
}

// The lines draw in from the left, like the web's .draw.
export function Lines({ box, lines }: { box: Box; lines: Array<{ points: Pt[]; color: string; dashed?: boolean; draw?: boolean }> }) {
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(reveal, { toValue: 1, duration: 1600, delay: 150, easing: Easing.bezier(0.3, 0.6, 0.3, 1), useNativeDriver: false }).start();
  }, [reveal]);
  const svg = (items: typeof lines) => (
    <Svg width={box.w} height={box.h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      {items.map((l, i) => (
        <Path key={i} d={smooth(l.points.map((p) => px(p, box)))} fill="none" stroke={l.color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={l.dashed ? '5 6' : undefined} opacity={l.dashed ? 0.6 : 1} />
      ))}
    </Svg>
  );
  const still = lines.filter((l) => !l.draw);
  const drawn = lines.filter((l) => l.draw);
  return (
    <>
      {still.length ? svg(still) : null}
      {drawn.length ? <Animated.View style={{ position: 'absolute', left: 0, top: 0, height: box.h, overflow: 'hidden', width: reveal.interpolate({ inputRange: [0, 1], outputRange: [0, box.w] }) }}>{svg(drawn)}</Animated.View> : null}
    </>
  );
}

// The dashed line at zero, with its label (.zero).
export function ZeroLine({ y, label }: { y: number; label: string }) {
  const { c } = useTheme();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: y, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#fca5a5' }}>
      <Txt style={{ position: 'absolute', right: 0, top: -17, color: c.neg, fontSize: 11, fontWeight: '700' }}>{label}</Txt>
    </View>
  );
}

// A round dot on the line (.dot), and an optional label above it (.dotLabel).
export function Dot({ at, color, label }: { at: [number, number]; color: string; label?: string }) {
  const { c } = useTheme();
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', left: at[0] - 6.5, top: at[1] - 6.5, width: 13, height: 13, borderRadius: 7, borderWidth: 2.5, borderColor: c.card, backgroundColor: color, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }} />
      {label ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: at[0] - 110, width: 220, top: at[1] - 12 - 24, alignItems: 'center', zIndex: 2 }}>
          <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 7, backgroundColor: c.ink }}>
            <Txt style={{ color: c.bg, fontSize: 11, fontWeight: '700' }}>{label}</Txt>
          </View>
        </View>
      ) : null}
    </>
  );
}
