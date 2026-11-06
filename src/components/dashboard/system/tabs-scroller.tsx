"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal scroller for a tab bar on narrow screens. Keeps the active tab
 * (Radix sets data-state="active") centred on mount and on every change, and
 * fades the edge that hides more tabs, so the bar never looks like it ends.
 */
export function TabsScroller({ active, children, className }: { active: string; children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ left: false, right: false });

  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tab = el.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
    if (tab && el.scrollWidth > el.clientWidth) {
      // scroll the bar itself, never the page
      const target = tab.offsetLeft - (el.clientWidth - tab.offsetWidth) / 2;
      el.scrollTo({ left: Math.max(0, target), behavior: "auto" });
    }
    measure();
  }, [active, measure]);

  React.useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const mask =
    edges.left && edges.right
      ? "[mask-image:linear-gradient(to_right,transparent,black_28px,black_calc(100%_-_28px),transparent)]"
      : edges.right
        ? "[mask-image:linear-gradient(to_right,black_calc(100%_-_28px),transparent)]"
        : edges.left
          ? "[mask-image:linear-gradient(to_right,transparent,black_28px)]"
          : "";

  return (
    <div ref={ref} onScroll={measure} className={cn("-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0", mask, className)}>
      {children}
    </div>
  );
}
