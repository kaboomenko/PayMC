"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber, pluralize } from "@/lib/format";
import { PanelHeader } from "./bits";
import type { GoalData } from "./types";

const SHADOW = "1px 1px 0 #3a3a3a";

export function GoalCard({ goal }: { goal: GoalData | null }) {
  const [onStore, setOnStore] = React.useState(true);
  const [bossbar, setBossbar] = React.useState(true);
  const [chat, setChat] = React.useState(true);

  if (!goal) {
    return (
      <Card className="flex flex-col p-5">
        <p className="text-sm font-medium text-fg">Цель месяца не задана</p>
        <p className="mt-1 text-[13px] text-fg-3">Например, «Оплата хостинга — 12 000 ₽». Игроки охотнее донатят, когда видят, на что.</p>
        <Link href="/dashboard/storefront" className="mt-3 text-[13px] text-azure-300 hover:text-azure-200">
          Задать цель →
        </Link>
      </Card>
    );
  }

  const pct = Math.min(100, Math.round((goal.raised / goal.target) * 100));
  const left = Math.max(0, goal.target - goal.raised);

  const toggleStore = (v: boolean) => {
    setOnStore(v);
    toast(v ? "Цель снова на витрине" : "Цель скрыта с витрины", {
      description: "shop.arcticmc.ru обновится в течение минуты",
      action: { label: "Отменить", onClick: () => setOnStore(!v) },
    });
  };
  const toggleBossbar = (v: boolean) => {
    setBossbar(v);
    toast(v ? `Боссбар включён на ${pluralize(goal.servers, ["сервере", "серверах", "серверах"])}` : "Боссбар убран из игры", {
      description: v ? "Игроки увидят его при следующем входе" : "Команда bossbar remove отправлена агентам",
      action: { label: "Отменить", onClick: () => setBossbar(!v) },
    });
  };

  const toggleChat = (v: boolean) => {
    setChat(v);
    toast(v ? "Строка в чате включена" : "Строка в чате выключена", {
      description: v ? "После каждой покупки — одна строка, не чаще раза в минуту" : "Боссбар и витрина продолжают показывать цель",
      action: { label: "Отменить", onClick: () => setChat(!v) },
    });
  };

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader
        title="Цель месяца"
        meta={<span className="font-mono text-[11px] text-ice-300 nums">{pct} %</span>}
        actions={
          <Link href="/dashboard/storefront" aria-label="Настроить цель на витрине" className="rounded-sm text-fg-4 transition-colors hover:text-fg">
            <ArrowRight className="size-3.5" />
          </Link>
        }
      />
      <div className="px-4 pt-3.5 sm:px-5">
        <p className="text-[13px] leading-snug text-fg-2">{goal.title}</p>
        <p className="mt-2.5 font-mono text-[22px] leading-none font-semibold tracking-[-0.03em] text-fg nums">
          {formatMoney(goal.raised)}
          <span className="text-[13px] font-normal tracking-normal text-fg-4"> из {formatMoney(goal.target)}</span>
        </p>
        <Progress value={goal.raised} max={goal.target} tone="ice" className="mt-3" />
        <p className="mt-2 text-xs text-fg-3">
          Осталось собрать <span className="font-mono text-fg nums">{formatMoney(left)}</span> —{" "}
          <span className="font-mono nums">≈ {formatNumber(goal.perDay)} ₽</span> в день до конца ноября
        </p>
      </div>

      {/* in-game preview: bossbar at the top of the screen, chat line bottom-left — as players see it */}
      <div className="mx-4 mt-4 flex flex-1 flex-col sm:mx-5">
        <div className="relative min-h-[112px] flex-1 overflow-hidden rounded-md border border-line bg-canvas">
          <div aria-hidden className="absolute inset-0 bg-grid-sm opacity-70" />
          <div className={cn("relative flex flex-col items-center px-3 pt-2.5 transition-opacity duration-200", !bossbar && "opacity-0")}>
            <p className="max-w-full truncate font-mono text-[11px] leading-none font-medium text-white" style={{ textShadow: SHADOW }}>
              {goal.shortTitle} — {pct} %
            </p>
            <div className="relative mt-1.5 h-[5px] w-full max-w-[200px] bg-azure-950 ring-1 ring-black/60">
              <div className="h-full bg-azure-400" style={{ width: `${pct}%` }} />
              {/* NOTCHED_10 — the vanilla bossbar style */}
              <div className="absolute inset-0 flex justify-between px-[10%]">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="h-full w-px bg-black/50" />
                ))}
              </div>
            </div>
          </div>
          <div className={cn("absolute right-2 bottom-2 left-2 space-y-px font-mono text-[10.5px] leading-[1.45] transition-opacity duration-200", !chat && "opacity-0")}>
            <p className="w-fit max-w-full truncate bg-black/50 px-1 text-white/75" style={{ textShadow: SHADOW }}>
              &lt;kotik228&gt; го докинем
            </p>
            <p className="w-fit max-w-full truncate bg-black/50 px-1 text-white" style={{ textShadow: SHADOW }}>
              <span className="text-ice-300">[Цель]</span> {goal.lastSupporter} помог · /donate
            </p>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-fg-4">
          {bossbar || chat ? "Так игроки видят цель на сервере" : "В игре цель сейчас не видна"}
        </p>
      </div>

      <div className="mt-3 space-y-px border-t border-line-soft px-2 py-2 sm:px-3">
        <label className="flex h-9 cursor-pointer items-center justify-between gap-3 rounded-md px-2 text-[13px] text-fg-2 transition-colors hover:bg-white/[0.03]">
          Показывать на витрине
          <Switch checked={onStore} onCheckedChange={toggleStore} aria-label="Показывать цель на витрине" />
        </label>
        <label className="flex h-9 cursor-pointer items-center justify-between gap-3 rounded-md px-2 text-[13px] text-fg-2 transition-colors hover:bg-white/[0.03]">
          Боссбар в игре
          <Switch checked={bossbar} onCheckedChange={toggleBossbar} aria-label="Показывать боссбар в игре" />
        </label>
        <label className="flex h-9 cursor-pointer items-center justify-between gap-3 rounded-md px-2 text-[13px] text-fg-2 transition-colors hover:bg-white/[0.03]">
          Строка в чате
          <Switch checked={chat} onCheckedChange={toggleChat} aria-label="Писать в чат о взносах в цель" />
        </label>
      </div>
    </Card>
  );
}
