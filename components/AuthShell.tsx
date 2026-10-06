import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import Mark from './Mark';
import { auth } from '../lib/theme';

// Frame for sign-in screens: logo and heading on the dark hero background, one
// white card, and an optional line under it. Same as the web's AuthShell.
export default function AuthShell({ title, lede, below, children }: { title: string; lede?: string; below?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#050d10" />
            <Stop offset="0.55" stopColor="#08171b" />
            <Stop offset="1" stopColor="#0b2125" />
          </LinearGradient>
          <RadialGradient id="green" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#0f7a63" stopOpacity={0.55} />
            <Stop offset="0.7" stopColor="#0f7a63" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="amber" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#f5a524" stopOpacity={0.2} />
            <Stop offset="0.7" stopColor="#f5a524" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="sky" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#38bdf8" stopOpacity={0.2} />
            <Stop offset="0.7" stopColor="#38bdf8" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bg)" />
        <Ellipse cx="30%" cy={160} rx="55%" ry={280} fill="url(#green)" />
        <Ellipse cx="75%" cy={120} rx="40%" ry={240} fill="url(#amber)" />
        <Ellipse cx="55%" cy={480} rx="60%" ry={320} fill="url(#sky)" />
      </Svg>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.page, { paddingTop: Math.max(40, insets.top), paddingBottom: Math.max(24, insets.bottom) }]}>
          <View style={styles.head}>
            <View style={styles.logo}>
              <View style={styles.tile}>
                <Mark size={22} />
              </View>
              <Text style={styles.logoText}>Pursecast</Text>
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {lede ? <Text style={styles.lede}>{lede}</Text> : null}
          </View>
          <View style={styles.card}>{children}</View>
          {below ? <View style={styles.switchRow}>{below}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: auth.page },
  fill: { flex: 1 },
  page: { alignItems: 'center', gap: 24, paddingHorizontal: 16 },
  head: { alignItems: 'center', gap: 14 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tile: { width: 36, height: 36, borderRadius: 10, backgroundColor: auth.brand, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.44 },
  title: { marginTop: 8, color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.84, textAlign: 'center' },
  lede: { maxWidth: 380, color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center' },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 30 },
    elevation: 12,
  },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
});
