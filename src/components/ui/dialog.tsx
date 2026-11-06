"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  children,
  hideClose,
  ...props
}: React.ComponentProps<typeof D.Content> & { hideClose?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-[2px] data-[state=open]:animate-[fade-up_0.2s_ease-out]" />
      <D.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line-strong bg-surface shadow-pop outline-none",
          "data-[state=open]:animate-[fade-up_0.22s_var(--ease-snappy)]",
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <D.Close
            aria-label="Закрыть"
            className="absolute top-3.5 right-3.5 rounded-sm p-1 text-fg-3 transition-colors hover:bg-white/5 hover:text-fg"
          >
            <X className="size-4" />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-5 pb-3", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof D.Title>) {
  return <D.Title className={cn("pr-8 text-base font-semibold tracking-[-0.01em]", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof D.Description>) {
  return <D.Description className={cn("mt-1 text-sm text-fg-3", className)} {...props} />;
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-end gap-2 border-t border-line-soft bg-surface-2/50 px-5 py-3 rounded-b-xl", className)}
      {...props}
    />
  );
}
