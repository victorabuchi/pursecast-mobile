import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type Palette } from './theme';

// Light, dark, or automatic, as picked in Settings. Automatic follows the
// device, and is dark from 7 pm to 7 am even on devices that stay light; it is
// checked again every few minutes so it turns at 7 without a restart. Same rule
// as the web app's root layout.
export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'pursecast_theme';

type ThemeValue = { c: Palette; dark: boolean; pref: ThemePref; setPref: (p: ThemePref) => void };
const ThemeContext = createContext<ThemeValue>({ c: light, dark: false, pref: 'system', setPref: () => {} });

const night = () => {
  const h = new Date().getHours();
  return h >= 19 || h < 7;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const device = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((v) => setPrefState(v === 'light' || v === 'dark' ? v : 'system'))
      .catch(() => undefined);
    const timer = setInterval(() => setTick((t) => t + 1), 300000);
    return () => clearInterval(timer);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const isDark = pref === 'dark' || (pref === 'system' && (device === 'dark' || night()));
    return {
      c: isDark ? dark : light,
      dark: isDark,
      pref,
      setPref: (p) => {
        setPrefState(p);
        (p === 'system' ? SecureStore.deleteItemAsync(KEY) : SecureStore.setItemAsync(KEY, p)).catch(() => undefined);
      },
    };
    // tick re-evaluates the 7 pm / 7 am rule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pref, device, tick]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
