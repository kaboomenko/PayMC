"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Right-side drawer for record details (orders, players, products). */
export const Sheet = D.Root;
export const SheetTrigger = D.Trigger;
export const SheetClose = D.Close;

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof D.Content> & { side?: "right" | "left" }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-canvas/60 data-[state=open]:animate-[fade-in_0.15s_var(--ease-snappy)]" />
      <D.Content
        className={cn(
          "fixed top-0 bottom-0 z-50 flex w-full max-w-[560px] flex-col border-line-strong bg-surface shadow-pop outline-none",
          side === "right"
            ? "right-0 border-l data-[state=open]:animate-[sheet-in-right_0.28s_var(--ease-snappy)]"
            : "left-0 border-r data-[state=open]:animate-[sheet-in-left_0.28s_var(--ease-snappy)]",
          className,
        )}
        {...props}
      >
        {children}
        <D.Close
          aria-label="Закрыть"
          className="absolute top-4 right-4 rounded-sm p-1 text-fg-3 transition-colors hover:bg-white/5 hover:text-fg"
        >
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-line px-6 pt-5 pb-4", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.ComponentProps<typeof D.Title>) {
  return <D.Title className={cn("pr-8 text-base font-medium", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: React.ComponentProps<typeof D.Description>) {
  return <D.Description className={cn("mt-1 text-[13px] text-fg-3", className)} {...props} />;
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto px-6 py-5", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 border-t border-line px-6 py-3", className)} {...props} />;
}
