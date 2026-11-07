"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

export interface DiffPair {
  /** a short scope shown as a hunk comment, e.g. "выдача" */
  scope: string;
  /** removed line; wrap the key phrase in **…** for an intra-line highlight */
  before: string;
  /** added line; wrap the key phrase in **…** for an intra-line highlight */
  after: string;
}

/** Splits "text **key** text" into plain / emphasised segments. */
function segments(line: string) {
  return line.split("**").map((text, i) => ({ text, em: i % 2 === 1 }));
}

/**
 * A unified-diff block: old/new line numbers, −/+ gutters, intra-line
 * highlights. Lines reveal on scroll with a short stagger (≤ 600 ms total).
 */
export function DiffBlock({ pairs, file = "donate.config", className }: { pairs: DiffPair[]; file?: string; className?: string }) {
  const reduce = useReducedMotion();
  const lineCount = pairs.length * 2;
  // 14 lines × 28 ms + 180 ms ≈ 570 ms for the whole block
  const stagger = Math.min(0.028, 0.42 / Math.max(1, lineCount));

  const list: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : stagger, delayChildren: reduce ? 0 : 0.05 } },
  };
  const row: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border border-line-strong bg-[#070a10] shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)]",
        className,
      )}
    >
      <figcaption className="flex h-10 items-center gap-3 border-b border-line px-3.5">
        <span className="font-mono text-[12.5px] text-fg">{file}</span>
        <span className="label-mono text-fg-4">было → стало</span>
        <span className="ml-auto flex items-center gap-2 font-mono text-[11.5px] nums">
          <span className="text-ok">+{pairs.length}</span>
          <span className="text-bad">−{pairs.length}</span>
        </span>
      </figcaption>

      <div className="border-b border-line-soft bg-azure-500/[0.06] px-3.5 py-1.5 font-mono text-[11.5px] text-azure-300/80">
        @@ -1,{pairs.length} +1,{pairs.length} @@ <span className="text-fg-3">донат на сервере</span>
      </div>

      <motion.ol
        variants={list}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="py-1.5 font-mono text-[12.5px] leading-[1.6]"
        aria-label="Что меняется"
      >
        {pairs.map((p, i) => (
          <React.Fragment key={p.scope}>
            <DiffLine variants={row} kind="del" n={i + 1} text={p.before} scope={p.scope} />
            <DiffLine variants={row} kind="add" n={i + 1} text={p.after} />
          </React.Fragment>
        ))}
      </motion.ol>
    </figure>
  );
}

function DiffLine({ kind, n, text, scope, variants }: { kind: "add" | "del"; n: number; text: string; scope?: string; variants: Variants }) {
  const add = kind === "add";
  return (
    <motion.li
      variants={variants}
      className={cn(
        "relative grid grid-cols-[22px_minmax(0,1fr)] sm:grid-cols-[30px_30px_22px_minmax(0,1fr)]",
        add ? "bg-ok/[0.07]" : "bg-bad/[0.07]",
        add && "mb-1.5 last:mb-0",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[2px]", add ? "bg-ok/60" : "bg-bad/50")} />
      <span aria-hidden className="hidden pr-2 text-right text-fg-4 select-none nums sm:block">{add ? "" : n}</span>
      <span aria-hidden className="hidden pr-2 text-right text-fg-4 select-none nums sm:block">{add ? n : ""}</span>
      <span aria-hidden className={cn("pl-2 select-none sm:pl-0", add ? "text-ok" : "text-bad")}>{add ? "+" : "−"}</span>
      <span className={cn("py-[3px] pr-3.5", add ? "text-fg" : "text-fg-3")}>
        <span className="sr-only">{add ? "Стало: " : "Было: "}</span>
        {segments(text).map((s, i) =>
          s.em ? (
            <mark key={i} className={cn("rounded-[3px] px-0.5 text-inherit box-decoration-clone", add ? "bg-ok/20 text-fg" : "bg-bad/20 text-fg-2")}>
              {s.text}
            </mark>
          ) : (
            <React.Fragment key={i}>{s.text}</React.Fragment>
          ),
        )}
        {scope && !add ? <span className="ml-2 hidden whitespace-nowrap text-fg-4 select-none sm:inline">{"// " + scope}</span> : null}
      </span>
    </motion.li>
  );
}
