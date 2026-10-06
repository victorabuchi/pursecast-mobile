import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth-context';

// Signed out people go to the login screen; signed in people to the Forecast
// (or first-time setup until they have a balance, which the Forecast sends
// them to by itself).
export default function Index() {
  const { isLoggedIn, isLoading } = useAuth();
  if (isLoading) return null;
  return <Redirect href={isLoggedIn ? '/forecast' : '/login'} />;
}
