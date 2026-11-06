"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Renders children at a fixed CSS width (e.g. 1280 or 390) and scales them
 * down to the frame width. Storefront components use container queries, so
 * the scaled preview shows the real desktop/mobile layout.
 */
export function ScaledFrame({
  width,
  height,
  className,
  children,
  label,
}: {
  width: number;
  height: number;
  className?: string;
  children: React.ReactNode;
  label: string;
}) {
  const outerRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState<number | null>(null);
  const [innerH, setInnerH] = React.useState(0);

  React.useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const ro = new ResizeObserver(() => {
      setScale(Math.min(1, outer.clientWidth / width));
      setInnerH(inner.offsetHeight);
    });
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div
      ref={outerRef}
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn("relative overflow-x-hidden overflow-y-auto overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-azure-400/60", className)}
      style={{ height }}
    >
      {scale === null ? <div className="skeleton absolute inset-3 rounded-lg" aria-hidden /> : null}
      <div style={{ height: scale ? innerH * scale : height }}>
        <div
          ref={innerRef}
          className={cn("origin-top-left", scale === null && "invisible")}
          style={{ width, transform: `scale(${scale ?? 1})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
