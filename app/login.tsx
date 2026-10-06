import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import AuthShell from '../components/AuthShell';
import { Button, Field, Message, PasswordField } from '../components/AuthFields';
import { useAuth } from '../lib/auth-context';

export default function LoginScreen() {
  const { isLoggedIn, isLoading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isLoading && isLoggedIn) return <Redirect href="/" />;

  const signIn = async () => {
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      lede="Your forecast is waiting."
      below={
        <Text style={styles.below}>
          New to Pursecast?{' '}
          <Link href="/signup" style={styles.link}>
            Create an account
          </Link>
        </Text>
      }
    >
      {error ? <Message kind="error">{error}</Message> : null}
      <Field label="Email" value={email} onChangeText={setEmail} autoComplete="username" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <PasswordField label="Password" value={password} onChangeText={setPassword} autoComplete="current-password" />
      <Button onPress={signIn} busy={busy}>
        Log in
      </Button>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  below: { color: 'rgba(255,255,255,0.75)', fontSize: 15 },
  link: { color: '#fff', fontWeight: '700' },
});
