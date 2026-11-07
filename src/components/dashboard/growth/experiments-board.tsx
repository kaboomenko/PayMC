"use client";

import * as React from "react";
import { Check, CirclePlay, FlaskConical, Lightbulb, Square, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort, formatMoney, formatNumber, formatPercent, plural, pluralize } from "@/lib/format";
import { NOW, NOW_MS } from "@/lib/mock/now";
import type { Experiment } from "@/lib/mock/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Field, Input, Label, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { KpiStrip, Unit } from "./kpi-strip";
import { SAMPLE_PER_VARIANT, plannedDays } from "./experiment-plan";
import { useHotkey, useQueryState } from "./use-query-state";
import { VariantChart } from "./variant-chart";

export interface VariantView {
  id: string;
  name: string;
  description: string;
  traffic: number;
  visitors: number;
  conversions: number;
  revenue: number;
  conv: number;
  rpv: number;
  aov: number;
}

export type TestKind = "price" | "order" | "badge" | "description";

export interface ExperimentView extends Omit<Experiment, "variants" | "status"> {
  status: Experiment["status"] | "stopped";
  variants: VariantView[];
  kind?: TestKind;
  chart?: { day: number; a: number; b: number }[];
  learnings?: string;
  dayOf?: number;
  totalDays?: number;
  /** days until «B лучше A» reaches 95 % at the current pace; null — B isn't ahead */
  daysTo95?: number | null;
  /** traffic the test gets (running) or would get (draft) per day */
  visitorsPerDay?: number;
  /** product the test runs on and its 30-day revenue — sizes «Если применить B» */
  productName?: string;
  revenue30?: number;
  /** B was applied from this page */
  applied?: boolean;
}

export interface ExpProduct {
  id: string;
  name: string;
  price: number;
  viewsPerDay: number;
}

const METRIC: Record<Experiment["metric"], { label: string; short: string; by: string }> = {
  conversion: { label: "Конверсия в покупку", short: "Конверсия", by: "по конверсии" },
  revenue_per_visitor: { label: "Выручка на посетителя", short: "₽ на посетителя", by: "по выручке на посетителя" },
  avg_check: { label: "Средний чек", short: "Средний чек", by: "по среднему чеку" },
};

const DAYS: [string, string, string] = ["день", "дня", "дней"];
const rub2 = (v: number) => `${formatNumber(v, 2)} ₽`;
const delta = (b: number, a: number) => (a ? ((b - a) / a) * 100 : 0);
const shortName = (e: ExperimentView) => e.name.split(":")[0];
const variantValue = (v: VariantView) => v.name.replace(/^[AB] · /, "");

export function ExperimentsBoard({ experiments, products, storefrontPerDay }: { experiments: ExperimentView[]; products: ExpProduct[]; storefrontPerDay: number }) {
  const [list, setList] = React.useState(experiments);
  const [newParam, setNewParam] = useQueryState("new");
  const [applying, setApplying] = React.useState<ExperimentView | null>(null);
  const seq = React.useRef(0);
  useHotkey("n", () => setNewParam("1"));

  const patch = (id: string, p: Partial<ExperimentView>) => setList((l) => l.map((e) => (e.id === id ? { ...e, ...p } : e)));

  const running = list.filter((e) => e.status === "running" || e.status === "stopped");
  const completed = list.filter((e) => e.status === "completed");
  const drafts = list.filter((e) => e.status === "draft");

  const applyB = (e: ExperimentView) => {
    const b = e.variants[1];
    const p = Math.round((e.probabilityToBeat ?? 0) * 100);
    patch(e.id, {
      status: "completed",
      winnerId: b?.id,
      applied: true,
      endsAt: NOW.toISOString(),
      learnings:
        p < 95
          ? `Применён вариант B до порога 95 % — следите за метрикой «${METRIC[e.metric].short.toLowerCase()}» ещё неделю и откатите в истории товара, если она просядет.`
          : "Применён вариант B после порога 95 %.",
    });
    setApplying(null);
    toast.success("Вариант B применён", {
      description:
        e.kind === "price" && e.productName && b
          ? `${e.productName} теперь стоит ${variantValue(b)} для всех игроков`
          : `Все игроки теперь видят вариант B${b ? ` — ${variantValue(b)}` : ""}`,
    });
  };

  return (
    <>
      <ExperimentKpis list={list} />

      <div className="mt-6 space-y-4">
        {running.map((e) => (
          <RunningCard
            key={e.id}
            e={e}
            onStop={() => {
              const prev = e.status;
              patch(e.id, { status: "stopped" });
              toast("Эксперимент остановлен", {
                description: "Все игроки снова видят вариант A. Данные сохранены.",
                action: { label: "Отменить", onClick: () => patch(e.id, { status: prev }) },
              });
            }}
            onResume={() => patch(e.id, { status: "running" })}
            onApply={() => setApplying(e)}
          />
        ))}
        <div className="grid gap-4 lg:grid-cols-2">
          {completed.map((e) => (
            <CompletedCard key={e.id} e={e} />
          ))}
          {drafts.map((e) => (
            <DraftCard
              key={e.id}
              e={e}
              onLaunch={() => {
                const days = plannedDays(e.visitorsPerDay ?? 0, e.variants[1]?.traffic ?? 50);
                patch(e.id, { status: "running", dayOf: 0, totalDays: days, startedAt: new Date(NOW_MS).toISOString() });
                toast.success("Эксперимент запущен", {
                  description: `${e.name} · ${e.variants.map((v) => v.traffic).join("/")} · не меньше ${pluralize(days, DAYS)}`,
                });
              }}
            />
          ))}
        </div>
      </div>

      <Dialog open={!!applying} onOpenChange={(o) => (o ? null : setApplying(null))}>
        <DialogContent className="max-w-md">
          {applying ? (
            <>
              <DialogHeader>
                <DialogTitle>Применить вариант B?</DialogTitle>
                <DialogDescription>
                  {applying.variants[1]?.description}. Эксперимент завершится, все игроки увидят вариант B.
                </DialogDescription>
              </DialogHeader>
              {(applying.probabilityToBeat ?? 0) < 0.95 ? (
                <DialogBody>
                  <p className="rounded-md border border-warn/25 bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
                    Вероятность победы — {formatPercent((applying.probabilityToBeat ?? 0) * 100, { digits: 0 })}, ниже порога 95 %. Решение можно откатить в
                    истории товара.
                  </p>
                </DialogBody>
              ) : null}
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setApplying(null)}>
                  Подождать
                </Button>
                <Button variant="primary" size="sm" onClick={() => applyB(applying)}>
                  <Check /> Применить
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <NewExperimentDialog
        open={newParam === "1"}
        onOpenChange={(o) => setNewParam(o ? "1" : null)}
        products={products}
        storefrontPerDay={storefrontPerDay}
        onCreate={(e, launch) => {
          seq.current += 1;
          setList((l) => [...l, { ...e, id: `${e.id}-${seq.current}` }]);
          setNewParam(null);
          toast.success(launch ? "Эксперимент запущен" : "Черновик эксперимента сохранён", {
            description: launch && e.totalDays ? `${e.name} · не меньше ${pluralize(e.totalDays, DAYS)}` : e.name,
          });
        }}
      />
    </>
  );
}

/* ───────────── KPIs (follow the list below) ───────────── */

function ExperimentKpis({ list }: { list: ExperimentView[] }) {
  const running = list.filter((e) => e.status === "running");
  const stopped = list.find((e) => e.status === "stopped");
  const applied = list.find((e) => e.applied);
  // the test the money figures talk about: the one collecting data, else the one just applied
  const live = list.find((e) => (e.status === "running" || e.status === "stopped") && (e.variants[0]?.visitors ?? 0) > 0);
  const focus = live ?? applied;
  const lift = focus ? delta(focus.variants[1].rpv, focus.variants[0].rpv) : 0;
  const monthly = focus?.revenue30 ? Math.round((focus.revenue30 * lift) / 100) : 0;
  const isApplied = !live && !!applied;
  const tested = list.filter((e) => e.status !== "draft").reduce((a, e) => a + e.variants.reduce((s, v) => s + v.visitors, 0), 0);
  const done = list.filter((e) => e.status === "completed").length;
  const drafts = list.filter((e) => e.status === "draft").length;

  return (
    <KpiStrip
      items={[
        {
          label: "Идёт сейчас",
          value: running.length,
          sub: running[0]
            ? `${shortName(running[0])} · ${dayLabel(running[0])}`
            : stopped
              ? `${shortName(stopped)} — остановлен`
              : applied
                ? `${shortName(applied)} — B применён`
                : "запустите тест из черновика",
        },
        {
          label: "Лучший вариант",
          value: focus ? formatPercent(lift, { signed: true }) : "—",
          sub: focus ? (isApplied ? "₽ на посетителя у B · применён" : "₽ на посетителя у B против A") : "данных пока нет",
        },
        {
          label: isApplied ? "Эффект от B" : "Если применить B",
          value: (
            <>
              {monthly > 0 ? "+" : ""}
              {formatNumber(monthly)}
              <Unit>₽/мес</Unit>
            </>
          ),
          sub: focus?.productName ? `${isApplied ? "ожидаем " : ""}по продажам ${focus.productName} за 30 дней` : "по продажам за 30 дней",
        },
        {
          label: "Игроков в тестах",
          value: formatNumber(tested),
          sub: `${done} ${plural(done, ["завершён", "завершены", "завершены"])} · ${drafts} ${plural(drafts, ["черновик", "черновика", "черновиков"])}`,
        },
      ]}
    />
  );
}

function dayLabel(e: ExperimentView) {
  if (!e.dayOf) return `запущен сегодня · план ${pluralize(e.totalDays ?? 0, DAYS)}`;
  return `день ${e.dayOf} из ${e.totalDays}`;
}

/* ───────────── Running ───────────── */

function RunningCard({ e, onStop, onResume, onApply }: { e: ExperimentView; onStop: () => void; onResume: () => void; onApply: () => void }) {
  const [a, b] = e.variants;
  const p = Math.round((e.probabilityToBeat ?? 0) * 100);
  const stopped = e.status === "stopped";
  const hasData = a.visitors > 0;
  const toGo = e.daysTo95;
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-raise">
      <header className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:px-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {stopped ? (
              <Badge tone="neutral">Остановлен</Badge>
            ) : (
              <Badge tone="azure" dot>
                Идёт · {dayLabel(e)}
              </Badge>
            )}
            <span className="label-mono text-fg-4">цель: {METRIC[e.metric].label}</span>
          </div>
          <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-fg">{e.name}</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-fg-3">{e.hypothesis}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {stopped ? (
            <Button variant="secondary" size="sm" onClick={onResume}>
              <CirclePlay /> Продолжить
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={onStop} disabled={!hasData}>
              <Square /> Остановить
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={onApply} disabled={!hasData}>
            <Check /> Применить вариант B
          </Button>
        </div>
      </header>

      {hasData ? (
        <div className="grid xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="grid gap-px bg-line-soft sm:grid-cols-2">
            {[a, b].map((v, i) => (
              <VariantColumn key={v.id} v={v} control={i === 0 ? undefined : a} metric={e.metric} leading={i === 1 && b.rpv > a.rpv} />
            ))}
          </div>
          <div className="border-t border-line-soft px-4 py-4 sm:px-5 xl:border-t-0 xl:border-l">
            <p className="label-mono text-fg-3">Вероятность, что B лучше A</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="font-mono text-[34px] leading-none font-medium tracking-[-0.03em] text-fg nums">
                {p}
                <span className="text-[18px] text-fg-3"> %</span>
              </p>
              <p className="pb-1 text-right text-xs text-fg-3">
                {toGo === 0 ? "порог 95 % пройден" : toGo == null ? "B пока не впереди" : `ещё ≈ ${pluralize(toGo, DAYS)} до 95 %`}
                <br />
                <span className="text-fg-4">при ≈ {formatNumber(e.visitorsPerDay ?? 0)} посетителях в день</span>
              </p>
            </div>
            <div className="relative mt-3 h-2 rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-azure-500" style={{ width: `${p}%` }} />
              <span className="absolute -top-1 h-4 w-px bg-ok" style={{ left: "95%" }} aria-hidden />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[11px] text-fg-4">
              <span>50 % — монетка</span>
              <span className="text-ok">порог 95 %</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-fg-3">
              Байесовская оценка {METRIC[e.metric].by}. Не останавливайте тест раньше порога: ранние «победы» часто исчезают к выходным.
            </p>
            {e.chart ? (
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="label-mono text-fg-4">₽ на посетителя, накопительно</p>
                  <span className="flex items-center gap-3 text-[11px] text-fg-3">
                    <span className="flex items-center gap-1">
                      <span className="h-0 w-3 border-t border-dashed border-fg-3" />A
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-ice-400" />B
                    </span>
                  </span>
                </div>
                <VariantChart data={e.chart} height={130} />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-[13px] text-fg-3">Тест запущен — первые данные появятся через сутки. Трафик делится по нику, игрок всегда видит один вариант.</p>
      )}
    </section>
  );
}

function VariantColumn({ v, control, metric, leading }: { v: VariantView; control?: VariantView; metric: Experiment["metric"]; leading?: boolean }) {
  const rows: { key: Experiment["metric"] | "visitors" | "conversions" | "revenue"; label: string; value: string; d?: number }[] = [
    { key: "visitors", label: "Посетители", value: formatNumber(v.visitors) },
    { key: "conversions", label: "Покупки", value: formatNumber(v.conversions), d: control ? delta(v.conversions, control.conversions) : undefined },
    { key: "conversion", label: "Конверсия", value: formatPercent(v.conv, { digits: 2 }), d: control ? delta(v.conv, control.conv) : undefined },
    { key: "revenue", label: "Выручка", value: formatMoney(v.revenue), d: control ? delta(v.revenue, control.revenue) : undefined },
    { key: "avg_check", label: "Средний чек", value: formatMoney(v.aov), d: control ? delta(v.aov, control.aov) : undefined },
    { key: "revenue_per_visitor", label: "₽ на посетителя", value: rub2(v.rpv), d: control ? delta(v.rpv, control.rpv) : undefined },
  ];
  return (
    <div className="bg-surface px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold text-fg">{v.name}</p>
          <p className="mt-0.5 text-xs text-fg-3">{v.description}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          {control === undefined ? <Badge tone="outline">контроль</Badge> : null}
          {leading ? <Badge tone="ok">лидирует</Badge> : null}
          <span className="font-mono text-[11px] text-fg-4">{v.traffic} %</span>
        </span>
      </div>
      <dl className="mt-3 space-y-0.5">
        {rows.map((r) => {
          const primary = r.key === metric;
          return (
            <div
              key={r.key}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[12.5px]",
                primary ? "bg-azure-500/[0.08] ring-1 ring-azure-400/25 ring-inset" : "",
              )}
            >
              <dt className={primary ? "text-fg" : "text-fg-3"}>{r.label}</dt>
              <dd className="flex items-baseline gap-2 font-mono nums">
                <span className={primary ? "text-fg" : "text-fg-2"}>{r.value}</span>
                {r.d !== undefined ? (
                  <span className={cn("w-14 text-right text-[11px]", Math.abs(r.d) < 0.5 ? "text-fg-4" : r.d > 0 ? "text-ok" : "text-bad")}>
                    {formatPercent(r.d, { signed: true })}
                  </span>
                ) : (
                  <span className="w-14" aria-hidden />
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/* ───────────── Completed & draft ───────────── */

/** The verdict is read off the variants: what the winner did to money and to conversion. */
function Verdict({ e }: { e: ExperimentView }) {
  const winner = e.variants.find((v) => v.id === e.winnerId);
  const loser = e.variants.find((v) => v.id !== e.winnerId);
  if (!winner || !loser) return <p className="text-[12.5px] text-fg-3">Победитель не выбран — оба варианта показали одно и то же.</p>;
  const p = Math.round((e.probabilityToBeat ?? 0) * 100);
  const early = winner.id !== "a" && p < 95;
  return (
    <p className="text-[12.5px] leading-relaxed text-fg-3">
      Победил <span className="text-fg">{winner.name}</span>: ₽ на посетителя{" "}
      <span className="font-mono text-fg-2 nums">{formatPercent(delta(winner.rpv, loser.rpv), { signed: true })}</span> при конверсии{" "}
      <span className="font-mono text-fg-2 nums">{formatPercent(delta(winner.conv, loser.conv), { signed: true })}</span>. Вероятность, что B лучше A{" "}
      {METRIC[e.metric].by}, — <span className="font-mono text-fg-2 nums">{p} %</span>
      {early ? ": применён до порога 95 %" : ""}.
    </p>
  );
}

function CompletedCard({ e }: { e: ExperimentView }) {
  const [a, b] = e.variants;
  return (
    <section className="flex flex-col rounded-xl border border-line bg-surface shadow-raise">
      <header className="px-4 pt-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{e.applied ? "Применён B" : "Завершён"}</Badge>
          <span className="font-mono text-[11px] text-fg-4">
            {e.startedAt ? formatDateShort(e.startedAt) : ""} – {e.endsAt ? formatDateShort(e.endsAt) : ""} · {METRIC[e.metric].short.toLowerCase()}
          </span>
        </div>
        <h3 className="mt-2 text-[15px] font-medium text-fg">{e.name}</h3>
      </header>
      <div className="mt-3 grid grid-cols-2 gap-px border-y border-line-soft bg-line-soft">
        {[a, b].map((v) => (
          <div key={v.id} className={cn("bg-surface px-4 py-3 sm:px-5", v.id === e.winnerId && "bg-ok/[0.04]")}>
            <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg">
              {v.id === e.winnerId ? <Trophy className="size-3.5 text-ok" /> : null}
              {v.name}
            </p>
            <dl className="mt-2 space-y-1 font-mono text-[12px] nums">
              <div className="flex justify-between gap-2">
                <dt className="text-fg-4">конв.</dt>
                <dd className="text-fg-2">{formatPercent(v.conv, { digits: 2 })}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-fg-4">₽/посет.</dt>
                <dd className="text-fg-2">{rub2(v.rpv)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-fg-4">выручка</dt>
                <dd className="text-fg-2">{formatMoney(v.revenue)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
        <Verdict e={e} />
        {e.learnings ? (
          <div className="mt-3 flex gap-2.5 rounded-lg border border-line bg-surface-2/60 px-3.5 py-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" />
            <div>
              <p className="label-mono text-fg-4">Вывод</p>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{e.learnings}</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DraftCard({ e, onLaunch }: { e: ExperimentView; onLaunch: () => void }) {
  const perDay = e.visitorsPerDay ?? 0;
  const split = e.variants[1]?.traffic ?? 50;
  const days = plannedDays(perDay, split);
  return (
    <section className="flex flex-col rounded-xl border border-dashed border-line-strong bg-surface/60 lg:self-start">
      <header className="px-4 pt-4 sm:px-5">
        <div className="flex items-center gap-2">
          <Badge tone="outline">Черновик</Badge>
          <span className="label-mono text-fg-4">цель: {METRIC[e.metric].label}</span>
        </div>
        <h3 className="mt-2 text-[15px] font-medium text-fg">{e.name}</h3>
        <p className="mt-1 text-[13px] text-fg-3">{e.hypothesis}</p>
      </header>
      <ul className="mt-4 space-y-2 px-4 sm:px-5">
        {e.variants.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-2/60 px-3 py-2">
            <span className="min-w-0">
              <span className="block text-[13px] text-fg">{v.name}</span>
              <span className="block truncate text-xs text-fg-3">{v.description}</span>
            </span>
            <span className="font-mono text-[12px] text-fg-3 nums">{v.traffic} %</span>
          </li>
        ))}
      </ul>
      <PlanNote perDay={perDay} split={split} days={days} where={e.kind === "order" ? "витрины" : "карточки"} className="mx-4 mt-3 sm:mx-5" />
      <div className="flex justify-end px-4 py-4 sm:px-5">
        <Button variant="primary" size="sm" onClick={onLaunch}>
          <CirclePlay /> Запустить на {pluralize(days, DAYS)}
        </Button>
      </div>
    </section>
  );
}

/** «≈ 210 посетителей карточки в день → минимум 44 дня» — shared by draft cards and the dialog. */
function PlanNote({ perDay, split, days, where, className }: { perDay: number; split: number; days: number; where: string; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border border-line bg-[#06080c] px-3.5 py-3", className)}>
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-ice-300" />
      <p className="text-[12.5px] leading-relaxed text-fg-2">
        <span className="font-mono text-fg nums">≈ {formatNumber(Math.round(perDay))}</span> {plural(Math.round(perDay), ["посетитель", "посетителя", "посетителей"])}{" "}
        {where} в день → минимум <span className="font-mono text-fg nums">{days}</span> <span className="text-fg">{plural(days, DAYS)}</span>: столько нужно, чтобы набрать ≈{" "}
        {formatNumber(SAMPLE_PER_VARIANT)} на вариант при сплите {100 - split}/{split}. Меньше 7 дней не ставим — нужно захватить выходные.
      </p>
    </div>
  );
}

/* ───────────── New experiment ───────────── */

const TEST_KINDS: { id: TestKind; label: string; hint: string; metric: Experiment["metric"] }[] = [
  { id: "price", label: "Цена", hint: "Две цены одного товара — кому какая, решает сплит", metric: "revenue_per_visitor" },
  { id: "order", label: "Порядок витрины", hint: "Какие категории игрок видит первыми", metric: "conversion" },
  { id: "badge", label: "Бейдж", hint: "«Хит», «Новинка» или «Скидка» на карточке", metric: "avg_check" },
  { id: "description", label: "Описание", hint: "Другой текст и перки на карточке товара", metric: "conversion" },
];

const ORDERS_B = ["Кейсы и наборы сверху", "Подписка Frost+ первой", "Сначала дешёвые товары"];
const BADGES_B = ["Хит", "Новинка", "Скидка", "Мало осталось"];

/** A starting hypothesis per test kind — the owner edits it, we only fill the blank. */
function hypothesisFor(kind: TestKind, product: ExpProduct | undefined, priceB: number, orderB: string, badgeB: string) {
  const name = product?.name ?? "товар";
  if (kind === "price") {
    if (!product || !priceB || priceB === product.price) return "";
    return priceB > product.price
      ? `${name} берут ради содержимого: цена ${formatMoney(priceB)} вместо ${formatMoney(product.price)} почти не снизит конверсию и даст больше выручки на посетителя.`
      : `Цена ${formatMoney(priceB)} вместо ${formatMoney(product.price)} приведёт больше покупателей ${name} — выручка на посетителя вырастет за счёт конверсии.`;
  }
  if (kind === "order") return `Порядок «${orderB}» поможет игроку быстрее найти покупку — больше посетителей витрины заплатят.`;
  if (kind === "badge") return `Бейдж «${badgeB}» привлечёт внимание к ${name} и сместит выбор на более дорогой товар — средний чек вырастет.`;
  return `Новое описание ${name} понятнее объясняет, что входит, — больше посетителей карточки купят.`;
}

function NewExperimentDialog({
  open,
  onOpenChange,
  products,
  storefrontPerDay,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: ExpProduct[];
  storefrontPerDay: number;
  onCreate: (e: ExperimentView, launch: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {open ? <NewExperimentForm products={products} storefrontPerDay={storefrontPerDay} onCreate={onCreate} onCancel={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function NewExperimentForm({
  products,
  storefrontPerDay,
  onCreate,
  onCancel,
}: {
  products: ExpProduct[];
  storefrontPerDay: number;
  onCreate: (e: ExperimentView, launch: boolean) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = React.useState<TestKind>("price");
  const [productId, setProductId] = React.useState(products.find((p) => p.id === "p-blizzard")?.id ?? products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId) ?? products[0];
  const [price, setPrice] = React.useState(String((product?.price ?? 0) + 50));
  const [orderB, setOrderB] = React.useState(ORDERS_B[0]);
  const [badgeB, setBadgeB] = React.useState(BADGES_B[0]);
  const [descB, setDescB] = React.useState("");
  const [split, setSplit] = React.useState(50);
  const [metric, setMetric] = React.useState<Experiment["metric"]>("revenue_per_visitor");
  /** null — follow the template for the chosen kind; a string — the owner's own text */
  const [ownHypothesis, setOwnHypothesis] = React.useState<string | null>(null);

  const pickKind = (k: TestKind) => {
    setKind(k);
    setMetric(TEST_KINDS.find((t) => t.id === k)!.metric);
  };

  const priceNum = Number(price);
  const hypothesis = ownHypothesis ?? hypothesisFor(kind, product, priceNum, orderB, badgeB);
  const priceErr = kind === "price" && (!priceNum || priceNum === product?.price) ? "Укажите цену, отличную от текущей" : null;
  const descErr = kind === "description" && descB.trim().length < 10 ? "Напишите новый текст — хотя бы одно предложение" : null;
  const hypErr = hypothesis.trim().length < 10 ? "Чего ждёте и почему — одним предложением" : null;
  const valid = !priceErr && !descErr && !hypErr && !!product;

  const perDay = kind === "order" ? storefrontPerDay : product?.viewsPerDay ?? 0;
  const days = plannedDays(perDay, split);

  const bLabel =
    kind === "price"
      ? `${formatMoney(priceNum || 0)}`
      : kind === "order"
        ? orderB
        : kind === "badge"
          ? `бейдж «${badgeB}»`
          : "новое описание";
  const aLabel = kind === "price" ? formatMoney(product?.price ?? 0) : kind === "order" ? "текущий порядок" : kind === "badge" ? "без бейджа" : "текущее описание";
  const name =
    kind === "price"
      ? `Цена ${product?.name}: ${aLabel} или ${bLabel}`
      : kind === "order"
        ? `Порядок витрины: ${orderB.toLowerCase()}`
        : kind === "badge"
          ? `Бейдж «${badgeB}» на ${product?.name}`
          : `Описание ${product?.name}`;

  const build = (launch: boolean): ExperimentView => ({
    id: `exp-new-${kind}-${productId}-${split}`,
    name,
    kind,
    hypothesis: hypothesis.trim(),
    status: launch ? "running" : "draft",
    metric,
    startedAt: launch ? new Date(NOW_MS).toISOString() : undefined,
    dayOf: launch ? 0 : undefined,
    totalDays: launch ? days : undefined,
    visitorsPerDay: perDay,
    productName: kind === "order" ? undefined : product?.name,
    variants: [
      { id: "a", name: `A · ${aLabel}`, description: "Как сейчас", traffic: 100 - split, visitors: 0, conversions: 0, revenue: 0, conv: 0, rpv: 0, aov: 0 },
      { id: "b", name: `B · ${bLabel}`, description: kind === "description" ? descB.trim() : "Новый вариант", traffic: split, visitors: 0, conversions: 0, revenue: 0, conv: 0, rpv: 0, aov: 0 },
    ],
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Новый эксперимент</DialogTitle>
        <DialogDescription>Игрок попадает в вариант по нику и видит его на витрине и в /donate, пока идёт тест.</DialogDescription>
      </DialogHeader>
      <DialogBody className="max-h-[min(68vh,640px)] space-y-5 overflow-y-auto">
        <div>
          <Label>Что тестируем</Label>
          <div role="radiogroup" aria-label="Что тестируем" className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {TEST_KINDS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={kind === t.id}
                onClick={() => pickKind(t.id)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left transition-colors",
                  kind === t.id ? "border-azure-400/60 bg-azure-500/[0.08]" : "border-line hover:border-line-strong",
                )}
              >
                <span className="block text-[13px] font-medium text-fg">{t.label}</span>
                <span className="block text-[11.5px] text-fg-3">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {kind !== "order" ? (
          <Field label="Товар" htmlFor="exp-product">
            <Select
              value={productId}
              onValueChange={(v) => {
                setProductId(v);
                const p = products.find((x) => x.id === v);
                if (p) setPrice(String(p.price + 50));
              }}
            >
              <SelectTrigger id="exp-product">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {formatMoney(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-line bg-surface-2/60 px-3 py-2.5">
            <p className="label-mono text-fg-4">A · контроль</p>
            <p className="mt-1 text-[13px] text-fg-2">{aLabel}</p>
          </div>
          <div className="rounded-md border border-azure-400/30 bg-azure-500/[0.05] px-3 py-2.5">
            <p className="label-mono mb-1.5 text-azure-300">B · новый вариант</p>
            {kind === "price" ? (
              <Input
                aria-label="Цена варианта B"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
                trailing={<span className="pr-1 font-mono text-xs">₽</span>}
                aria-invalid={!!priceErr || undefined}
                className="[&_input]:h-8"
              />
            ) : kind === "order" ? (
              <Select value={orderB} onValueChange={setOrderB}>
                <SelectTrigger size="sm" aria-label="Порядок для варианта B">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDERS_B.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : kind === "badge" ? (
              <Select value={badgeB} onValueChange={setBadgeB}>
                <SelectTrigger size="sm" aria-label="Бейдж для варианта B">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BADGES_B.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Textarea aria-label="Описание для варианта B" value={descB} onChange={(e) => setDescB(e.target.value)} rows={2} className="min-h-14 text-[13px]" placeholder="Набор раз в сутки и 3 дома — для тех, кто играет каждый вечер" />
            )}
            {priceErr || descErr ? (
              <p className="mt-1.5 text-xs text-bad">{priceErr ?? descErr}</p>
            ) : kind === "price" && product ? (
              <p className="mt-1.5 font-mono text-[11px] text-fg-3">{formatPercent(delta(priceNum, product.price), { signed: true })} к текущей цене</p>
            ) : null}
          </div>
        </div>

        <Field
          label="Гипотеза"
          htmlFor="exp-hypothesis"
          error={hypErr ?? undefined}
          hint={ownHypothesis === null ? "Черновик по типу теста — перепишите своими словами" : undefined}
        >
          <Textarea
            id="exp-hypothesis"
            value={hypothesis}
            onChange={(e) => setOwnHypothesis(e.target.value)}
            rows={2}
            className="min-h-16 text-[13px]"
            aria-invalid={!!hypErr || undefined}
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="exp-split">Трафик</Label>
            <span className="font-mono text-[12.5px] text-fg-2 nums">
              A {100 - split} % · <span className="text-ice-300">B {split} %</span>
            </span>
          </div>
          <Slider id="exp-split" aria-label="Доля трафика на вариант B" min={10} max={90} step={5} value={[split]} onValueChange={([v]) => setSplit(v)} />
        </div>

        <Field label="Главная метрика" htmlFor="exp-metric" hint={metric === "conversion" ? "Осторожно: конверсия растёт и от дешёвых товаров — смотрите и на выручку" : undefined}>
          <Select value={metric} onValueChange={(v) => setMetric(v as Experiment["metric"])}>
            <SelectTrigger id="exp-metric">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(METRIC) as Experiment["metric"][]).map((m) => (
                <SelectItem key={m} value={m}>
                  {METRIC[m].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <PlanNote perDay={perDay} split={split} days={days} where={kind === "order" ? "витрины" : "карточки"} />
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
        <Button variant="secondary" size="sm" disabled={!valid} onClick={() => onCreate(build(false), false)}>
          Черновик
        </Button>
        <Button variant="primary" size="sm" disabled={!valid} onClick={() => onCreate(build(true), true)}>
          <CirclePlay /> Запустить
        </Button>
      </DialogFooter>
    </>
  );
}
