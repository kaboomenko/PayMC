"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { PixelQr } from "./pixel-qr";
import { PixelScene } from "./pixel-scene";
import { GAME_TEXT } from "./game-viewport";

export interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  glyph: string;
  caption: string;
}

const SLOTS = 15;

function seedOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function CheckoutTile({ items }: { items: CheckoutItem[] }) {
  const [selected, setSelected] = React.useState(items[1]?.id ?? items[0]?.id);
  const [paid, setPaid] = React.useState(false);
  const timer = React.useRef<number | null>(null);
  const item = items.find((i) => i.id === selected) ?? items[0];

  React.useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const pay = () => {
    setPaid(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPaid(false), 3200);
  };

  const pick = (id: string) => {
    setSelected(id);
    setPaid(false);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative isolate flex flex-1 flex-col justify-between overflow-hidden rounded-lg border border-line">
        <PixelScene className="absolute inset-0 -z-10 h-full w-full opacity-60" />
        <div className="absolute inset-0 -z-10 bg-canvas/40" />

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-3 sm:gap-4 sm:p-4">
          {/* in-game menu */}
          <div className="min-w-0 rounded-md border border-black/60 bg-surface-3/95 p-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
            <p style={GAME_TEXT} className="mb-1.5 truncate font-mono text-[10.5px] text-fg-2">
              Донат-магазин ArcticMC
            </p>
            <div role="listbox" aria-label="Товары в игровом меню" className="grid grid-cols-5 gap-[3px]">
              {Array.from({ length: SLOTS }).map((_, i) => {
                const it = items[i];
                if (!it) return <span key={i} aria-hidden className="aspect-square bg-black/35 ring-1 ring-black/40 ring-inset" />;
                const active = it.id === selected;
                return (
                  <button
                    key={it.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    aria-label={`${it.name}, ${formatMoney(it.price)}`}
                    onClick={() => pick(it.id)}
                    className={cn(
                      "group/slot relative flex aspect-square items-center justify-center bg-black/35 ring-1 ring-black/40 transition-colors ring-inset hover:bg-white/[0.08]",
                      active && "bg-azure-500/20 ring-2 ring-ice-300",
                    )}
                  >
                    <span className="font-display text-[11px] font-semibold text-white sm:text-[12px]">{it.glyph}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 border border-azure-500/40 bg-[#0a0f1f]/95 px-2 py-1.5">
              <p style={GAME_TEXT} className="truncate font-mono text-[11px] text-ice-300">
                {item.name}
              </p>
              <p style={GAME_TEXT} className="truncate font-mono text-[10px] text-fg-3">
                {item.caption} · <span className="text-fg">{formatMoney(item.price)}</span>
              </p>
            </div>
          </div>

          {/* map item with a QR */}
          <div className="w-[118px] sm:w-[148px]">
            <div className="relative border-[3px] border-[#1b2231] bg-[#0a0d14] p-1.5 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.8)]">
              <AnimatePresence mode="wait" initial={false}>
                {paid ? (
                  <motion.div
                    key="paid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex aspect-square flex-col items-center justify-center bg-ok-soft text-center"
                  >
                    <Check className="size-6 text-ok" strokeWidth={2.5} />
                    <p className="mt-1 font-mono text-[10.5px] text-ok">оплачено</p>
                  </motion.div>
                ) : (
                  <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <PixelQr seed={seedOf(item.id)} className="block aspect-square w-full" label={`QR для оплаты ${item.name} по СБП`} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p style={GAME_TEXT} className="mt-1.5 text-center font-mono text-[10px] leading-tight text-fg-2">
              Карта · СБП <span className="text-fg nums">{formatMoney(item.price)}</span>
            </p>
          </div>
        </div>

        {/* chat input + result line */}
        <div className="space-y-px px-3 pb-3 sm:px-4 sm:pb-4">
          <AnimatePresence>
            {paid ? (
              <motion.p
                key="ok"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={GAME_TEXT}
                className="truncate bg-black/55 px-1.5 py-[2px] font-mono text-[10.5px] sm:text-[11.5px]"
              >
                <span className="text-ice-300">[ArcticMC]</span> <span className="text-fg-2">Оплата получена — {item.name} уже у вас. Спасибо!</span>
              </motion.p>
            ) : null}
          </AnimatePresence>
          <p style={GAME_TEXT} className="flex items-center bg-black/55 px-1.5 py-1 font-mono text-[10.5px] text-fg sm:text-[11.5px]">
            <span className="text-fg-4">&gt;&nbsp;</span>/donate
            <span className="ml-0.5 animate-blink text-fg-3">▌</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[12px] leading-snug text-fg-3">Игрок сканирует QR телефоном — выдача приходит, пока он ещё в игре.</p>
        <button
          type="button"
          onClick={pay}
          disabled={paid}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line-strong px-2.5 text-[12px] font-medium text-fg transition-colors hover:bg-white/[0.04] disabled:opacity-50"
        >
          <Smartphone className="size-3.5" /> Оплатить
        </button>
      </div>

      <div className="pt-4">
        <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
          {FLOW.map((f, i) => (
            <li key={f.k} className="bg-surface-2 px-3 py-2.5">
              <p className="font-mono text-[10.5px] text-fg-4 nums">0{i + 1}</p>
              <p className="mt-0.5 font-mono text-[12.5px] text-fg">{f.k}</p>
              <p className="text-[11.5px] leading-snug text-fg-3">{f.v}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const FLOW = [
  { k: "/donate", v: "меню открывается прямо на сервере" },
  { k: "QR на карте", v: "оплата по СБП с телефона" },
  { k: "0,4 с", v: "выдача, игрок не выходил из игры" },
];
