"use client";

import * as React from "react";

/**
 * Nickname remembered per store in localStorage. useSyncExternalStore keeps
 * SSR/hydration stable ("" on the server) and survives blocked storage
 * (private mode) thanks to the in-memory fallback.
 */
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(key: string) {
  if (memory.has(key)) return memory.get(key) ?? "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function useRememberedNick(key: string): [string, (v: string) => void] {
  const value = React.useSyncExternalStore(
    subscribe,
    () => read(key),
    () => "",
  );
  const set = React.useCallback(
    (v: string) => {
      memory.set(key, v);
      try {
        window.localStorage.setItem(key, v);
      } catch {
        /* storage can be unavailable — the in-memory value still works */
      }
      emit();
    },
    [key],
  );
  return [value, set];
}

export const NICK_RE = /^[A-Za-z0-9_]{3,16}$/;

export function nickError(nick: string) {
  if (!nick) return "Укажите ник — покупка придёт этому игроку";
  if (!NICK_RE.test(nick)) return "3–16 символов: латиница, цифры и _";
  return null;
}
