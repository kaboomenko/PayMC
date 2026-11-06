"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { NAV_FLAT } from "@/components/dashboard/nav";

/** The slice of the Navigation API we use (Chromium; Safari/Firefox may not have it). */
interface NavigateEventLike extends Event {
  navigationType: "push" | "replace" | "reload" | "traverse";
  destination: { key: string };
}
interface NavigationLike extends EventTarget {
  currentEntry?: { index: number } | null;
  traverseTo: (key: string) => unknown;
}
const navigationApi = () => (window as unknown as { navigation?: NavigationLike }).navigation;

/**
 * Keeps unsaved edits from being dropped silently. While `active`:
 * - closing or reloading the tab → the browser's own prompt (beforeunload);
 * - in-app links (sidebar, breadcrumbs, «← Товары») and the «g + клавиша» hotkeys → `onBlocked(proceed)`;
 * - browser Back/Forward inside the app → cancelled, then `onBlocked(proceed)`.
 * `proceed()` finishes the navigation the user started. Click/key listeners are capture-phase on window,
 * so they run before Next's Link handler and the shell hotkeys.
 */
export function useLeaveGuard(active: boolean, onBlocked: (proceed: () => void) => void) {
  const router = useRouter();
  const onBlockedRef = React.useRef(onBlocked);
  React.useEffect(() => {
    onBlockedRef.current = onBlocked;
  });

  React.useEffect(() => {
    if (!active) return;
    let bypass = false;
    const ask = (proceed: () => void) =>
      onBlockedRef.current(() => {
        bypass = true;
        proceed();
      });

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!bypass) e.preventDefault();
    };

    const onClick = (e: MouseEvent) => {
      if (bypass || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // same page (an in-page #anchor) is not leaving
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      ask(() => router.push(`${url.pathname}${url.search}${url.hash}`));
    };

    // the shell's «g + key» jump: own the whole sequence while guarded, so the shell never half-sees it
    let gAt = 0;
    const onKeyDown = (e: KeyboardEvent) => {
      if (bypass || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const key = e.key.toLowerCase();
      if (key === "g" || key === "п") {
        gAt = performance.now();
        e.stopPropagation();
        return;
      }
      if (!gAt) return;
      const fresh = performance.now() - gAt < 1200;
      gAt = 0;
      const item = fresh ? NAV_FLAT.find((i) => i.key === key) : undefined;
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      ask(() => router.push(item.href));
    };

    // Back/Forward. With the Navigation API the traversal is cancelled before anything moves: by the time
    // `popstate` fires, React's transition machinery may already be rendering the previous page.
    const nav = navigationApi();
    const onNavigate = (event: Event) => {
      const e = event as NavigateEventLike;
      if (bypass || e.navigationType !== "traverse" || !e.cancelable) return;
      e.preventDefault();
      const key = e.destination.key;
      ask(() => nav?.traverseTo(key));
    };
    // Fallback without the Navigation API: put the URL back before the router reacts, then ask.
    let restoring = false;
    const onPopState = (e: PopStateEvent) => {
      if (bypass) return;
      e.stopImmediatePropagation();
      if (restoring) {
        restoring = false;
        return;
      }
      restoring = true;
      window.history.go(1);
      ask(() => window.history.go(-1));
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKeyDown, true);
    if (nav) nav.addEventListener("navigate", onNavigate);
    else window.addEventListener("popstate", onPopState, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKeyDown, true);
      if (nav) nav.removeEventListener("navigate", onNavigate);
      else window.removeEventListener("popstate", onPopState, true);
    };
  }, [active, router]);
}
