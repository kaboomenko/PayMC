"use client";

import * as React from "react";

/**
 * Updates one query param without a server round-trip. Next.js syncs native
 * history calls with useSearchParams/usePathname, so links and back/forward
 * keep working. `null` removes the param.
 */
export function setUrlParam(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

/**
 * Tab state mirrored to `?{param}=`. The server passes the initial value from
 * awaited searchParams; if it changes (e.g. a Link to ?tab=team while the page
 * is mounted) we adopt it during render instead of in an effect.
 */
export function useUrlTab<T extends string>(param: string, initial: T, allowed: readonly T[]) {
  const [tab, setTab] = React.useState<T>(initial);
  const [seen, setSeen] = React.useState<T>(initial);
  if (seen !== initial) {
    setSeen(initial);
    setTab(initial);
  }
  const change = React.useCallback(
    (value: string) => {
      if (!(allowed as readonly string[]).includes(value)) return;
      setTab(value as T);
      setUrlParam(param, value);
    },
    [allowed, param],
  );
  return [tab, change] as const;
}

/** Boolean flag mirrored to the URL (e.g. ?payout=1 opens a dialog). */
export function useUrlFlag(param: string, initial: boolean) {
  const [open, setOpen] = React.useState(initial);
  const [seen, setSeen] = React.useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setOpen(initial);
  }
  const change = React.useCallback(
    (value: boolean) => {
      setOpen(value);
      setUrlParam(param, value ? "1" : null);
    },
    [param],
  );
  return [open, change] as const;
}
