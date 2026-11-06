"use client";

import * as React from "react";
import { Check, CirclePlay, FlaskConical, Lightbulb, Square, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort, formatMoney, formatNumber, formatPercent, pluralize } from "@/lib/format";
import { NOW_MS } from "@/lib/mock/now";
import type { Experiment } from "@/lib/mock/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Field, Input, Label, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
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

export interface ExperimentView extends Omit<Experiment, "variants" | "status"> {
  status: Experiment["status"] | "stopped";
  variants: VariantView[];
  chart?: { day: number; a: number; b: number }[];
  learnings?: string;
  dayOf?: number;
  totalDays?: number;
  daysTo95?: number;
  visitorsPerDay?: number;
}

export interface ExpProduct {
  id: string;
  name: string;
  price: number;
  viewsPerDay: number;
}

const METRIC: Record<Experiment["metric"], { label: string; short: string }> = {
  conversion: { label: "Конверсия в покупку", short: "Конверсия" },
  revenue_per_visitor: { label: "Выручка на посетителя", short: "₽ на посетителя" },
  avg_check: { label: "Средний чек", short: "Средний чек" },
};

const rub2 = (v: number) => `${formatNumber(v, 2)} ₽`;
const delta = (b: number, a: number) => (a ? ((b - a) / a) * 100 : 0);

export function ExperimentsBoard({ experiments, products, storefrontPerDay }: { experiments: ExperimentView[]; products: ExpProduct[]; storefrontPerDay: number }) {
  const [list, setList] = React.useState(experiments);
  const [newParam, setNewParam] = useQueryState("new");
  const [applying, setApplying] = React.useState<ExperimentView | null>(null);
  useHotkey("n", () => setNewParam("1"));

  const patch = (id: string, p: Partial<ExperimentView>) => setList((l) => l.map((e) => (e.id === id ? { ...e, ...p } : e)));

  const running = list.filter((e) => e.status === "running" || e.status === "stopped");
  const completed = list.filter((e) => e.status === "completed");
  const drafts = list.filter((e) => e.status === "draft");

  return (
    <>
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
                patch(e.id, { status: "running", dayOf: 0, totalDays: 14, startedAt: new Date(NOW_MS).toISOString() });
                toast.success("Эксперимент запущен", {
                  description: `${e.name} · ${e.variants.map((v) => v.traffic).join("/")} · не меньше 14 дней`,
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
              <DialogBody>
                <p className="rounded-md border border-warn/25 bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
                  Вероятность победы — {formatPercent((applying.probabilityToBeat ?? 0) * 100, { digits: 0 })}, ниже порога 95 %. Решение можно откатить в
                  истории товара.
                </p>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setApplying(null)}>
                  Подождать
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    patch(applying.id, { status: "completed", winnerId: applying.variants[1]?.id, learnings: "Применён вариант B до достижения порога 95 % — следите за выручкой на посетителя ещё неделю." });
                    setApplying(null);
                    toast.success("Вариант B применён", { description: "Frost теперь стоит 349 ₽ для всех игроков" });
                  }}
                >
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
          setList((l) => [...l, e]);
          setNewParam(null);
          toast.success(launch ? "Эксперимент запущен" : "Черновик эксперимента сохранён", { description: e.name });
        }}
      />
    </>
  );
}

/* ───────────── Running ───────────── */

function RunningCard({ e, onStop, onResume, onApply }: { e: ExperimentView; onStop: () => void; onResume: () => void; onApply: () => void }) {
  const [a, b] = e.variants;
  const p = Math.round((e.probabilityToBeat ?? 0) * 100);
  const stopped = e.status === "stopped";
  const hasData = a.visitors > 0;
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-raise">
      <header className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:px-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {stopped ? (
              <Badge tone="neutral">Остановлен</Badge>
            ) : (
              <Badge tone="azure" dot>
                Идёт · день {e.dayOf} из {e.totalDays}
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
                ещё ≈{pluralize(e.daysTo95 ?? 0, ["день", "дня", "дней"])} до 95 %
                <br />
                <span className="text-fg-4">при ≈ {formatNumber(e.visitorsPerDay ?? 0)} посетителях в день</span>
              </p>
            </div>
            <div className="relative mt-3 h-2 rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-azure-500" style={{ width: `${p}%` }} />
              <span className="absolute -top-1 h-4 w-px bg-ok" style={{ left: "95%" }} aria-hidden />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-fg-4">
              <span>50 % — монетка</span>
              <span className="text-ok">порог 95 %</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-fg-3">
              Байесовская оценка по выручке на посетителя. Не останавливайте тест раньше порога: ранние «победы» часто исчезают к выходным.
            </p>
            {e.chart ? (
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="label-mono text-[10px] text-fg-4">₽ на посетителя, накопительно</p>
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

function CompletedCard({ e }: { e: ExperimentView }) {
  const [a, b] = e.variants;
  const winner = e.variants.find((v) => v.id === e.winnerId);
  return (
    <section className="flex flex-col rounded-xl border border-line bg-surface shadow-raise">
      <header className="px-4 pt-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">Завершён</Badge>
          <span className="font-mono text-[11px] text-fg-4">
            {e.startedAt ? formatDateShort(e.startedAt) : ""} – {e.endsAt ? formatDateShort(e.endsAt) : ""} · {METRIC[e.metric].short.toLowerCase()}
          </span>
        </div>
        <h3 className="mt-2 text-[15px] font-semibold tracking-[-0.015em] text-fg">{e.name}</h3>
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
        <p className="text-[12.5px] text-fg-3">
          Победил <span className="text-fg">{winner?.name ?? "—"}</span> · B выигрывал по конверсии с вероятностью{" "}
          {formatPercent((e.probabilityToBeat ?? 0) * 100, { digits: 0 })}, но проиграл по деньгам
        </p>
        {e.learnings ? (
          <div className="mt-3 flex gap-2.5 rounded-lg border border-line bg-surface-2/60 px-3.5 py-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" />
            <div>
              <p className="label-mono text-[10px] text-fg-4">Вывод</p>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{e.learnings}</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DraftCard({ e, onLaunch }: { e: ExperimentView; onLaunch: () => void }) {
  return (
    <section className="flex flex-col rounded-xl border border-dashed border-line-strong bg-surface/60">
      <header className="px-4 pt-4 sm:px-5">
        <div className="flex items-center gap-2">
          <Badge tone="outline">Черновик</Badge>
          <span className="label-mono text-fg-4">цель: {METRIC[e.metric].label}</span>
        </div>
        <h3 className="mt-2 text-[15px] font-semibold tracking-[-0.015em] text-fg">{e.name}</h3>
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
      <div className="mt-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-xs text-fg-3">Минимум 14 дней · ≈ 4 600 посетителей на вариант</p>
        <Button variant="primary" size="sm" onClick={onLaunch} className="self-start sm:self-auto">
          <CirclePlay /> Запустить
        </Button>
      </div>
    </section>
  );
}

/* ───────────── New experiment ───────────── */

type TestKind = "price" | "order" | "badge" | "description";

const TEST_KINDS: { id: TestKind; label: string; hint: string; metric: Experiment["metric"] }[] = [
  { id: "price", label: "Цена", hint: "Две цены одного товара — кому какая, решает сплит", metric: "revenue_per_visitor" },
  { id: "order", label: "Порядок витрины", hint: "Какие категории игрок видит первыми", metric: "conversion" },
  { id: "badge", label: "Бейдж", hint: "«Хит», «Новинка» или «Скидка» на карточке", metric: "avg_check" },
  { id: "description", label: "Описание", hint: "Другой текст и перки на карточке товара", metric: "conversion" },
];

const ORDERS_B = ["Кейсы и наборы сверху", "Подписка Frost+ первой", "Сначала дешёвые товары"];
const BADGES_B = ["Хит", "Новинка", "Скидка", "Мало осталось"];

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

  const pickKind = (k: TestKind) => {
    setKind(k);
    setMetric(TEST_KINDS.find((t) => t.id === k)!.metric);
  };

  const priceNum = Number(price);
  const priceErr = kind === "price" && (!priceNum || priceNum === product?.price) ? "Укажите цену, отличную от текущей" : null;
  const descErr = kind === "description" && descB.trim().length < 10 ? "Напишите новый текст — хотя бы одно предложение" : null;
  const valid = !priceErr && !descErr && !!product;

  const perDay = kind === "order" ? storefrontPerDay : product?.viewsPerDay ?? 0;
  const minShare = Math.min(split, 100 - split) / 100;
  const days = Math.min(90, Math.max(7, Math.ceil(4600 / Math.max(1, perDay * minShare))));

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
    hypothesis: "Новая гипотеза — допишите, чего ждёте и почему.",
    status: launch ? "running" : "draft",
    metric,
    startedAt: launch ? new Date(NOW_MS).toISOString() : undefined,
    dayOf: launch ? 0 : undefined,
    totalDays: launch ? days : undefined,
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
            <p className="label-mono text-[10px] text-fg-4">A · контроль</p>
            <p className="mt-1 text-[13px] text-fg-2">{aLabel}</p>
          </div>
          <div className="rounded-md border border-azure-400/30 bg-azure-500/[0.05] px-3 py-2.5">
            <p className="label-mono mb-1.5 text-[10px] text-azure-300">B · новый вариант</p>
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

        <div className="flex items-start gap-2.5 rounded-lg border border-line bg-[#06080c] px-3.5 py-3">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-ice-300" />
          <p className="text-[12.5px] leading-relaxed text-fg-2">
            Минимум <span className="font-mono text-fg">{pluralize(days, ["день", "дня", "дней"])}</span> при ≈ {formatNumber(Math.round(perDay))} посетителях{" "}
            {kind === "order" ? "витрины" : "карточки"} в день и сплите {100 - split}/{split}. Меньше 7 дней не ставим — нужно захватить выходные.
          </p>
        </div>
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
