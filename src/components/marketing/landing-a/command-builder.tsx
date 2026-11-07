"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CornerDownRight, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime, pluralize } from "@/lib/format";
import { NOW_MS } from "@/lib/mock/now";
import { Segmented } from "@/components/ui/segmented";
import { CopyButton } from "@/components/ui/copy-button";
import { COMMAND_LIBRARY, VARIABLES, pluginsFor, templatesFor, type CommandTemplate } from "@/lib/command-library";
import type { GameId } from "@/lib/mock/types";

type DemoGame = "minecraft" | "rust" | "ark" | "gta5";

const GAME_OPTIONS: { value: DemoGame; label: string; player: string; runtime: string }[] = [
  { value: "minecraft", label: "Minecraft", player: "kotik228", runtime: "Paper 1.21.4" },
  { value: "rust", label: "Rust", player: "d1ma", runtime: "Oxide 2.0" },
  { value: "ark", label: "ARK", player: "Survivor_Kirill", runtime: "ArkApi · RCON" },
  { value: "gta5", label: "GTA V RP", player: "Ivan_Petrov", runtime: "RAGE:MP 1.1" },
];

/** Example values that match the sample console output in the library. */
const AMOUNT: Record<string, string> = {
  "playerpoints.give": "1000",
  "vault.eco.give": "10000",
  "excellentcrates.key.give": "3",
  "crazycrates.give": "3",
  "cmi.money": "10000",
  "rust.giveto": "2",
  "rust.economics": "5000",
  "rust.serverrewards": "500",
  "arkshop.addpoints": "1500",
  "gta.money": "50000",
};
const CUSTOM: Record<string, string> = { "luckperms.meta.setprefix": "ICE", "gta.vehicle": "sultan" };

function exampleFor(key: string, t: CommandTemplate, player: string) {
  switch (key) {
    case "{player}":
      return player;
    case "{uuid}":
      return "1f3a8c2e-7d41-4b9a-9c0e-5d2b7a61c9e2";
    case "{steamid}":
      return "76561198012345678";
    case "{eosid}":
      return "0002a1f9c3e84b7d";
    case "{staticid}":
      return "1042";
    case "{days}":
      return "30";
    case "{amount}":
      return AMOUNT[t.id] ?? "1";
    case "{custom}":
      return CUSTOM[t.id] ?? "ICE";
    default:
      return key;
  }
}

const VAR_RE = /(\{[a-z_]+\})/gi;

const TOTAL_GAMES = new Set(COMMAND_LIBRARY.map((t) => t.game)).size;

export function CommandBuilder({ className }: { className?: string }) {
  const [game, setGame] = React.useState<DemoGame>("minecraft");
  const [plugin, setPlugin] = React.useState(() => pluginsFor("minecraft")[0]);
  const [actionId, setActionId] = React.useState(() => templatesFor("minecraft")[0].id);

  const meta = GAME_OPTIONS.find((g) => g.value === game)!;
  const plugins = pluginsFor(game as GameId);
  const actions = templatesFor(game as GameId).filter((t) => t.plugin === plugin);
  const action = actions.find((t) => t.id === actionId) ?? actions[0];
  const usedVars = [...new Set(action.template.match(VAR_RE) ?? [])];

  const changeGame = (g: DemoGame) => {
    const first = pluginsFor(g)[0];
    setGame(g);
    setPlugin(first);
    setActionId(templatesFor(g).find((t) => t.plugin === first)!.id);
  };
  const changePlugin = (p: string) => {
    setPlugin(p);
    setActionId(templatesFor(game).find((t) => t.plugin === p)!.id);
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)]", className)}>
      {/* game + plugins */}
      <div className="space-y-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <fieldset className="scrollbar-none -mx-1 min-w-0 overflow-x-auto px-1">
            <legend className="sr-only">Игра</legend>
            <Segmented value={game} onChange={changeGame} options={GAME_OPTIONS.map((g) => ({ value: g.value, label: g.label }))} />
          </fieldset>
          <p className="font-mono text-[11px] text-fg-4 nums">
            {pluralize(COMMAND_LIBRARY.length, ["шаблон", "шаблона", "шаблонов"])} · {pluralize(TOTAL_GAMES, ["игра", "игры", "игр"])}
          </p>
        </div>
        <div role="radiogroup" aria-label="Плагин" className="flex flex-wrap gap-1.5">
          {plugins.map((p) => {
            const active = p === plugin;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => changePlugin(p)}
                className={cn(
                  "h-7 rounded-md border px-2.5 font-mono text-[11.5px] transition-colors duration-150",
                  active
                    ? "border-azure-400/50 bg-azure-500/12 text-azure-200"
                    : "border-line text-fg-3 hover:border-line-strong hover:text-fg-2",
                )}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-[230px_minmax(0,1fr)]">
        {/* actions */}
        <div role="radiogroup" aria-label="Что выдать" className="border-b border-line-soft p-1.5 md:border-r md:border-b-0">
          <p className="label-mono px-2.5 pt-3.5 pb-2 text-fg-4">Что выдать</p>
          {actions.map((t) => {
            const active = t.id === action.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setActionId(t.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors duration-150",
                  active ? "bg-white/[0.06] text-fg" : "text-fg-3 hover:bg-white/[0.03] hover:text-fg-2",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded-full border",
                    active ? "border-azure-400 bg-azure-500/20" : "border-line-strong",
                  )}
                >
                  {active ? <span className="size-1.5 rounded-full bg-azure-300" /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                {t.danger ? <AlertTriangle aria-label="Опасная команда" className="size-3.5 shrink-0 text-warn" /> : null}
              </button>
            );
          })}
        </div>

        {/* result */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0 space-y-4 p-4 sm:p-5"
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="label-mono text-fg-4">Шаблон в товаре</p>
                <CopyButton value={action.template} label="Скопировать шаблон команды" className="-my-1 size-6" />
              </div>
              <p className="mt-1.5 font-mono text-[13px] leading-relaxed break-words text-fg">
                {action.template.split(VAR_RE).map((part, i) =>
                  /^\{[a-z_]+\}$/i.test(part) ? (
                    <span key={i} className="rounded-xs bg-ice-400/10 px-0.5 whitespace-nowrap text-ice-300 ring-1 ring-ice-400/20 ring-inset">
                      {part}
                    </span>
                  ) : (
                    <React.Fragment key={i}>{part}</React.Fragment>
                  ),
                )}
              </p>
              <p className="mt-2 text-[12.5px] text-fg-3">{action.description}</p>
            </div>

            {usedVars.length ? (
              <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
                {usedVars.map((v) => {
                  const info = VARIABLES.find((x) => x.key === v);
                  return (
                    <div key={v} className="flex items-baseline gap-1.5">
                      <dt className="font-mono text-ice-300">{v}</dt>
                      <dd className="text-fg-3">
                        {info?.label ?? "переменная"} <span className="font-mono text-fg-4">· {exampleFor(v, action, meta.player)}</span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            ) : null}

            <div className="overflow-hidden rounded-lg border border-line bg-[#06080c]">
              <p className="label-mono flex items-center justify-between border-b border-line-soft px-3 py-2 text-fg-4">
                <span>Консоль сервера</span>
                <span className="font-mono normal-case tracking-normal">{meta.runtime}</span>
              </p>
              <div className="space-y-1 px-3 py-2.5 font-mono text-[12px] leading-[1.6]">
                <p className="break-words text-fg-2">
                  <span className="text-fg-4 select-none">&gt; </span>
                  {action.template.split(VAR_RE).map((part, i) =>
                    /^\{[a-z_]+\}$/i.test(part) ? (
                      <span key={i} className="text-ice-200 underline decoration-ice-400/40 decoration-dotted underline-offset-[3px]">
                        {exampleFor(part, action, meta.player)}
                      </span>
                    ) : (
                      <React.Fragment key={i}>{part}</React.Fragment>
                    ),
                  )}
                </p>
                <p className="flex items-start gap-1.5 text-ice-300/90">
                  <CornerDownRight aria-hidden className="mt-[3px] size-3 shrink-0 text-fg-4" />
                  <span className="min-w-0 break-words">
                    <span className="text-fg-4">[{formatTime(NOW_MS + 1000, true)} INFO] </span>
                    {action.output}
                  </span>
                </p>
              </div>
            </div>

            {action.danger ? (
              <p className="flex items-start gap-2 rounded-md border border-warn/25 bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {action.danger}
              </p>
            ) : action.requireOnline ? (
              <p className="flex items-start gap-2 text-[12.5px] text-fg-3">
                <UserRound className="mt-0.5 size-3.5 shrink-0 text-fg-4" />
                Нужен игрок онлайн. Если он не в сети, команда подождёт в очереди и выполнится при входе.
              </p>
            ) : (
              <p className="flex items-start gap-2 text-[12.5px] text-fg-3">
                <UserRound className="mt-0.5 size-3.5 shrink-0 text-fg-4" />
                Сработает, даже если игрок не в сети.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
