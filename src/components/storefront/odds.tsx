"use client";

import * as React from "react";
import { Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { caseOdds, type CaseOdds } from "./case-odds";

/** Drop chances as a compact table with proportional bars. */
export function CaseOddsList({ odds, className }: { odds: CaseOdds; className?: string }) {
  const max = Math.max(...odds.rewards.map((r) => r.chance));
  return (
    <div className={className}>
      <p className="text-[12px] leading-snug text-fg-3">{odds.note}</p>
      <ol className="mt-2 grid gap-px">
        {odds.rewards.map((r) => (
          <li key={r.name} className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[3px] px-1.5 py-[3px] text-[12px]">
            <span aria-hidden className="absolute inset-y-0 left-0 rounded-[3px] bg-azure-500/[0.12]" style={{ width: `${(r.chance / max) * 100}%` }} />
            <span className="relative truncate text-fg-2">{r.name}</span>
            <span className="relative font-mono text-[11.5px] text-fg nums">{formatNumber(r.chance, 1)}&nbsp;%</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 font-mono text-[10.5px] text-fg-4">Сумма — 100 %. Шансы не меняются без объявления.</p>
    </div>
  );
}

/** «Шансы» trigger for case cards: opens the published odds. */
export function CaseOddsButton({ productId, name, className }: { productId: string; name: string; className?: string }) {
  const odds = caseOdds(productId);
  if (!odds) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1 rounded-(--st-r-ctl) border border-white/[0.1] px-2 text-[12px] font-medium text-fg-2 transition-colors hover:border-white/[0.2] hover:text-fg data-[state=open]:border-(--st-accent-ring) data-[state=open]:text-fg",
            className,
          )}
        >
          <Dices className="size-3.5" /> Шансы
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(320px,calc(100vw-2rem))] p-3">
        <p className="text-[13px] font-semibold text-fg">{name} · шансы выпадения</p>
        <CaseOddsList odds={odds} className="mt-1.5" />
      </PopoverContent>
    </Popover>
  );
}
