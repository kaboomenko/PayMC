"use client";

import * as React from "react";
import { DropdownMenu as M } from "radix-ui";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuGroup = M.Group;
export const DropdownMenuSub = M.Sub;
export const DropdownMenuRadioGroup = M.RadioGroup;

const panel =
  "z-50 min-w-48 overflow-hidden rounded-lg border border-line-strong bg-surface-2 p-1 text-sm text-fg shadow-pop data-[state=open]:animate-[fade-up_0.14s_var(--ease-snappy)]";

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content sideOffset={sideOffset} className={cn(panel, className)} {...props} />
    </M.Portal>
  );
}

const item =
  "relative flex h-8 cursor-default select-none items-center gap-2 rounded-md px-2 text-[13px] text-fg-2 outline-none transition-colors data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-fg data-[disabled]:opacity-40 [&_svg]:size-4 [&_svg]:text-fg-3";

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof M.Item> & { destructive?: boolean }) {
  return (
    <M.Item
      className={cn(item, destructive && "text-bad data-[highlighted]:bg-bad-soft data-[highlighted]:text-bad [&_svg]:text-bad", className)}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: React.ComponentProps<typeof M.CheckboxItem>) {
  return (
    <M.CheckboxItem className={cn(item, "pr-8", className)} {...props}>
      {children}
      <M.ItemIndicator className="absolute right-2">
        <Check className="size-4 text-azure-400!" />
      </M.ItemIndicator>
    </M.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof M.RadioItem>) {
  return (
    <M.RadioItem className={cn(item, "pr-8", className)} {...props}>
      {children}
      <M.ItemIndicator className="absolute right-2">
        <Check className="size-4 text-azure-400!" />
      </M.ItemIndicator>
    </M.RadioItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof M.Label>) {
  return <M.Label className={cn("label-mono px-2 pt-2 pb-1 text-fg-4", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof M.Separator>) {
  return <M.Separator className={cn("-mx-1 my-1 h-px bg-line", className)} {...props} />;
}

export function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ml-auto font-mono text-[11px] text-fg-4", className)} {...props} />;
}

export function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof M.SubTrigger>) {
  return (
    <M.SubTrigger className={cn(item, "data-[state=open]:bg-white/[0.06]", className)} {...props}>
      {children}
      <ChevronRight className="ml-auto size-4" />
    </M.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof M.SubContent>) {
  return (
    <M.Portal>
      <M.SubContent className={cn(panel, className)} {...props} />
    </M.Portal>
  );
}
