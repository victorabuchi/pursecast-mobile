import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { auth } from '../lib/theme';

export function Field({ label, hint, ...input }: { label: string; hint?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={auth.muted} {...input} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function PasswordField({ label, hint, value, onChangeText, autoComplete }: { label: string; hint?: string; value: string; onChangeText: (v: string) => void; autoComplete: 'current-password' | 'new-password' }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput style={[styles.input, { paddingRight: 48 }]} secureTextEntry={!visible} value={value} onChangeText={onChangeText} autoComplete={autoComplete} autoCapitalize="none" autoCorrect={false} />
        <Pressable onPress={() => setVisible((v) => !v)} accessibilityLabel={visible ? 'Hide password' : 'Show password'} accessibilityRole="button" style={styles.eye}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={auth.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            {visible ? (
              <>
                <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <Path d="M1 1l22 22" />
              </>
            ) : (
              <>
                <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <Circle cx={12} cy={12} r={3} />
              </>
            )}
          </Svg>
        </Pressable>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Button({ children, onPress, ghost, busy }: { children: string; onPress: () => void; ghost?: boolean; busy?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.button, ghost ? styles.ghost : styles.solid, pressed && { opacity: 0.85 }]}>
      {busy ? <ActivityIndicator color={ghost ? auth.ink : '#fff'} /> : <Text style={[styles.buttonText, { color: ghost ? auth.ink : '#fff' }]}>{children}</Text>}
    </Pressable>
  );
}

export function Message({ kind, children }: { kind: 'error' | 'success' | 'notice'; children: string }) {
  const tone = kind === 'error' ? { color: auth.danger, backgroundColor: auth.dangerTint } : kind === 'success' ? { color: auth.ink, backgroundColor: auth.brandTint } : { color: auth.muted, backgroundColor: auth.notice };
  return (
    <Text style={[styles.message, tone]} accessibilityRole={kind === 'error' ? 'alert' : undefined}>
      {children}
    </Text>
  );
}

export function Divider({ children }: { children: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.rule} />
      <Text style={styles.dividerText}>{children}</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: auth.ink },
  hint: { fontSize: 13, color: auth.muted },
  input: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: auth.line, borderRadius: 10, backgroundColor: '#fff', color: auth.ink, fontSize: 16 },
  eye: { position: 'absolute', top: 4, right: 4, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  solid: { backgroundColor: auth.brand, borderColor: auth.brand },
  ghost: { backgroundColor: '#fff', borderColor: auth.line },
  buttonText: { fontSize: 16, fontWeight: '700' },
  message: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, fontSize: 14, overflow: 'hidden' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { flex: 1, height: 1, backgroundColor: auth.line },
  dividerText: { color: auth.muted, fontSize: 13 },
});
