import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from './api-client';
import { cache, keyOf } from './page-cache';
import { useAuth } from './auth-context';
import { useToast } from '../components/ui';

// The main screens' data, fetched one after another in the background once the
// app is open, so tapping a tab finds it ready. (Matches what each screen asks.)
export async function prefetchPages(): Promise<void> {
  for (const [name, days] of [['spending', undefined], ['worth-it', undefined], ['plan', 366], ['forks', 290]] as const) {
    const key = keyOf(name, days);
    if (cache.has(key)) continue;
    try {
      cache.set(key, await api.getPage(name, days));
    } catch {
      return; // offline, signed out, or first-time setup: the screens will say so themselves
    }
  }
}

// Loads one screen's data from the web, again whenever the screen comes back
// into view, and sends first-time users to setup (as the web's requireSetUp does).
export function usePage<T>(name: string, days?: number, query?: Record<string, string>) {
  const router = useRouter();
  const { logout } = useAuth();
  const key = keyOf(name, days, query);
  const [data, setData] = useState<T | null>((cache.get(key) as T | undefined) ?? null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!cache.has(key));
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const next = await api.getPage<T>(name, days, query);
      cache.set(key, next);
      if (mine === seq.current) {
        setData(next);
        setError('');
      }
    } catch (e) {
      if (e instanceof api.SetupRequired) router.replace('/setup');
      else if (e instanceof api.SignedOut) await logout();
      else if (mine === seq.current) setError(e instanceof Error ? e.message : 'Could not load. Pull to try again.');
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [key, router, logout]);

  // Another view of the same screen (a different forecast range) that was seen before shows at once.
  useEffect(() => {
    const known = cache.get(key);
    if (known) setData(known as T);
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { data, error, loading, reload };
}

// Runs one of the web's server actions and shows the toast or error it
// answers with, as the web's <Toast /> does after a redirect.
export function useRunner(after?: () => void | Promise<void>) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // The full answer: null when it failed (the error is already shown).
  const runFull = useCallback(
    async (name: string, payload: { form?: Record<string, unknown>; args?: unknown[] } = {}): Promise<api.ActionResult | null> => {
      setBusy(true);
      try {
        const res = await api.action(name, payload);
        if (res.redirect?.toast) toast.show(res.redirect.toast);
        await after?.();
        return res;
      } catch (e) {
        toast.show(e instanceof Error ? e.message : 'Something went wrong. Try again.', true);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [after, toast],
  );
  const run = useCallback(async (name: string, payload: { form?: Record<string, unknown>; args?: unknown[] } = {}): Promise<boolean> => Boolean(await runFull(name, payload)), [runFull]);
  return { run, runFull, busy };
}
