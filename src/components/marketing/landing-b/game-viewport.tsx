"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { PixelScene } from "./pixel-scene";
import type { ChatTone, GrowthScenario, Seg } from "./growth-scenarios";

/** Minecraft-like text: hard 1px drop shadow, no blur. */
export const GAME_TEXT: React.CSSProperties = { textShadow: "1px 1px 0 rgb(0 0 0 / 0.65)" };

const TONE: Record<ChatTone, string> = {
  prefix: "text-ice-300",
  name: "text-fg",
  text: "text-fg-2",
  link: "text-ice-300 underline decoration-ice-400/50 underline-offset-2",
  accent: "text-azure-200",
  ok: "text-ok",
  join: "text-warn",
  muted: "text-fg-4",
};

export function Segs({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map(([t, tone = "text"], i) => (
        <span key={i} className={TONE[tone]}>
          {t}
        </span>
      ))}
    </>
  );
}

const ease = [0.22, 1, 0.36, 1] as const;

export function GameViewport({
  scenario,
  cursor,
  online,
  className,
}: {
  scenario: GrowthScenario;
  cursor: number;
  online: number;
  className?: string;
}) {
  const done = cursor >= scenario.purchaseAt;
  const bossbar = scenario.bossbar && cursor >= scenario.bossbar.at ? (done ? scenario.bossbar.done : scenario.bossbar) : null;
  const title = scenario.title && cursor >= scenario.title.at ? (done ? scenario.title.done : scenario.title) : null;
  const push = scenario.push && cursor >= scenario.push.at && cursor < scenario.push.until ? scenario.push : null;
  const lines = scenario.chat.filter((l) => l.at <= cursor);
  const rows = done ? scenario.board.done : scenario.board.rows;
  const board: [string, string][] = [rows[0], ["Онлайн", formatNumber(online)], ...rows.slice(1)];

  return (
    <div
      className={cn(
        "relative isolate aspect-[4/3] w-full overflow-hidden rounded-lg border border-line bg-canvas select-none sm:aspect-[16/10]",
        className,
      )}
      role="img"
      aria-label={`Экран игры: сценарий «${scenario.tab}»`}
    >
      <PixelScene className="absolute inset-0 -z-10 h-full w-full" />

      {/* bossbar */}
      <div className="absolute inset-x-0 top-[5%] flex flex-col items-center px-3">
        <AnimatePresence mode="wait">
          {bossbar ? (
            <motion.div
              key={bossbar.text}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease }}
              className="flex w-full max-w-[520px] flex-col items-center"
            >
              <p
                style={GAME_TEXT}
                className={cn("text-center font-mono text-[9.5px] leading-tight sm:text-[12px]", done ? "text-ok" : "text-white")}
              >
                {bossbar.text}
              </p>
              <div className="relative mt-1 h-[5px] w-[78%] overflow-hidden bg-black/60 ring-1 ring-black/60 sm:h-[6px]">
                <motion.div
                  className={cn("h-full", done ? "bg-ok" : "bg-ice-400")}
                  initial={false}
                  animate={{ width: `${bossbar.value * 100}%` }}
                  transition={{ duration: 0.6, ease }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    backgroundImage: "repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), rgb(0 0 0 / 0.55) calc(10% - 1px) 10%)",
                  }}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* push from Telegram (outside the game) */}
      <AnimatePresence>
        {push ? (
          <motion.div
            key="push"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.25, ease }}
            className="absolute top-[18%] right-2 z-10 w-[min(78%,300px)] rounded-lg border border-line-strong bg-surface-3/95 p-2.5 shadow-pop sm:top-[11%] sm:right-3"
          >
            <p className="flex items-center gap-1.5 text-[10px] text-fg-3 sm:text-[11px]">
              <Send className="size-3 text-azure-300" />
              {push.from}
              <span className="ml-auto font-mono text-fg-4">сейчас</span>
            </p>
            <p className="mt-1 text-[11px] leading-snug text-fg sm:text-[12.5px]">{push.text}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* title */}
      <div className="pointer-events-none absolute inset-x-0 top-[27%] flex flex-col items-center px-4 text-center sm:top-[25%]">
        <AnimatePresence mode="wait">
          {title ? (
            <motion.div
              key={title.title}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease }}
            >
              <p style={{ textShadow: "2px 2px 0 rgb(0 0 0 / 0.55)" }} className="font-display text-[22px] leading-none font-semibold tracking-[-0.02em] text-white sm:text-[40px]">
                {title.title}
              </p>
              <p style={GAME_TEXT} className="mt-1.5 font-mono text-[10px] sm:mt-2.5 sm:text-[13px]">
                <Segs segs={title.sub} />
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* crosshair */}
      <span aria-hidden className="absolute top-1/2 left-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-white/60" />
      <span aria-hidden className="absolute top-1/2 left-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-white/60" />

      {/* sidebar scoreboard */}
      <div className="absolute top-1/2 right-2 hidden w-[172px] -translate-y-1/2 bg-black/40 px-2.5 py-2 font-mono text-[10.5px] leading-[1.55] sm:block">
        <p style={GAME_TEXT} className="mb-1 text-center font-semibold text-ice-300">
          ArcticMC
        </p>
        {board.map(([k, v]) => (
          <p key={k} style={GAME_TEXT} className="flex justify-between gap-2">
            <span className="text-fg-3">{k}</span>
            <motion.span key={v} initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} className={cn("whitespace-nowrap text-fg", done && k !== "Режим" && k !== "Онлайн" && k !== "Сезон" && "text-ok")}>
              {v}
            </motion.span>
          </p>
        ))}
        <p style={GAME_TEXT} className="mt-1 text-center text-[9.5px] text-fg-4">
          play.arcticmc.ru
        </p>
      </div>

      {/* chat */}
      <div className="absolute bottom-[13%] left-2 flex w-[min(94%,560px)] flex-col items-start gap-px sm:bottom-[14%] sm:left-3 sm:w-[62%]">
        <AnimatePresence initial={false}>
          {lines.map((l) => (
            <motion.p
              key={`${scenario.id}-${scenario.chat.indexOf(l)}`}
              layout="position"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease }}
              style={GAME_TEXT}
              className="max-w-full bg-black/50 px-1.5 py-[2px] font-mono text-[9.5px] leading-[1.4] sm:text-[12px]"
            >
              <Segs segs={l.segs} />
            </motion.p>
          ))}
        </AnimatePresence>
      </div>

      {/* hotbar */}
      <div aria-hidden className="absolute bottom-[3%] left-1/2 flex -translate-x-1/2 gap-px bg-black/50 p-px ring-1 ring-black/60">
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "relative flex size-[18px] items-center justify-center bg-white/[0.04] sm:size-[26px]",
              i === 0 && "ring-2 ring-white/80 ring-inset",
            )}
          >
            {HOTBAR[i] ? <span className="size-[8px] sm:size-[12px]" style={{ background: HOTBAR[i] }} /> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

const HOTBAR = ["#b2bccd", "#5c98ff", "#7c889d", "#22b8f0", "#c9d4e6", null, null, "#3377ff", null];
