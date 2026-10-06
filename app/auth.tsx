import { Redirect } from 'expo-router';

// pursecast://auth is where the browser hands a Google or Apple sign-in back to
// the app. The app reads it itself (lib/api-client.ts); if the system also
// opens it as a screen, go home.
export default function AuthReturn() {
  return <Redirect href="/" />;
}
