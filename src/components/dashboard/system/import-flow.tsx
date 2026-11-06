"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleAlert, FileUp, KeyRound, Loader2, RotateCcw, Upload, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber, pluralize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { Note } from "./settings-ui";
import type { ImportCommandRow, ImportData } from "./settings-types";

type SourceId = "easydonate" | "trademc" | "gamestores" | "tebex" | "csv";

const SOURCES: { id: SourceId; name: string; how: "api" | "file"; what: string; note?: string; keyHint?: string }[] = [
  { id: "easydonate", name: "EasyDonate", how: "api", what: "Товары, команды, промокоды, покупатели", keyHint: "Кабинет EasyDonate → Настройки → API → «Ключ магазина»" },
  { id: "trademc", name: "TradeMC", how: "api", what: "Товары, команды, покупатели", keyHint: "Кабинет TradeMC → Магазин → Интеграция → API-ключ" },
  { id: "gamestores", name: "GameStores", how: "api", what: "Товары, команды, промокоды", keyHint: "Панель GameStores → Настройки → Ключ API" },
  { id: "tebex", name: "Tebex", how: "api", what: "Пакеты, команды, покупатели", note: "Не принимает российские карты — после переезда игроки платят по СБП", keyHint: "Tebex → Integrations → API Keys → Secret key" },
  { id: "csv", name: "CSV-файл", how: "file", what: "Любая платформа: товары и покупатели" },
];

const FIX: Record<string, string> = { "{sum}": "{amount}", "{prefix}": "{custom}", "{nick}": "{player}", "{user}": "{player}" };

type Step = "source" | "connect" | "loading" | "mapping" | "importing" | "done";

export function ImportFlow({ data }: { data: ImportData }) {
  const [step, setStep] = React.useState<Step>("source");
  const [source, setSource] = React.useState<SourceId>("easydonate");
  const [key, setKey] = React.useState("");
  const [file, setFile] = React.useState<string | null>(null);
  const [tried, setTried] = React.useState(false);
  const [matches, setMatches] = React.useState<Record<string, string>>(() => Object.fromEntries(data.products.map((p) => [p.theirs, p.match])));
  const [commands, setCommands] = React.useState<ImportCommandRow[]>(data.commands);
  const [progress, setProgress] = React.useState(0);
  const [log, setLog] = React.useState<string[]>([]);
  const src = SOURCES.find((s) => s.id === source)!;
  const unresolved = commands.reduce((a, c) => a + c.unknown.length, 0);

  const keyError = src.how === "api" ? (key.trim().length < 16 ? "Ключ слишком короткий — скопируйте его целиком" : null) : !file ? "Выберите файл выгрузки" : null;

  const lines = React.useMemo(
    () => [
      `→ ${src.how === "api" ? `Подключение к ${src.name} API` : "Чтение файла"}… ok (212 мс)`,
      `→ Товары: ${data.totals.products} · ${Object.values(matches).filter((m) => m !== "new").length} сопоставлены с существующими, остальные созданы`,
      `→ Команды: ${data.totals.commands} · {user} → {player} (27 замен), {count} → {amount} (3)`,
      `→ Промокоды: ${data.totals.promos} · истёкший SUMMER20 пропущен`,
      `→ Покупатели: ${formatNumber(data.totals.buyers)} · история заказов за 2 года`,
      `→ Активные привилегии: ${data.totals.activeRanks} · сроки сохранены, выдавать заново не нужно`,
      "→ Проверка команд на тестовом игроке PayMC_Test… 31 из 31 ok",
      "✓ Готово за 4,6 с",
    ],
    [data.totals, matches, src],
  );

  // import animation — timers only run after the user presses «Импортировать»
  React.useEffect(() => {
    if (step !== "importing") return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setLog(lines.slice(0, i));
      setProgress(Math.min(100, Math.round((i / lines.length) * 100)));
      if (i >= lines.length) {
        window.clearInterval(id);
        window.setTimeout(() => setStep("done"), 500);
      }
    }, 560);
    return () => window.clearInterval(id);
  }, [step, lines]);

  React.useEffect(() => {
    if (step !== "loading") return;
    const id = window.setTimeout(() => setStep("mapping"), 1200);
    return () => window.clearTimeout(id);
  }, [step]);

  function fixCommand(i: number) {
    setCommands((list) =>
      list.map((c, idx) => {
        if (idx !== i) return c;
        let converted = c.converted;
        for (const u of c.unknown) if (FIX[u]) converted = converted.replaceAll(u, FIX[u]);
        return { ...c, converted, unknown: c.unknown.filter((u) => !FIX[u]) };
      }),
    );
  }

  function reset() {
    setStep("source");
    setKey("");
    setFile(null);
    setTried(false);
    setProgress(0);
    setLog([]);
    setCommands(data.commands);
  }

  const STEPS: { id: Step[]; label: string }[] = [
    { id: ["source"], label: "Откуда" },
    { id: ["connect", "loading"], label: "Подключение" },
    { id: ["mapping"], label: "Сопоставление" },
    { id: ["importing", "done"], label: "Импорт" },
  ];
  const stepIdx = STEPS.findIndex((s) => s.id.includes(step));

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-surface shadow-raise">
        <header className="flex flex-col gap-4 border-b border-line-soft px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-fg">Переезд с другой платформы</h2>
            <p className="mt-0.5 text-[13px] text-fg-3">Товары, команды выдачи, промокоды и покупатели с остатком привилегий — за один вечер, без потери истории.</p>
          </div>
          <ol className="flex items-center gap-1.5" aria-label="Шаги импорта">
            {STEPS.map((s, i) => (
              <li key={s.label} className="flex items-center gap-1.5">
                <span
                  aria-current={i === stepIdx ? "step" : undefined}
                  className={cn(
                    "flex h-6 items-center gap-1.5 rounded-full border px-2 font-mono text-[11px] whitespace-nowrap",
                    i < stepIdx ? "border-ok/30 text-ok" : i === stepIdx ? "border-azure-500/50 bg-azure-500/10 text-azure-200" : "border-line text-fg-4",
                  )}
                >
                  {i < stepIdx ? <Check className="size-3" /> : <span>{i + 1}</span>}
                  <span className="hidden sm:inline">{s.label}</span>
                </span>
                {i < STEPS.length - 1 ? <span aria-hidden className="h-px w-3 bg-line-strong" /> : null}
              </li>
            ))}
          </ol>
        </header>

        {step === "source" ? (
          <div className="p-5">
            <div role="radiogroup" aria-label="Платформа" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={source === s.id}
                  onClick={() => setSource(s.id)}
                  className={cn(
                    "flex flex-col rounded-lg border px-3.5 py-3 text-left transition-[border-color,background-color]",
                    source === s.id ? "border-azure-500/60 bg-azure-500/[0.06]" : "border-line hover:border-line-strong hover:bg-white/[0.02]",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-fg">{s.name}</span>
                    {s.how === "api" ? <KeyRound className="size-3.5 text-fg-4" /> : <FileUp className="size-3.5 text-fg-4" />}
                  </span>
                  <span className="mt-1 font-mono text-[11px] text-fg-3">{s.how === "api" ? "по API-ключу" : "файл выгрузки"}</span>
                  <span className="mt-2 text-[12px] leading-snug text-fg-3">{s.what}</span>
                  {s.note ? <span className="mt-1.5 text-[11.5px] leading-snug text-warn">{s.note}</span> : null}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12.5px] text-fg-3">Старый магазин продолжит работать, пока вы не переключите ссылку. Импорт можно отменить в течение 24 часов.</p>
              <Button variant="primary" size="sm" onClick={() => setStep("connect")}>
                Дальше
                <ArrowRight />
              </Button>
            </div>
          </div>
        ) : null}

        {step === "connect" ? (
          <form
            className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setTried(true);
              if (!keyError) setStep("loading");
            }}
          >
            <div className="space-y-4">
              {src.how === "api" ? (
                <Field label={`API-ключ ${src.name}`} htmlFor="imp-key" hint={src.keyHint} error={tried ? keyError : null}>
                  <Input
                    id="imp-key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="вставьте ключ целиком"
                    className="font-mono"
                    aria-invalid={tried && !!keyError}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>
              ) : (
                <div>
                  <label
                    htmlFor="imp-file"
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition-colors hover:border-azure-500/50 hover:bg-azure-500/[0.03]",
                      tried && keyError ? "border-bad/50" : "border-line-strong",
                    )}
                  >
                    <Upload className="size-5 text-fg-3" />
                    <span className="mt-2 text-[13px] font-medium text-fg">{file ?? "Выберите CSV-файл"}</span>
                    <span className="mt-1 text-[12px] text-fg-3">Столбцы: ник, товар, цена, дата, срок. Кодировка UTF-8 или Windows-1251.</span>
                  </label>
                  <input
                    id="imp-file"
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(e) => setFile(e.target.files?.[0] ? `${e.target.files[0].name} · ${Math.max(1, Math.round(e.target.files[0].size / 1024))} КБ` : null)}
                  />
                  {tried && keyError ? <p className="mt-1.5 text-xs text-bad">{keyError}</p> : null}
                  <button type="button" className="mt-2 text-[12.5px] text-azure-300 hover:text-azure-200" onClick={() => setFile("donate_export_2026-11-05.csv · 412 КБ")}>
                    Взять пример файла
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep("source")}>
                  <ArrowLeft />
                  Назад
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Проверить и загрузить
                  <ArrowRight />
                </Button>
              </div>
            </div>
            <Note tone="azure" icon={<KeyRound />}>
              Ключ нужен только для чтения и не сохраняется после импорта. Пароль от {src.name} не нужен — мы никогда его не попросим.
            </Note>
          </form>
        ) : null}

        {step === "loading" ? (
          <div className="space-y-3 p-5" aria-busy="true" aria-live="polite">
            <p className="flex items-center gap-2 text-[13px] text-fg-2">
              <Loader2 className="size-4 animate-spin text-azure-300" />
              Читаем магазин {src.name}: товары, команды, промокоды…
            </p>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : null}

        {step === "mapping" ? (
          <div className="p-5">
            <Tabs defaultValue="products">
              <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
                <TabsList variant="pill">
                  <TabsTrigger value="products">Товары · {data.products.length}</TabsTrigger>
                  <TabsTrigger value="commands">
                    Команды · {commands.length}
                    {unresolved ? <span aria-label="есть неизвестные переменные" className="size-1.5 rounded-full bg-bad" /> : null}
                  </TabsTrigger>
                  <TabsTrigger value="promos">Промокоды · {data.promos.length}</TabsTrigger>
                  <TabsTrigger value="buyers">Покупатели</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="products" className="mt-4">
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[560px] text-[13px]">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="h-9 px-4 text-left label-mono text-fg-3">В {src.name}</th>
                        <th className="h-9 px-3 text-right label-mono text-fg-3">Цена</th>
                        <th className="h-9 w-8" aria-hidden />
                        <th className="h-9 px-4 text-left label-mono text-fg-3">В PayMC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.map((p) => (
                        <tr key={p.theirs} className="border-b border-line-soft last:border-0">
                          <td className="px-4 py-2 text-fg-2">{p.theirs}</td>
                          <td className="px-3 py-2 text-right font-mono text-fg-3 nums">{formatMoney(p.theirPrice)}</td>
                          <td className="py-2 text-center text-fg-4">
                            <ArrowRight className="mx-auto size-3.5" />
                          </td>
                          <td className="px-4 py-2">
                            <Select value={matches[p.theirs]} onValueChange={(v) => setMatches((m) => ({ ...m, [p.theirs]: v }))}>
                              <SelectTrigger size="sm" className="w-full max-w-[260px]" aria-label={`Товар PayMC для «${p.theirs}»`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">Создать новый товар</SelectItem>
                                {data.paymcProducts.map((x) => (
                                  <SelectItem key={x.id} value={x.id}>
                                    {x.name} · {formatMoney(x.price)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[12px] text-fg-3">Показаны 7 из {data.totals.products}. Остальные создадутся как новые товары в статусе «черновик».</p>
              </TabsContent>

              <TabsContent value="commands" className="mt-4 space-y-2">
                {commands.map((c, i) => (
                  <div key={c.product} className={cn("rounded-lg border px-4 py-3", c.unknown.length ? "border-bad/30 bg-bad/[0.03]" : "border-line")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-fg">{c.product}</span>
                      {c.unknown.length ? (
                        <Button variant="secondary" size="xs" onClick={() => fixCommand(i)}>
                          <Wand2 />
                          Заменить {c.unknown.map((u) => `${u} → ${FIX[u] ?? "?"}`).join(", ")}
                        </Button>
                      ) : (
                        <Badge tone="ok">
                          <Check />
                          Переменные распознаны
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 overflow-x-auto font-mono text-[12px] leading-relaxed whitespace-nowrap">
                      <p className="text-fg-4">
                        <span className="mr-2 select-none">было</span>
                        {c.original}
                      </p>
                      <p className="text-fg-2">
                        <span className="mr-2 text-fg-4 select-none">стало</span>
                        <CommandHighlight command={c.converted} unknown={c.unknown} />
                      </p>
                    </div>
                    {c.unknown.length ? (
                      <p className="mt-2 flex items-center gap-1.5 text-[12px] text-bad">
                        <CircleAlert className="size-3.5" />
                        PayMC не знает переменную {c.unknown.join(", ")} — без замены команда не выполнится на сервере
                      </p>
                    ) : null}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="promos" className="mt-4">
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[480px] text-[13px]">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="h-9 px-4 text-left label-mono text-fg-3">Код</th>
                        <th className="h-9 px-3 text-left label-mono text-fg-3">Скидка</th>
                        <th className="h-9 px-3 text-right label-mono text-fg-3">Использований</th>
                        <th className="h-9 px-4 text-left label-mono text-fg-3">Что сделаем</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.promos.map((p) => (
                        <tr key={p.code} className="border-b border-line-soft last:border-0">
                          <td className="px-4 py-2 font-mono text-fg">{p.code}</td>
                          <td className="px-3 py-2 font-mono text-fg-2">{p.discount}</td>
                          <td className="px-3 py-2 text-right font-mono text-fg-3 nums">{formatNumber(p.uses)}</td>
                          <td className="px-4 py-2">{p.status === "ok" ? <Badge tone="ok">перенесём со счётчиком</Badge> : <Badge>истёк — пропустим</Badge>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="buyers" className="mt-4">
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[480px] text-[13px]">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="h-9 px-4 text-left label-mono text-fg-3">Игрок</th>
                        <th className="h-9 px-3 text-left label-mono text-fg-3">Привилегия</th>
                        <th className="h-9 px-3 text-right label-mono text-fg-3">Осталось</th>
                        <th className="h-9 px-4 text-left label-mono text-fg-3">После переезда</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.buyers.map((b) => (
                        <tr key={b.name} className="border-b border-line-soft last:border-0">
                          <td className="px-4 py-2 font-mono text-fg">{b.name}</td>
                          <td className="px-3 py-2 text-fg-2">{b.rank}</td>
                          <td className="px-3 py-2 text-right font-mono text-fg-3 nums">{b.daysLeft === null ? "навсегда" : pluralize(b.daysLeft, ["день", "дня", "дней"])}</td>
                          <td className="px-4 py-2 text-[12.5px] text-fg-3">срок сохранится, продление — уже через PayMC</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[12px] text-fg-3">
                  Всего {formatNumber(data.totals.buyers)} покупателей, у {data.totals.activeRanks} есть действующие привилегии.
                </p>
              </TabsContent>
            </Tabs>

            <div className="mt-5 flex flex-col gap-3 border-t border-line-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className={cn("text-[12.5px]", unresolved ? "text-bad" : "text-fg-3")}>
                {unresolved
                  ? `Исправьте ${pluralize(unresolved, ["переменную", "переменные", "переменных"])} во вкладке «Команды», чтобы продолжить`
                  : `${data.totals.products} товаров, ${data.totals.commands} команда, ${data.totals.promos} промокодов, ${formatNumber(data.totals.buyers)} покупателей`}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep("connect")}>
                  <ArrowLeft />
                  Назад
                </Button>
                <Button variant="primary" size="sm" disabled={unresolved > 0} onClick={() => setStep("importing")}>
                  Импортировать
                  <ArrowRight />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "importing" || step === "done" ? (
          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[13px] text-fg-2">
                {step === "importing" ? <Loader2 className="size-4 animate-spin text-azure-300" /> : <Check className="size-4 text-ok" />}
                {step === "importing" ? `Переносим магазин из ${src.name}` : "Импорт завершён"}
              </p>
              <span className="font-mono text-[12px] text-fg-3 nums">{progress} %</span>
            </div>
            <Progress value={progress} tone={step === "done" ? "ok" : "azure"} className="mt-2" />
            <div className="mt-4 overflow-hidden rounded-lg border border-line bg-[#070a10]">
              <div className="flex h-8 items-center gap-1.5 border-b border-line-soft px-3">
                <span className="size-2 rounded-full bg-fg-4/60" />
                <span className="size-2 rounded-full bg-fg-4/60" />
                <span className="size-2 rounded-full bg-fg-4/60" />
                <span className="ml-2 label-mono text-fg-4">paymc import · {src.id}</span>
              </div>
              <pre className="min-h-[188px] overflow-x-auto px-3.5 py-3 font-mono text-[12px] leading-[1.75] text-fg-2" aria-live="polite">
                {log.map((l, i) => (
                  <div key={i} className={cn("whitespace-pre", l.startsWith("✓") && "text-ok")}>
                    {l}
                  </div>
                ))}
                {step === "importing" ? <span className="inline-block h-3.5 w-1.5 animate-blink bg-fg-2 align-middle" /> : null}
              </pre>
            </div>
          </div>
        ) : null}
      </section>

      {step === "source" ? (
        <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line-soft md:grid-cols-3">
          {[
            {
              t: "Перенесём",
              d: "Товары с ценами и описаниями, команды выдачи с заменой переменных, промокоды со счётчиками, покупателей и сроки их привилегий.",
            },
            {
              t: "Не перенесём",
              d: "Сохранённые карты игроков — банки не передают их между платформами. Игрок один раз оплатит заново, дальше всё как обычно.",
            },
            {
              t: "Сколько времени",
              d: "Около 15 минут на 1 000 покупателей. Каждую команду проверим на тестовом игроке PayMC_Test до запуска.",
            },
          ].map((x) => (
            <div key={x.t} className="bg-surface px-5 py-4">
              <dt className="label-mono text-fg-3">{x.t}</dt>
              <dd className="mt-1.5 text-[12.5px] leading-relaxed text-fg-2">{x.d}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {step === "done" ? (
        <section className="rounded-xl border border-ok/25 bg-surface shadow-raise">
          <div className="grid gap-px overflow-hidden rounded-t-xl bg-line-soft sm:grid-cols-5">
            {[
              [data.totals.products, "товаров"],
              [data.totals.commands, "команд выдачи"],
              [data.totals.promos - 1, "промокодов"],
              [data.totals.buyers, "покупателей"],
              [data.totals.activeRanks, "активных привилегий"],
            ].map(([v, l]) => (
              <div key={String(l)} className="bg-surface px-4 py-3.5">
                <p className="font-mono text-xl font-medium text-fg nums">{formatNumber(Number(v))}</p>
                <p className="text-[12px] text-fg-3">{l}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-4 border-t border-line-soft px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-[12.5px] leading-relaxed text-fg-3">
              <p className="text-[13px] font-medium text-fg">Что осталось сделать</p>
              Поменяйте ссылку в /donate, MOTD и описании группы VK на <span className="font-mono text-fg-2">shop.arcticmc.ru</span>, затем отключите старый магазин.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reset();
                  toast("Импорт отменён", { description: "Созданные товары и промокоды удалены, покупатели остались в старом магазине" });
                }}
              >
                <RotateCcw />
                Отменить импорт
              </Button>
              <Button asChild variant="primary" size="sm">
                <Link href="/dashboard/products">
                  Открыть товары
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CommandHighlight({ command, unknown }: { command: string; unknown: string[] }) {
  const parts = command.split(/(\{[a-z_]+\})/gi);
  return (
    <>
      {parts.map((p, i) =>
        /^\{[a-z_]+\}$/i.test(p) ? (
          <span key={i} className={cn("rounded-xs px-0.5", unknown.includes(p) ? "bg-bad/15 text-bad underline decoration-wavy underline-offset-2" : "bg-ice-400/10 text-ice-300")}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
