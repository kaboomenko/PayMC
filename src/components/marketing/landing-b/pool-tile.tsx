"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, pluralize } from "@/lib/format";
import { PixelAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toaster";
import { GAME_TEXT } from "./game-viewport";

const AMOUNTS = [50, 100, 200];
const ME = "kotik228";

export function PoolTile({
  name,
  target,
  raised,
  contributors,
  endsIn,
  names,
}: {
  name: string;
  target: number;
  raised: number;
  contributors: number;
  endsIn: string;
  names: string[];
}) {
  const [amount, setAmount] = React.useState(100);
  const [mine, setMine] = React.useState<{ id: number; amount: number }[]>([]);
  const seq = React.useRef(0);

  const myTotal = mine.reduce((a, m) => a + m.amount, 0);
  const total = Math.min(target, raised + myTotal);
  const people = contributors + (mine.length ? 1 : 0);
  const reached = total >= target;
  const shown = mine.length ? [ME, ...names.filter((n) => n !== ME)] : names;
  const left = Math.max(0, target - total);

  const contribute = () => {
    if (reached) return;
    const id = ++seq.current;
    const value = Math.min(amount, left);
    setMine((m) => [...m, { id, amount: value }]);
    toast.success(`Взнос ${formatMoney(value)} принят`, {
      description: `${ME} · ${name}`,
      action: { label: "Отменить", onClick: () => setMine((m) => m.filter((x) => x.id !== id)) },
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="rounded-lg border border-line bg-surface-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] leading-snug font-medium text-fg">{name}</p>
          <span className="shrink-0 font-mono text-[11px] text-fg-3">{reached ? "собрано" : `ещё ${endsIn}`}</span>
        </div>
        <p className="mt-3 font-mono text-[13px] text-fg-2 nums" aria-live="polite">
          <span className="text-[20px] font-medium tracking-[-0.02em] text-fg">{formatMoney(total)}</span>
          <span className="text-fg-4"> из {formatMoney(target)}</span>
          <span className="text-fg-3"> · {pluralize(people, ["игрок", "игрока", "игроков"])}</span>
        </p>
        <Progress value={total} max={target} tone={reached ? "ok" : "ice"} className="mt-2.5" />

        <div className="mt-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {shown.slice(0, 7).map((n) => (
              <PixelAvatar key={n} name={n} size={22} />
            ))}
            {people > 7 ? <span className="ml-2 font-mono text-[11px] text-fg-3">+{people - 7}</span> : null}
          </div>
          <span className="flex items-center gap-1 text-[11px] text-fg-4">
            <Users className="size-3" /> взнос от 50 ₽
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <div role="radiogroup" aria-label="Сумма взноса" className="flex items-center gap-1">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={amount === a}
              disabled={reached}
              onClick={() => setAmount(a)}
              className={cn(
                "h-8 rounded-md border px-2.5 font-mono text-[12px] transition-colors disabled:opacity-50",
                amount === a ? "border-azure-400/50 bg-azure-500/12 text-azure-200" : "border-line text-fg-3 hover:border-line-strong hover:text-fg-2",
              )}
            >
              {formatMoney(a)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={contribute}
          disabled={reached}
          className="ml-auto inline-flex h-8 items-center rounded-md bg-white px-3 text-[12.5px] font-semibold text-canvas transition-colors hover:bg-azure-50 active:translate-y-px disabled:bg-ok-soft disabled:text-ok"
        >
          {reached ? "Цель собрана" : "Скинуться"}
        </button>
      </div>

      <p style={GAME_TEXT} className="mt-3 truncate rounded-md bg-[#06080c] px-2.5 py-2 font-mono text-[11px] text-fg-2">
        <span className="text-ice-300">[ArcticMC]</span>{" "}
        {reached ? (
          <span className="text-ok">Бустер ×2 собран — включится через минуту для всех!</span>
        ) : (
          <>
            {mine.length ? ME : (names[0] ?? "Игрок")} скинулся на бустер ×2 —{" "}
            <span className="text-fg nums">
              {formatMoney(total)} / {formatMoney(target)}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
