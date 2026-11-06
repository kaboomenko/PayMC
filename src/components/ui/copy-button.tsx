"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ value, className, label = "Скопировать" }: { value: string; className?: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* clipboard can be unavailable (insecure context) — still show feedback */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-sm text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg",
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
    </button>
  );
}
