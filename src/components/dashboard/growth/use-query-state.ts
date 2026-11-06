"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A single query-string key as UI state (?new=1, ?creator=cr-frost).
 * Writes go through history.replaceState — Next syncs useSearchParams with it,
 * so opening a dialog never triggers a server round-trip, yet the URL stays shareable.
 */
export function useQueryState(key: string) {
  const params = useSearchParams();
  const pathname = usePathname();
  const value = params.get(key);

  const setValue = React.useCallback(
    (next: string | null, extra?: Record<string, string | null>) => {
      const sp = new URLSearchParams(window.location.search);
      if (next === null) sp.delete(key);
      else sp.set(key, next);
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          if (v === null) sp.delete(k);
          else sp.set(k, v);
        }
      }
      const qs = sp.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [key, pathname],
  );

  return [value, setValue] as const;
}

/** True when the user is typing — used to ignore single-key shortcuts. */
export function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

/** Single-key page shortcut (e.g. "n" → new campaign) that stays quiet while typing or inside dialogs. */
export function useHotkey(key: string, handler: () => void) {
  const ref = React.useRef(handler);
  React.useEffect(() => {
    ref.current = handler;
  });
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector("[role=dialog]")) return;
      if (e.key.toLowerCase() === key) {
        e.preventDefault();
        ref.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key]);
}
