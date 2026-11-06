import * as React from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/lib/format";

/** Bento tile for landing mini-demos: title + one-line explanation + a real UI fragment. */
export function Tile({
  title,
  desc,
  meta,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  desc: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <article className={cn("relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface", className)}>
      <header className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{typo(title)}</h3>
          <p className="mt-1 max-w-[46ch] text-[13px] leading-relaxed text-fg-3">{typeof desc === "string" ? typo(desc) : desc}</p>
        </div>
        {meta ? <div className="shrink-0">{meta}</div> : null}
      </header>
      <div className={cn("flex flex-1 flex-col p-5 pt-4", bodyClassName)}>{children}</div>
    </article>
  );
}
