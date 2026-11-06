"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface-3 !border !border-line-strong !text-fg !rounded-lg !shadow-pop !font-sans !text-[13px] !gap-2.5",
          description: "!text-fg-3 !text-xs",
          actionButton: "!bg-azure-500 !text-white !rounded-md !text-xs !font-medium",
          cancelButton: "!bg-surface-4 !text-fg-2 !rounded-md !text-xs",
          success: "[&_[data-icon]]:!text-ok",
          error: "[&_[data-icon]]:!text-bad",
          warning: "[&_[data-icon]]:!text-warn",
          info: "[&_[data-icon]]:!text-azure-400",
        },
      }}
    />
  );
}

export { toast } from "sonner";
