import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold, useFonts } from '@expo-google-fonts/figtree';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider } from '../lib/auth-context';
import { ThemeProvider, useTheme } from '../lib/theme-context';

void SplashScreen.preventAutoHideAsync();

function Frame() {
  const { dark } = useTheme();
  const router = useRouter();
  // Tapping a reminder opens the screen it is about (the web path it carries).
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.['url'];
      if (typeof url !== 'string' || !url.startsWith('/')) return;
      const [path = '/forecast', hash] = url.split('#');
      router.navigate((hash ? `${path}${path.includes('?') ? '&' : '?'}at=${hash}` : path) as never);
    });
    return () => sub.remove();
  }, [router]);
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style={dark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  // Pursecast is set in Figtree, like the web app.
  const [loaded] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold });
  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;
  return (
    <ThemeProvider>
      <AuthProvider>
        <Frame />
      </AuthProvider>
    </ThemeProvider>
  );
}
