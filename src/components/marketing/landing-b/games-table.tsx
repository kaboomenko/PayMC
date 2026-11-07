"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_LIST } from "@/lib/games";
import { GameChip } from "@/components/dashboard/game-chip";
import { CodeBlock } from "@/components/ui/code-block";
import { GAME_INSTALL } from "./games-data";

type Filter = "all" | "agent" | "rcon";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "agent", label: "Плагин или мод" },
  { value: "rcon", label: "RCON" },
];

export function GamesTable() {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [open, setOpen] = React.useState<string | null>("minecraft");
  const reduce = useReducedMotion();

  const rows = GAME_LIST.filter((g) => filter === "all" || GAME_INSTALL[g.id].via.includes(filter));
  const count = (f: Filter) => GAME_LIST.filter((g) => f === "all" || GAME_INSTALL[g.id].via.includes(f)).length;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5 sm:px-4">
        <div role="radiogroup" aria-label="Способ подключения" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] transition-colors",
                filter === f.value ? "border-azure-400/50 bg-azure-500/12 text-azure-200" : "border-line text-fg-3 hover:border-line-strong hover:text-fg-2",
              )}
            >
              {f.label}
              <span className="font-mono text-[11px] text-fg-4 nums">{count(f.value)}</span>
            </button>
          ))}
        </div>
        <p className="hidden text-[12px] text-fg-4 sm:block">Нажмите на строку — покажем, что вводить на сервере</p>
      </div>

      <table className="w-full table-fixed border-collapse text-[13px]">
        <colgroup>
          <col className="w-[46%] sm:w-[30%] lg:w-[21%]" />
          <col className="hidden lg:table-column lg:w-[33%]" />
          <col className="hidden sm:table-column sm:w-[36%] lg:w-[22%]" />
          <col className="w-[30%] sm:w-[14%] lg:w-[11%]" />
          <col className="w-[24%] sm:w-[20%] lg:w-[13%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-line text-left label-mono text-fg-3">
            <th className="h-9 pl-3 font-medium sm:pl-4">Игра</th>
            <th className="hidden h-9 px-3 font-medium lg:table-cell">Как подключается</th>
            <th className="hidden h-9 px-3 font-medium sm:table-cell">Платформы</th>
            <th className="h-9 px-2 font-medium sm:px-3">ID игрока</th>
            <th className="h-9 pr-3 text-right font-medium sm:pr-4">Статус</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => {
            const isOpen = open === g.id;
            const inst = GAME_INSTALL[g.id];
            return (
              <React.Fragment key={g.id}>
                <tr
                  className={cn("cursor-pointer border-b border-line-soft transition-colors hover:bg-white/[0.025]", isOpen && "bg-white/[0.025]")}
                  onClick={() => setOpen(isOpen ? null : g.id)}
                >
                  <td className="h-12 pl-3 sm:pl-4">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`game-${g.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(isOpen ? null : g.id);
                      }}
                      className="flex w-full min-w-0 items-center gap-2.5 rounded-sm text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure-400"
                    >
                      <GameChip game={g.id} size={24} />
                      <span className="truncate font-medium text-fg">{g.name}</span>
                      <ChevronDown className={cn("ml-auto size-3.5 shrink-0 text-fg-4 transition-transform duration-200", isOpen && "rotate-180 text-fg-2")} />
                    </button>
                  </td>
                  <td className="hidden px-3 lg:table-cell">
                    <span className="line-clamp-2 text-[12.5px] leading-snug text-fg-3">{g.integration}</span>
                  </td>
                  <td className="hidden px-3 sm:table-cell">
                    <span className="flex flex-wrap gap-1 py-2">
                      {g.platforms.slice(0, 4).map((p) => (
                        <span key={p} className="rounded-xs bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-fg-2 ring-1 ring-line ring-inset">
                          {p}
                        </span>
                      ))}
                      {g.platforms.length > 4 ? <span className="px-1 py-0.5 font-mono text-[11px] text-fg-4">+{g.platforms.length - 4}</span> : null}
                    </span>
                  </td>
                  <td className="truncate px-2 font-mono text-[11.5px] text-fg-2 sm:px-3">{g.idLabel}</td>
                  <td className="pr-3 text-right sm:pr-4">
                    <span
                      className={cn(
                        "inline-flex h-5 items-center gap-1.5 rounded-sm px-1.5 text-[11px] font-medium ring-1 ring-inset",
                        g.status === "ready" ? "bg-ok-soft text-ok ring-ok/20" : "bg-ice-400/10 text-ice-300 ring-ice-400/20",
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {g.status === "ready" ? "Готово" : "Бета"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="p-0">
                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div
                          id={`game-${g.id}`}
                          initial={reduce ? false : { opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden border-b border-line-soft bg-surface-2/50"
                        >
                          <div className="grid gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-6">
                            <div className="min-w-0 space-y-2 text-[12.5px] leading-relaxed">
                              <p className="text-fg-2 lg:hidden">{g.integration}</p>
                              <p className="flex flex-wrap gap-1 sm:hidden">
                                {g.platforms.map((p) => (
                                  <span key={p} className="rounded-xs bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-fg-2 ring-1 ring-line ring-inset">
                                    {p}
                                  </span>
                                ))}
                              </p>
                              <p className="text-fg-3">
                                Игрок офлайн — команда ждёт входа. Сервер выключен — очередь выполнится при запуске.
                              </p>
                              {g.rules ? <p className="rounded-md border border-warn/20 bg-warn-soft px-2.5 py-1.5 text-fg-2">{g.rules}</p> : null}
                            </div>
                            <CodeBlock code={inst.snippet} title={inst.title} className="min-w-0" />
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="px-4 py-10 text-center text-[13px] text-fg-3">Под этот фильтр игр нет.</p> : null}
    </div>
  );
}
