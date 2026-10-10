import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { sky } from '../lib/theme';
import { useTheme } from '../lib/theme-context';
import I from './Icon';
import { Txt } from './ui';

// What a screen shows while it loads, instead of a blank page: the weather
// icons of Money Weather turning over, sun, partly sunny, cloud, storm.
const FRAMES = [
  { icon: 'sun', color: sky.sun },
  { icon: 'partly', color: sky.partly },
  { icon: 'cloud', color: sky.cloud },
  { icon: 'storm', color: sky.storm },
] as const;

export default function WeatherLoader() {
  const { c } = useTheme();
  const [i, setI] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
        setI((n) => (n + 1) % FRAMES.length);
        Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
      });
    }, 700);
    return () => clearInterval(timer);
  }, [fade]);
  const frame = FRAMES[i]!;
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <Animated.View style={{ opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }], width: 76, height: 76, borderRadius: 22, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
        <I d={frame.icon} size={38} stroke={1.8} color={frame.color} />
      </Animated.View>
      <Txt style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>Loading…</Txt>
    </View>
  );
}
