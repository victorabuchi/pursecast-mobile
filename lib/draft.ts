import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';

// What is typed in Setup is kept on this phone until it is saved, so leaving
// the screen loses nothing (the web keeps it in the browser). Stored as a file
// named by the key.
const DIR = `${FileSystem.documentDirectory ?? ''}drafts/`;
const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};
const fileFor = (key: string) => `${DIR}${hash(key)}-${key.length}.json`;

export async function readDraft<T>(key: string): Promise<T | null> {
  try {
    return JSON.parse(await FileSystem.readAsStringAsync(fileFor(key))) as T;
  } catch {
    return null;
  }
}

export async function clearDrafts(): Promise<void> {
  try {
    await FileSystem.deleteAsync(DIR, { idempotent: true });
  } catch {
    // Nothing kept.
  }
}

async function write(key: string, value: unknown) {
  try {
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
    await FileSystem.writeAsStringAsync(fileFor(key), JSON.stringify(value));
  } catch {
    // Not kept; the form still works.
  }
}

// State that is saved as it changes, restored when the screen opens again.
export function useDraft<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let alive = true;
    void readDraft<T>(key).then((saved) => {
      if (!alive) return;
      if (saved) setValue(saved);
      setReady(true);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void write(key, v), 400);
        return v;
      });
    },
    [key],
  );
  return [value, set, ready];
}

// A short stable hash of what the screen was filled from.
export function fingerprint(value: unknown): string {
  const text = JSON.stringify(value);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
