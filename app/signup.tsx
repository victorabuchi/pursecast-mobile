import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import AuthShell from '../components/AuthShell';
import SocialButtons from '../components/SocialButtons';
import { Button, Field, Message, PasswordField } from '../components/AuthFields';
import { useAuth } from '../lib/auth-context';

const MIN_PASSWORD_LENGTH = 10;

export default function SignupScreen() {
  const { isLoggedIn, isLoading, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isLoading && isLoggedIn) return <Redirect href="/" />;

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await register(name, email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const taken = error.startsWith('There is already an account');

  return (
    <AuthShell
      title="Start budgeting the future"
      lede="Free while in beta. No bank login needed."
      below={
        <Text style={styles.below}>
          Already have an account?{' '}
          <Link href="/login" style={styles.link}>
            Log in
          </Link>
        </Text>
      }
    >
      {error ? <Message kind="error">{error}</Message> : null}
      <SocialButtons />
      <Field label="Your name" value={name} onChangeText={setName} autoComplete="given-name" maxLength={80} />
      <Field label="Email" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <PasswordField label="Password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`} value={password} onChangeText={setPassword} autoComplete="new-password" />
      <Button onPress={submit} busy={busy}>
        Create account
      </Button>
      <Text style={styles.fine}>
        {taken ? (
          <Link href="/login" style={styles.fineLink}>
            Go to log in
          </Link>
        ) : (
          'You can export or delete your data at any time.'
        )}
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  below: { color: 'rgba(255,255,255,0.75)', fontSize: 15 },
  link: { color: '#fff', fontWeight: '700' },
  fine: { color: '#5d6673', fontSize: 13, textAlign: 'center' },
  fineLink: { color: '#0f7a63', fontWeight: '700' },
});
