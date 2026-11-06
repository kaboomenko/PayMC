import * as React from "react";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

/**
 * Minimal code/console block. Highlights {placeholders} in ice and
 * leading `$`/`>` prompts in muted tone. No heavy syntax highlighter.
 */
export function CodeBlock({
  code,
  title,
  className,
  copy = true,
  lang,
}: {
  code: string;
  title?: React.ReactNode;
  className?: string;
  copy?: boolean;
  lang?: string;
}) {
  const lines = code.split("\n");
  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-[#070a10]", className)}>
      {title || copy ? (
        <div className="flex h-9 items-center justify-between border-b border-line-soft pr-1 pl-3">
          <span className="label-mono text-fg-3">{title ?? lang ?? ""}</span>
          {copy ? <CopyButton value={code} /> : null}
        </div>
      ) : null}
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[12.5px] leading-[1.7] text-fg-2">
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre">
            <HighlightLine line={line} />
          </div>
        ))}
      </pre>
    </div>
  );
}

export function HighlightLine({ line }: { line: string }) {
  if (/^\s*(#\s|\/\/)/.test(line)) return <span className="text-fg-4">{line}</span>;
  const parts = line.split(/(\{[a-z_]+\}|^\s*[$>]\s)/gi);
  return (
    <>
      {parts.map((p, i) =>
        /^\{[a-z_]+\}$/i.test(p) ? (
          <span key={i} className="rounded-xs bg-ice-400/10 px-0.5 text-ice-300">
            {p}
          </span>
        ) : /^\s*[$>]\s$/.test(p) ? (
          <span key={i} className="text-fg-4 select-none">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
