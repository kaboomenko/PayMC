"use client";

import * as React from "react";
import { Accordion as A } from "radix-ui";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Accordion = A.Root;

export function AccordionItem({ className, ...props }: React.ComponentProps<typeof A.Item>) {
  return <A.Item className={cn("border-b border-line", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof A.Trigger>) {
  return (
    <A.Header className="flex">
      <A.Trigger
        className={cn(
          "group flex flex-1 items-center justify-between gap-6 py-5 text-left text-[15px] font-medium text-fg transition-colors outline-none hover:text-white sm:text-base",
          className,
        )}
        {...props}
      >
        {children}
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line text-fg-3 transition-[transform,color,border-color] duration-200 group-hover:border-line-strong group-hover:text-fg group-data-[state=open]:rotate-45 group-data-[state=open]:text-azure-300">
          <Plus className="size-4" />
        </span>
      </A.Trigger>
    </A.Header>
  );
}

export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof A.Content>) {
  return (
    <A.Content
      className="overflow-hidden data-[state=closed]:animate-[accordion-up_0.2s_ease-out] data-[state=open]:animate-[accordion-down_0.25s_var(--ease-snappy)]"
      {...props}
    >
      <div className={cn("pr-12 pb-5 text-[15px] leading-relaxed text-fg-2", className)}>{children}</div>
    </A.Content>
  );
}
