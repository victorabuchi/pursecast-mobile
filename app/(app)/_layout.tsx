import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppTabBar, { tabsHeight } from '../../components/AppTabBar';
import TopBar from '../../components/TopBar';
import { ToastProvider } from '../../components/ui';
import { useAuth } from '../../lib/auth-context';
import { prefetchPages } from '../../lib/use-page';
import { ShellProvider, useShell } from '../../lib/shell-context';

// Signed-in pages share the app frame (the web's (app)/layout.tsx): the top
// bar and, on phones, the tab bar. Setup, Settings and Banks are pages of the
// frame too, just not in the tab bar.
export default function AppLayout() {
  const { isLoggedIn, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;
  return (
    <ShellProvider>
      <Frame />
    </ShellProvider>
  );
}

function Frame() {
  const insets = useSafeAreaInsets();
  const { shell } = useShell();
  const setUp = shell ? shell.setUp : true;
  // Once the app is open, fetch the other main screens quietly so tabs open ready.
  useEffect(() => {
    if (!shell?.setUp) return;
    const t = setTimeout(() => void prefetchPages(), 2500);
    return () => clearTimeout(t);
  }, [shell?.setUp]);
  return (
    <>
      <ToastProvider bottom={setUp ? tabsHeight(insets.bottom) + 24 : insets.bottom + 90}>
        <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ header: () => <TopBar /> }}>
          <Tabs.Screen name="forecast" options={{ title: 'Money Weather' }} />
          <Tabs.Screen name="spending" options={{ title: 'Spending' }} />
          <Tabs.Screen name="worth-it" options={{ title: 'Worth-It' }} />
          <Tabs.Screen name="forks" options={{ title: 'Timeline Forks' }} />
          <Tabs.Screen name="plan" options={{ title: 'Plan ahead' }} />
          <Tabs.Screen name="statements" options={{ title: 'Statements' }} />
          <Tabs.Screen name="banks" options={{ href: null, title: 'Banks' }} />
          <Tabs.Screen name="settings" options={{ href: null, title: 'Settings' }} />
          <Tabs.Screen name="setup" options={{ href: null, title: 'Your setup' }} />
        </Tabs>
      </ToastProvider>
    </>
  );
}
