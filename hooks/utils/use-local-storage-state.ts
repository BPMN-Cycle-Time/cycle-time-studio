"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * Persists boolean state to localStorage under `key`. Starts from `defaultValue`
 * on initial render to prevent SSR/hydration mismatch.
 */
export function useLocalStorageState(key: string, defaultValue: boolean) {
  const getSnapshot = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) return raw === "1";
    } catch {
      // ignore
    }
    return defaultValue;
  }, [key, defaultValue]);

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (newValue: boolean | ((prev: boolean) => boolean)) => {
      try {
        const current = getSnapshot();
        const next = typeof newValue === "function" ? newValue(current) : newValue;
        window.localStorage.setItem(key, next ? "1" : "0");
        window.dispatchEvent(new StorageEvent("storage", { key }));
      } catch {
        // ignore
      }
    },
    [key, getSnapshot],
  );

  return [value, setValue] as const;
}
