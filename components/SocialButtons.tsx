import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Divider, Message } from './AuthFields';
import { useAuth } from '../lib/auth-context';

// "Continue with Apple" (black) and "Continue with Google" (white, with the
// Google "G"), then "or": the same buttons, in the same order, as the web's
// login and sign-up pages.
export default function SocialButtons() {
  const { loginWithApple, loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState('');

  const go = async (which: 'apple' | 'google') => {
    setError('');
    setBusy(which);
    try {
      await (which === 'apple' ? loginWithApple() : loginWithGoogle());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {error ? <Message kind="error">{error}</Message> : null}
      {Platform.OS === 'ios' ? (
        // Apple's own button, as App Review expects on iPhone.
        <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={10} style={{ width: '100%', height: 48, opacity: busy ? 0.6 : 1 }} onPress={() => !busy && void go('apple')} />
      ) : (
        <Pressable onPress={() => !busy && void go('apple')} accessibilityRole="button" style={[styles.button, { backgroundColor: '#000', borderColor: '#000' }]}>
          {busy === 'apple' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Svg viewBox="0 0 24 24" width={18} height={18} fill="#fff">
                <Path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.27-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.67Zm-2.27-6.75c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.09 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.27Z" />
              </Svg>
              <Text style={[styles.text, { color: '#fff' }]}>Continue with Apple</Text>
            </>
          )}
        </Pressable>
      )}
      <Pressable onPress={() => !busy && void go('google')} accessibilityRole="button" style={[styles.button, { backgroundColor: '#fff', borderColor: '#dadce0' }]}>
        {busy === 'google' ? (
          <ActivityIndicator color="#1f1f1f" />
        ) : (
          <>
            <Svg viewBox="0 0 48 48" width={18} height={18}>
              <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z" />
              <Path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
              <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
              <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z" />
            </Svg>
            <Text style={[styles.text, { color: '#1f1f1f' }]}>Continue with Google</Text>
          </>
        )}
      </Pressable>
      <Divider>or</Divider>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', minHeight: 48, borderRadius: 10, borderWidth: 1 },
  text: { fontSize: 16, fontWeight: '700' },
});
