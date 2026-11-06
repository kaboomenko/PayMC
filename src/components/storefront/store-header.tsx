"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Check, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { plural, formatNumber } from "@/lib/format";
import { CopyButton } from "@/components/ui/copy-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusDot } from "@/components/ui/status-dot";
import { LogoMark } from "@/components/brand/logo";
import { StoreLogo } from "./art";
import type { StoreData } from "./types";

const NAV = [
  { href: "#shop", label: "Магазин" },
  { href: "#rules", label: "Правила" },
  { href: "#support", label: "Поддержка" },
];

export function StoreHeader({ data, preview = false }: { data: StoreData; preview?: boolean }) {
  return (
    <header
      className={cn(
        "z-30 border-b border-white/[0.06] bg-[#060912]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[#060912]/70",
        !preview && "sticky top-0",
      )}
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-5 gap-y-2.5 px-4 py-3 @3xl:h-16 @3xl:flex-nowrap @3xl:px-8 @3xl:py-0">
        <a href="#top" className="flex min-w-0 items-center gap-2.5 rounded-(--st-r-ctl) outline-offset-4">
          <StoreLogo name={data.name} size={34} />
          <span className="min-w-0">
            <span className="block truncate font-display text-[17px] leading-tight font-semibold tracking-[-0.03em] text-fg">{data.name}</span>
            <span className="flex items-center gap-1.5 text-[11.5px] leading-tight text-fg-3">
              <StatusDot tone="ok" pulse className="size-1.5" />
              <span className="font-mono text-fg-2 nums">{formatNumber(data.online)}</span>
              {plural(data.online, ["игрок", "игрока", "игроков"])} онлайн
            </span>
          </span>
        </a>

        <nav aria-label="Разделы магазина" className="order-last -mx-1 flex w-full items-center gap-1 @3xl:order-none @3xl:mx-0 @3xl:w-auto">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-(--st-r-ctl) px-2.5 py-1.5 text-[13px] font-medium text-fg-3 transition-colors hover:bg-white/[0.04] hover:text-fg"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden h-8 items-center gap-1 rounded-(--st-r-ctl) border border-white/[0.08] bg-white/[0.03] pr-0.5 pl-2.5 @md:flex">
            <span className="label-mono text-[10px] text-fg-4">IP</span>
            <span className="font-mono text-[12.5px] text-fg">{data.address}</span>
            <CopyButton value={data.address} label="Скопировать адрес сервера" className="size-7" />
          </div>
          <TrustBadge data={data} />
        </div>
      </div>
      {/* address row on narrow widths */}
      <div className="flex items-center justify-between gap-2 border-t border-white/[0.05] px-4 py-1.5 @md:hidden">
        <span className="text-[12px] text-fg-3">
          Адрес сервера <span className="font-mono text-fg">{data.address}</span>
        </span>
        <CopyButton value={data.address} label="Скопировать адрес сервера" />
      </div>
    </header>
  );
}

function TrustBadge({ data }: { data: StoreData }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-(--st-r-ctl) border border-ok/25 bg-ok-soft px-2.5 text-[12.5px] font-medium text-ok transition-colors hover:border-ok/45 data-[state=open]:border-ok/50"
        >
          <BadgeCheck className="size-4" />
          <span className="hidden @sm:inline">Проверено PayMC</span>
          <span className="@sm:hidden">Проверено</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <ShieldCheck className="size-4 text-ok" />
          <p className="text-[13px] font-semibold text-fg">Магазин проверен PayMC</p>
        </div>
        <ul className="grid gap-2.5 px-4 py-3 text-[13px]">
          <li className="flex gap-2.5">
            <Zap className="mt-0.5 size-3.5 shrink-0 text-ice-300" />
            <span className="text-fg-2">
              Средняя выдача — <span className="font-mono text-fg nums">{formatNumber(data.avgDeliveryMs / 1000, 1)} с</span> за 30 дней
            </span>
          </li>
          <li className="flex gap-2.5">
            <Check className="mt-0.5 size-3.5 shrink-0 text-ok" />
            <span className="text-fg-2">Выплаты владельцу проходят без задержек — деньги не застревают</span>
          </li>
          <li className="flex gap-2.5">
            <Check className="mt-0.5 size-3.5 shrink-0 text-ok" />
            <span className="text-fg-2">Проект прошёл проверку: реквизиты, правила магазина, команды выдачи</span>
          </li>
        </ul>
        <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-fg-3">
          Если покупка не дошла, PayMC сам повторит выдачу, а поддержка {data.name} увидит каждый шаг заказа.
        </p>
        <Link href="/" className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-xs text-fg-3 transition-colors hover:text-fg">
          <LogoMark size={14} /> Что такое PayMC
        </Link>
      </PopoverContent>
    </Popover>
  );
}
