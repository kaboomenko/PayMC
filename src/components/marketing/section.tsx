import * as React from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/lib/format";

const t = (node: React.ReactNode) => (typeof node === "string" ? typo(node) : node);

/**
 * Landing section wrapper: consistent rhythm, anchor offset for the fixed
 * header and a hairline divider at the top. Vary the CONTENT layout between
 * sections (full-bleed demo / dense table / one-line statement) — not this.
 */
export function Section({
  id,
  className,
  children,
  divider = true,
  bleed = false,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
  divider?: boolean;
  /** skip the page container (full-bleed content) */
  bleed?: boolean;
}) {
  return (
    <section id={id} className={cn("relative scroll-mt-20 py-24 sm:py-28 lg:py-32", divider && "border-t border-line-soft", className)}>
      {bleed ? children : <div className="container-page">{children}</div>}
    </section>
  );
}

/**
 * Section heading: mono eyebrow with an index ("01 — Доставка"), a two-tone
 * H2 (main clause in fg, second clause muted) and an optional lead paragraph.
 */
export function SectionHeading({
  index,
  eyebrow,
  title,
  muted,
  lead,
  aside,
  className,
  align = "left",
}: {
  index?: string;
  eyebrow: string;
  title: React.ReactNode;
  /** second clause of the title, rendered in muted color */
  muted?: React.ReactNode;
  lead?: React.ReactNode;
  /** right-aligned slot on wide screens (CTA, link, small stat) */
  aside?: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "mb-12 flex flex-col gap-6 lg:mb-16",
        aside && "lg:flex-row lg:items-end lg:justify-between",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <div className={cn("max-w-3xl", align === "center" && "mx-auto")}>
        <p className="label-mono flex items-center gap-2 text-azure-300">
          {index ? <span className="text-fg-4">{index}</span> : null}
          {index ? <span className="h-px w-6 bg-line-strong" aria-hidden /> : null}
          {eyebrow}
        </p>
        <h2 className="mt-5 text-h2 text-fg">
          {t(title)}
          {muted ? (
            <span className="text-fg-3">
              {typeof muted === "string" && muted.startsWith("—") ? "\u00a0" : " "}
              {t(muted)}
            </span>
          ) : null}
        </h2>
        {lead ? <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-fg-2">{t(lead)}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
