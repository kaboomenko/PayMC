"use client";

import * as React from "react";
import { animate, useReducedMotion } from "motion/react";
import { formatMoney, formatNumber } from "@/lib/format";

const FORMATTERS = {
  money: (n: number) => formatMoney(n),
  /** "+28 000 ₽" */
  signedMoney: (n: number) => `${n > 0.5 ? "+" : ""}${formatMoney(n)}`,
  number: (n: number) => formatNumber(n),
} as const;

/**
 * Animated number. React renders the first value (SSR-stable); later changes
 * tween the text directly on the DOM node — no re-render per frame.
 */
export function CountUp({
  value,
  format = "money",
  duration = 0.45,
  className,
}: {
  value: number;
  format?: keyof typeof FORMATTERS;
  duration?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const shown = React.useRef(value);
  const reduce = useReducedMotion();
  const [initial] = React.useState(() => FORMATTERS[format](value));

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = FORMATTERS[format];
    const from = shown.current;
    if (reduce || from === value) {
      shown.current = value;
      el.textContent = fmt(value);
      return;
    }
    const controls = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = fmt(v);
      },
    });
    return () => controls.stop();
  }, [value, format, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {initial}
    </span>
  );
}
