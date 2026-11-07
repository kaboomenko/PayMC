"use client";

import * as React from "react";
import { Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, pluralize } from "@/lib/format";
import { Switch } from "@/components/ui/switch";

export function SubscriptionTile({ price, subscribers, nextCharge }: { price: number; subscribers: number; nextCharge: string }) {
  const [auto, setAuto] = React.useState(true);
  return (
    <div className="flex flex-1 flex-col">
      <div className="rounded-lg border border-line bg-surface-2">
        <div className="flex items-center justify-between gap-3 border-b border-line-soft px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-fg">Frost+</p>
            <p className="text-[11.5px] text-fg-3">ArcticMC · подписка</p>
          </div>
          <p className="shrink-0 font-mono text-[18px] font-medium tracking-[-0.02em] text-fg nums">
            {formatMoney(price)}
            <span className="text-[12px] tracking-normal text-fg-3">/мес</span>
          </p>
        </div>
        <dl className="space-y-1.5 px-3.5 py-3 text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-fg-3">Списание</dt>
            <dd className={cn("font-mono nums", auto ? "text-fg-2" : "text-fg-4 line-through")}>{nextCharge}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-fg-3">Способ</dt>
            <dd className="text-fg-2">СБП · привязка к банку</dd>
          </div>
        </dl>
        <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-line-soft px-3.5 py-2.5 text-[12.5px] text-fg-2">
          <span className="flex items-center gap-1.5">
            <Repeat className="size-3.5 text-fg-3" /> Автопродление
          </span>
          <Switch size="sm" checked={auto} onCheckedChange={setAuto} aria-label="Автопродление Frost+" />
        </label>
      </div>
      <p className="mt-3 text-[12px] leading-snug text-fg-3" aria-live="polite">
        {auto ? (
          <>
            Оформили за 30 дней: <span className="font-mono text-fg-2 nums">{pluralize(subscribers, ["игрок", "игрока", "игроков"])}</span>
          </>
        ) : (
          <>Отменено в один клик. Frost+ работает до {nextCharge}, дальше без списаний.</>
        )}
      </p>
    </div>
  );
}
