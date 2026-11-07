"use client";

import * as React from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Check, FileSpreadsheet, KeyRound, Minus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/lib/format";

type LogTone = "muted" | "fg" | "warn" | "ok";

interface Source {
  id: string;
  name: string;
  how: "API-ключ" | "Выгрузка" | "Таблица";
  hint: string;
  items: { label: string; value: string; ok: boolean }[];
  log: { t: string; text: string; tone: LogTone }[];
  /** what to do right after the import */
  next: string;
}

const ITEMS = (history: boolean, historyNote = "4 912 платежей") => [
  { label: "Товары и категории", value: "24", ok: true },
  { label: "Команды выдачи", value: "61", ok: true },
  { label: "Промокоды", value: "8", ok: true },
  { label: "Покупатели", value: "1 180", ok: true },
  { label: "Привилегии с остатком срока", value: "312", ok: true },
  { label: "История платежей", value: history ? historyNote : "нет в файле", ok: history },
];

const SOURCES: Source[] = [
  {
    id: "easydonate",
    name: "EasyDonate",
    how: "API-ключ",
    hint: "Ключ из настроек магазина. Доступ только на чтение — старый магазин продолжает работать.",
    items: ITEMS(true),
    log: [
      { t: "0:00", text: "Подключение по API-ключу · только чтение", tone: "muted" },
      { t: "0:03", text: "Найдено 24 товара · 61 команда · 8 промокодов · 1 180 покупателей", tone: "fg" },
      { t: "0:41", text: "Команды сопоставлены: 58 автоматически, 3 — проверить вручную", tone: "warn" },
      { t: "2:56", text: "История: 4 912 платежей за 14 месяцев", tone: "fg" },
      { t: "3:48", text: "Привилегии с остатком срока перенесены: 312", tone: "fg" },
      { t: "4:12", text: "Готово за 4 мин 12 с", tone: "ok" },
    ],
    next: "Дальше: проверить 3 команды и подключить сервер",
  },
  {
    id: "trademc",
    name: "TradeMC",
    how: "API-ключ",
    hint: "ID магазина и ключ из панели. Доступ только на чтение.",
    items: ITEMS(true),
    log: [
      { t: "0:00", text: "Подключение по API-ключу · только чтение", tone: "muted" },
      { t: "0:02", text: "Найдено 24 товара · 61 команда · 8 промокодов · 1 180 покупателей", tone: "fg" },
      { t: "0:37", text: "Команды сопоставлены: 59 автоматически, 2 — проверить вручную", tone: "warn" },
      { t: "2:31", text: "История: 4 912 платежей за 14 месяцев", tone: "fg" },
      { t: "3:20", text: "Привилегии с остатком срока перенесены: 312", tone: "fg" },
      { t: "3:44", text: "Готово за 3 мин 44 с", tone: "ok" },
    ],
    next: "Дальше: проверить 2 команды и подключить сервер",
  },
  {
    id: "gamestores",
    name: "GameStores",
    how: "Выгрузка",
    hint: "Файл экспорта из панели магазина. Загрузите его — остальное сделаем сами.",
    items: ITEMS(true, "за 12 месяцев"),
    log: [
      { t: "0:00", text: "Файл выгрузки прочитан · 2,1 МБ", tone: "muted" },
      { t: "0:04", text: "Найдено 24 товара · 61 команда · 8 промокодов · 1 180 покупателей", tone: "fg" },
      { t: "0:52", text: "Команды сопоставлены: 57 автоматически, 4 — проверить вручную", tone: "warn" },
      { t: "2:05", text: "История: 4 120 платежей за 12 месяцев", tone: "fg" },
      { t: "2:40", text: "Привилегии с остатком срока перенесены: 312", tone: "fg" },
      { t: "2:58", text: "Готово за 2 мин 58 с", tone: "ok" },
    ],
    next: "Дальше: проверить 4 команды и подключить сервер",
  },
  {
    id: "tebex",
    name: "Tebex",
    how: "API-ключ",
    hint: "Секретный ключ из настроек вебстора. Пакеты станут товарами, купоны — промокодами.",
    items: ITEMS(true),
    log: [
      { t: "0:00", text: "Подключение по API-ключу · только чтение", tone: "muted" },
      { t: "0:03", text: "Найдено 24 пакета · 61 команда · 8 купонов · 1 180 покупателей", tone: "fg" },
      { t: "0:29", text: "Переменные: {username} → {player} в 61 команде", tone: "fg" },
      { t: "0:44", text: "Команды сопоставлены: 58 автоматически, 3 — проверить вручную", tone: "warn" },
      { t: "3:51", text: "Привилегии с остатком срока перенесены: 312", tone: "fg" },
      { t: "4:20", text: "Готово за 4 мин 20 с", tone: "ok" },
    ],
    next: "Дальше: проверить 3 команды и подключить сервер",
  },
  {
    id: "csv",
    name: "CSV-файл",
    how: "Таблица",
    hint: "Наш шаблон: товар, цена, команды, срок. Подойдёт выгрузка из любой самописной системы.",
    items: ITEMS(false),
    log: [
      { t: "0:00", text: "Файл прочитан · 1 204 строки, 9 колонок", tone: "muted" },
      { t: "0:01", text: "Найдено 24 товара · 61 команда · 8 промокодов · 1 180 покупателей", tone: "fg" },
      { t: "0:18", text: "Команды сопоставлены: 55 автоматически, 6 — проверить вручную", tone: "warn" },
      { t: "0:46", text: "Привилегии с остатком срока перенесены: 312", tone: "fg" },
      { t: "1:05", text: "Готово за 1 мин 05 с", tone: "ok" },
    ],
    next: "Дальше: проверить 6 команд и подключить сервер",
  },
];

const HOW_ICON = { "API-ключ": KeyRound, Выгрузка: Upload, Таблица: FileSpreadsheet } as const;

export function MigrateDemo({ className }: { className?: string }) {
  const [sourceId, setSourceId] = React.useState(SOURCES[0].id);
  const source = SOURCES.find((s) => s.id === sourceId) ?? SOURCES[0];
  const HowIcon = HOW_ICON[source.how];
  const listRef = React.useRef<HTMLDivElement>(null);

  const onKey = (e: React.KeyboardEvent) => {
    const idx = SOURCES.findIndex((s) => s.id === sourceId);
    let next = idx;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (idx + 1) % SOURCES.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (idx - 1 + SOURCES.length) % SOURCES.length;
    else return;
    e.preventDefault();
    setSourceId(SOURCES[next].id);
    listRef.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[next]?.focus();
  };

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)]", className)}>
      <div className="grid sm:grid-cols-[190px_minmax(0,1fr)]">
        <div
          ref={listRef}
          role="radiogroup"
          aria-label="Откуда переезжаете"
          onKeyDown={onKey}
          className="border-b border-line-soft p-1.5 sm:border-r sm:border-b-0"
        >
          <p className="label-mono px-2.5 pt-1.5 pb-2 text-fg-4">Откуда</p>
          {SOURCES.map((s) => {
            const active = s.id === sourceId;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setSourceId(s.id)}
                className={cn(
                  "relative flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors duration-150",
                  active ? "bg-white/[0.06] text-fg" : "text-fg-3 hover:bg-white/[0.03] hover:text-fg-2",
                )}
              >
                {active ? <span aria-hidden className="absolute inset-y-2 left-0 w-[2px] rounded-r-full bg-azure-400" /> : null}
                <span className="truncate">{s.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-fg-4">{s.how}</span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          <p className="flex items-center gap-2 text-[13px] text-fg">
            <HowIcon className="size-3.5 text-fg-3" />
            {source.how === "API-ключ" ? "Подключение по API-ключу" : source.how === "Выгрузка" ? "Файл выгрузки" : "CSV по шаблону"}
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-fg-3">{typo(source.hint)}</p>
          <ul className="mt-4 space-y-1.5">
            {source.items.map((it) => (
              <li key={it.label} className="flex items-center gap-2 text-[12.5px]">
                {it.ok ? <Check className="size-3.5 shrink-0 text-ok" /> : <Minus className="size-3.5 shrink-0 text-fg-4" />}
                <span className={cn("min-w-0 flex-1 truncate", it.ok ? "text-fg-2" : "text-fg-4")}>{it.label}</span>
                <span className={cn("shrink-0 font-mono text-[11px] nums", it.ok ? "text-fg-3" : "text-fg-4")}>{it.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ImportLog key={source.id} source={source} />
    </div>
  );
}

const STEP_MS = 420;

function ImportLog({ source }: { source: Source }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const [shown, setShown] = React.useState(0);
  const total = source.log.length;

  React.useEffect(() => {
    if (!inView) return;
    const timers: number[] = [];
    source.log.forEach((_, i) => {
      timers.push(window.setTimeout(() => setShown(i + 1), reduce ? 0 : 180 + i * STEP_MS));
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [inView, reduce, source]);

  const done = shown >= total;
  return (
    <div ref={ref} className="flex-1 border-t border-line bg-[#06080c]">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-5">
        <p className="label-mono text-fg-4">
          Журнал импорта <span className="text-fg-3">· {source.name}</span>
        </p>
        <p className={cn("font-mono text-[11px] nums", done ? "text-ok" : "text-ice-300")}>
          {done ? "готово" : shown === 0 ? "ожидание" : `${shown} / ${total}`}
        </p>
      </div>
      <div className="mx-4 mt-2.5 h-px bg-white/[0.06] sm:mx-5">
        <div
          className={cn("h-px w-full origin-left transition-transform duration-200 ease-[var(--ease-snappy)]", done ? "bg-ok" : "bg-ice-400")}
          style={{ transform: `scaleX(${shown / total})` }}
        />
      </div>
      <ol className="min-h-[188px] space-y-1 px-4 py-3 font-mono text-[12px] leading-[1.6] sm:px-5" aria-live="polite">
        {source.log.slice(0, shown).map((l) => (
          <motion.li
            key={l.t + l.text}
            initial={reduce ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-[38px_minmax(0,1fr)] gap-2"
          >
            <span className="text-fg-4 nums">{l.t}</span>
            <span
              className={cn(
                l.tone === "muted" && "text-fg-3",
                l.tone === "fg" && "text-fg-2",
                l.tone === "warn" && "text-warn",
                l.tone === "ok" && "text-ok",
              )}
            >
              {l.text}
            </span>
          </motion.li>
        ))}
        {!done ? (
          <li className="grid grid-cols-[38px_minmax(0,1fr)] gap-2 text-fg-4">
            <span />
            <span className="animate-blink">▌</span>
          </li>
        ) : (
          <motion.li
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="grid grid-cols-[38px_minmax(0,1fr)] gap-2 pt-2"
          >
            <span className="text-fg-4">→</span>
            <span className="text-azure-300">{source.next}</span>
          </motion.li>
        )}
      </ol>
    </div>
  );
}
