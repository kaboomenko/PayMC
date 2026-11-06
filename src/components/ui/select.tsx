"use client";

import * as React from "react";
import { Select as S } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = S.Root;
export const SelectGroup = S.Group;
export const SelectValue = S.Value;

export function SelectTrigger({
  className,
  children,
  size = "md",
  ...props
}: React.ComponentProps<typeof S.Trigger> & { size?: "sm" | "md" }) {
  return (
    <S.Trigger
      className={cn(
        "inline-flex w-full items-center justify-between gap-2 rounded-md border border-line bg-surface-2 px-3 text-sm text-fg outline-none transition-colors hover:border-line-strong focus-visible:border-azure-500/70 data-[placeholder]:text-fg-4 [&>span]:truncate",
        size === "sm" ? "h-8 text-[13px]" : "h-9",
        className,
      )}
      {...props}
    >
      {children}
      <S.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-fg-3" />
      </S.Icon>
    </S.Trigger>
  );
}

export function SelectContent({ className, children, position = "popper", ...props }: React.ComponentProps<typeof S.Content>) {
  return (
    <S.Portal>
      <S.Content
        position={position}
        sideOffset={6}
        className={cn(
          "z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line-strong bg-surface-2 shadow-pop data-[state=open]:animate-[fade-up_0.14s_var(--ease-snappy)]",
          className,
        )}
        {...props}
      >
        <S.Viewport className="p-1">{children}</S.Viewport>
      </S.Content>
    </S.Portal>
  );
}

export function SelectItem({ className, children, ...props }: React.ComponentProps<typeof S.Item>) {
  return (
    <S.Item
      className={cn(
        "relative flex h-8 cursor-default select-none items-center gap-2 rounded-md pr-8 pl-2 text-[13px] text-fg-2 outline-none data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-fg data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      <S.ItemText>{children}</S.ItemText>
      <S.ItemIndicator className="absolute right-2">
        <Check className="size-4 text-azure-400" />
      </S.ItemIndicator>
    </S.Item>
  );
}

export function SelectLabel({ className, ...props }: React.ComponentProps<typeof S.Label>) {
  return <S.Label className={cn("label-mono px-2 pt-2 pb-1 text-fg-4", className)} {...props} />;
}

export function SelectSeparator({ className, ...props }: React.ComponentProps<typeof S.Separator>) {
  return <S.Separator className={cn("-mx-1 my-1 h-px bg-line", className)} {...props} />;
}
