import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PayMC logomark — an isometric block with a coin slot on its top face:
 * "a game block you can pay into". Works at 16px+.
 */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cn("shrink-0", className)} aria-hidden>
      <path d="M12 1.6 21.2 6.9 12 12.2 2.8 6.9 12 1.6Z" fill="#edf1f8" />
      <path d="M2.8 6.9 12 12.2v10.2L2.8 17.1V6.9Z" fill="#3377ff" />
      <path d="M21.2 6.9 12 12.2v10.2l9.2-5.3V6.9Z" fill="#1b4cc4" />
      <path d="M9.1 5.6 14.9 8.2" stroke="#0a0d14" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, size = 22, wordmark = true }: { className?: string; size?: number; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <LogoMark size={size} />
      {wordmark ? (
        <span className="text-[17px] font-semibold tracking-[-0.03em] leading-none">
          Pay<span className="text-azure-300">MC</span>
        </span>
      ) : null}
    </span>
  );
}
