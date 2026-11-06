"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ShieldAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { GameChip } from "@/components/dashboard/game-chip";
import type { GameId } from "@/lib/mock/types";

interface RuleCase {
  id: string;
  chip: string;
  game: GameId;
  product: string;
  perks: string[];
  /** index of the perk that breaks the rules */
  bad: number;
  issue: string;
  fix: string;
  fixedPerks: string[];
  level: "warn" | "risk";
}

const CASES: RuleCase[] = [
  {
    id: "mc",
    chip: "Minecraft · EULA",
    game: "minecraft",
    product: "Привилегия Frost",
    perks: ["Префикс [Frost]", "Питомец «Песец»", "/fly на выживании"],
    bad: 2,
    issue: "Даёт /fly — правила коммерческого использования Minecraft запрещают продавать игровое преимущество.",
    fix: "Оставить префикс и питомца, /fly убрать",
    fixedPerks: ["Префикс [Frost]", "Питомец «Песец»", "Частицы «Снегопад»"],
    level: "warn",
  },
  {
    id: "rust",
    chip: "Rust · Facepunch",
    game: "rust",
    product: "Набор VIP до вайпа",
    perks: ["Очередь без ожидания", "Цветной ник", "AK-47 и броня в наборе"],
    bad: 2,
    issue: "Оружие в наборе — Facepunch ограничивает продажу боевого преимущества на серверах с официальным статусом.",
    fix: "Заменить оружие на скины",
    fixedPerks: ["Очередь без ожидания", "Цветной ник", "Скины на оружие"],
    level: "warn",
  },
  {
    id: "dayz",
    chip: "DayZ · нужно одобрение",
    game: "dayz",
    product: "Стартовый набор выжившего",
    perks: ["Рюкзак и фляга", "Точка спавна на выбор", "Ускоренный респаун"],
    bad: -1,
    issue: "Монетизация серверов DayZ — только после одобрения Bohemia Interactive. Без него магазин не запустится.",
    fix: "Сначала заявка в Bohemia — шаблон письма уже в кабинете",
    fixedPerks: ["Рюкзак и фляга", "Точка спавна на выбор", "Ускоренный респаун"],
    level: "warn",
  },
  {
    id: "fivem",
    chip: "FiveM · только Tebex",
    game: "gta5",
    product: "Сервер на FiveM",
    perks: ["Стартовый капитал", "VIP на 30 дней", "Слот под авто"],
    bad: -1,
    issue: "Правила Cfx.re: серверы на FiveM продают только через Tebex. Сторонний магазин — риск блокировки сервера.",
    fix: "Для GTA V RP подключайте RAGE:MP или alt:V — ресурс PayMC готов",
    fixedPerks: ["Стартовый капитал", "VIP на 30 дней", "Слот под авто"],
    level: "risk",
  },
];

export function RulesCheck() {
  const [id, setId] = React.useState(CASES[0].id);
  const [fixed, setFixed] = React.useState<Record<string, boolean>>({});
  const c = CASES.find((x) => x.id === id) ?? CASES[0];
  const isFixed = Boolean(fixed[c.id]);
  const canFix = c.bad >= 0;
  const perks = isFixed ? c.fixedPerks : c.perks;

  const apply = () => {
    setFixed((f) => ({ ...f, [c.id]: true }));
    toast.success("Описание товара обновлено", {
      description: c.fix,
      action: { label: "Отменить", onClick: () => setFixed((f) => ({ ...f, [c.id]: false })) },
    });
  };

  return (
    <div className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="label-mono text-fg-3">Проверка товара</p>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-fg-4">
          <GameChip game={c.game} size={18} />
          перед публикацией
        </span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={c.id + String(isFixed)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="p-4"
        >
          <p className="text-[14px] font-medium text-fg">{c.product}</p>
          <ul className="mt-2 space-y-1">
            {perks.map((p, i) => {
              const bad = !isFixed && i === c.bad;
              return (
                <li key={p} className={cn("flex items-center gap-2 text-[12.5px]", bad ? "text-warn" : "text-fg-2")}>
                  {bad ? <TriangleAlert className="size-3.5 shrink-0" /> : <Check className="size-3.5 shrink-0 text-fg-4" />}
                  <span className={cn(bad && "underline decoration-warn/50 decoration-wavy underline-offset-4")}>{p}</span>
                </li>
              );
            })}
          </ul>

          {isFixed ? (
            <p className="mt-3 flex items-start gap-2 rounded-md bg-ok-soft px-3 py-2 text-[12.5px] leading-snug text-ok">
              <Check className="mt-px size-3.5 shrink-0" /> Нарушений нет — товар можно публиковать.
            </p>
          ) : (
            <div
              className={cn(
                "mt-3 rounded-md border px-3 py-2.5",
                c.level === "risk" ? "border-bad/25 bg-bad-soft" : "border-warn/25 bg-warn-soft",
              )}
            >
              <p className={cn("flex items-start gap-2 text-[12.5px] leading-snug", c.level === "risk" ? "text-bad" : "text-warn")}>
                <ShieldAlert className="mt-px size-3.5 shrink-0" />
                <span className="text-fg-2">{c.issue}</span>
              </p>
              <p className="mt-2 pl-[22px] text-[12.5px] leading-snug text-fg">
                <span className="text-fg-3">Предложение: </span>
                {c.fix}
              </p>
              {canFix ? (
                <div className="mt-2.5 flex gap-2 pl-[22px]">
                  <button
                    type="button"
                    onClick={apply}
                    className="inline-flex h-7 items-center rounded-md bg-white px-2.5 text-[12px] font-semibold text-canvas transition-colors hover:bg-azure-50"
                  >
                    Применить
                  </button>
                  <span className="inline-flex h-7 items-center text-[11.5px] text-fg-4">одно нажатие — описание и команды обновятся</span>
                </div>
              ) : null}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <div role="radiogroup" aria-label="Правила игр" className="flex flex-wrap gap-1.5 border-t border-line-soft px-4 py-3">
        {CASES.map((x) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={x.id === id}
            onClick={() => setId(x.id)}
            className={cn(
              "h-7 rounded-md border px-2.5 text-[12px] transition-colors",
              x.id === id ? "border-azure-400/50 bg-azure-500/12 text-azure-200" : "border-line text-fg-3 hover:border-line-strong hover:text-fg-2",
            )}
          >
            {x.chip}
          </button>
        ))}
      </div>
    </div>
  );
}
