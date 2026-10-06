import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as api from './api-client';
import type { Shell } from './types';

// The frame's data (bell, palette, note, picture), loaded once after sign-in
// and refreshed when something changes.
type ShellValue = { shell: Shell | null; refreshShell: () => Promise<void> };
const ShellContext = createContext<ShellValue>({ shell: null, refreshShell: async () => {} });

export function ShellProvider({ children }: { children: ReactNode }) {
  const [shell, setShell] = useState<Shell | null>(null);
  const refreshShell = useCallback(async () => {
    setShell(await api.getShell().catch(() => null));
  }, []);
  useEffect(() => {
    void refreshShell();
  }, [refreshShell]);
  return <ShellContext.Provider value={{ shell, refreshShell }}>{children}</ShellContext.Provider>;
}

export const useShell = () => useContext(ShellContext);

// Opens a web path from the palette, bell or a link inside a page, as a
// screen of the app. "?x=1" parameters carry over; "#todo" becomes at=todo.
export function useGo() {
  const router = useRouter();
  return useCallback(
    (href: string) => {
      const [path = '/forecast', hash] = href.split('#');
      router.navigate((hash ? `${path}${path.includes('?') ? '&' : '?'}at=${hash}` : path) as never);
    },
    [router],
  );
}
