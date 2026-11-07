"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CircleAlert, Info, Moon, Rocket, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber, formatPercent, plural, pluralize } from "@/lib/format";
import { campaignTypeMeta, channelMeta, segmentMeta } from "@/lib/mock/meta";
import type { CampaignChannel, CampaignType, PlayerSegment } from "@/lib/mock/types";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Kbd } from "@/components/ui/kbd";
import {
  CHAR_LIMITS,
  FREQ_OPTIONS,
  GLOBAL_CAP_DAYS,
  IN_GAME,
  OFF_GAME,
  SUBTITLE_LIMIT,
  TEMPLATES,
  TEMPLATE_ORDER,
  TITLE_LIMIT,
  TTL_OPTIONS,
  draftFromTemplate,
  freqLabel,
  swapDelay,
  ttlLabel,
  type CampaignDraft,
  type SegmentKey,
} from "./campaign-templates";
import { GameScreen, KNOWN_VARS, MessengerBubble, MinecraftChat, VAR_HINTS, unknownVars, type PreviewVars } from "./game-previews";

export interface BuilderProduct {
  id: string;
  name: string;
  price: number;
}
export interface BuilderServer {
  id: string;
  name: string;
}
/** 30-day results of the project's own campaign of a type — the base for the step-4 estimate */
export interface OwnCampaignStats {
  name: string;
  reached: number;
  converted: number;
  revenue: number;
  discountPct: number;
}

const SHOWS: [string, string, string] = ["показ", "показа", "показов"];
const BUYS: [string, string, string] = ["покупка", "покупки", "покупок"];

/** «−10 % на товар из корзины, 24 часа» / «Подарок: Snow, 7 дней» — what the offer really is. */
export function offerLabel(d: Pick<CampaignDraft, "discountPct" | "productId" | "ttlHours">, productName?: string) {
  const target = d.productId === "cart" ? "на товар из корзины" : d.productId === "rank" ? "на текущую привилегию" : `на ${productName ?? "товар"}`;
  if (d.discountPct > 0) return `−${formatPercent(d.discountPct, { digits: 0 })} ${target}, ${ttlLabel(d.ttlHours)}`;
  if (d.productId.startsWith("p-")) return `Подарок: ${productName ?? "товар"}, ${ttlLabel(d.ttlHours)}`;
  return "Без оффера";
}

const STEPS = [
  { id: 1, label: "Шаблон" },
  { id: 2, label: "Триггер и аудитория" },
  { id: 3, label: "Каналы и сообщение" },
  { id: 4, label: "Превью" },
] as const;

const SEGMENTS: SegmentKey[] = ["all", "whale", "loyal", "new", "at_risk", "dormant"];

export function segmentLabel(s: SegmentKey) {
  return s === "all" ? "Все игроки" : segmentMeta[s as PlayerSegment].label;
}

export function CampaignBuilder({
  open,
  onOpenChange,
  initial,
  mode,
  segmentCounts,
  products,
  servers,
  ownStats,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CampaignDraft;
  mode: "create" | "edit";
  segmentCounts: Record<SegmentKey, number>;
  products: BuilderProduct[];
  servers: BuilderServer[];
  ownStats: Partial<Record<CampaignType, OwnCampaignStats>>;
  onSave: (draft: CampaignDraft, intent: "launch" | "draft") => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="max-w-[880px]"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          // focus the panel itself, not the first stepper button
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        {open ? (
          <BuilderBody
            initial={initial}
            mode={mode}
            segmentCounts={segmentCounts}
            products={products}
            servers={servers}
            ownStats={ownStats}
            onSave={onSave}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

interface Issue {
  level: "error" | "warn" | "hint";
  text: string;
}

function BuilderBody({
  initial,
  mode,
  segmentCounts,
  products,
  servers,
  ownStats,
  onSave,
}: {
  initial: CampaignDraft;
  mode: "create" | "edit";
  segmentCounts: Record<SegmentKey, number>;
  products: BuilderProduct[];
  servers: BuilderServer[];
  ownStats: Partial<Record<CampaignType, OwnCampaignStats>>;
  onSave: (draft: CampaignDraft, intent: "launch" | "draft") => void;
}) {
  const reduce = useReducedMotion();
  const [step, setStep] = React.useState<number>(mode === "edit" ? 3 : 1);
  const [visited, setVisited] = React.useState<number>(mode === "edit" ? 4 : 1);
  const [d, setD] = React.useState<CampaignDraft>(initial);
  const textRef = React.useRef<HTMLTextAreaElement>(null);
  const update = (patch: Partial<CampaignDraft>) => setD((prev) => ({ ...prev, ...patch }));

  const tpl = TEMPLATES[d.type];
  const [sentenceBefore, sentenceAfter] = tpl
    .sentence("§")
    .split("§")
    .map((s) => s.trim());
  const product = products.find((p) => p.id === d.productId);
  const sampleProduct = product ?? { name: "Frost", price: 299 };
  const vars: PreviewVars = {
    player: "kotik228",
    product: sampleProduct.name,
    discount: formatPercent(d.discountPct, { digits: 0 }),
    link: `shop.arcticmc.ru/${(product?.id ?? "p-frost").replace(/^p-/, "")}`,
  };

  const issues = React.useMemo(() => validate(d), [d]);
  const stepErrors = (s: number) => issues[s]?.filter((i) => i.level === "error") ?? [];
  const canNext = stepErrors(step).length === 0;

  const go = (s: number) => {
    setStep(s);
    setVisited((v) => Math.max(v, s));
  };
  const next = () => {
    if (!canNext) return;
    if (step < 4) go(step + 1);
    else onSave(d, "launch");
  };

  const pickTemplate = (type: CampaignType) => {
    if (type === d.type) return;
    const fresh = draftFromTemplate(type, d.servers);
    setD((prev) => ({ ...fresh, id: prev.id, name: prev.name, servers: prev.servers, freqDays: prev.freqDays, quietHours: prev.quietHours }));
  };

  const toggleChannel = (c: CampaignChannel) =>
    update({ channels: d.channels.includes(c) ? d.channels.filter((x) => x !== c) : [...d.channels, c] });

  const insertVar = (v: string) => {
    const token = `{${v}}`;
    const el = textRef.current;
    if (!el) return update({ message: d.message + token });
    const start = el.selectionStart ?? d.message.length;
    const end = el.selectionEnd ?? start;
    update({ message: d.message.slice(0, start) + token + d.message.slice(end) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const segCount = segmentCounts[d.segment] ?? 0;
  // the project's own campaign of this type predicts best; scale it to the chosen audience
  const own = ownStats[d.type];
  const ownBase = segmentCounts[tpl.segment] || 1;
  const reach = own ? Math.round((own.reached * segCount) / ownBase) : Math.round(segCount * tpl.reach30);
  const purchases = tpl.conversion ? Math.round(reach * (own?.reached ? own.converted / own.reached : tpl.conversion / 100)) : 0;
  // own campaign: its average check before the discount; otherwise the sample product
  const listPrice = own?.converted ? own.revenue / own.converted / (1 - own.discountPct / 100) : sampleProduct.price;
  const revenue = Math.round(purchases * listPrice * (1 - d.discountPct / 100));
  const isSample = !product;
  const offGame = d.channels.filter((c): c is "telegram" | "vk" | "discord" => OFF_GAME.includes(c));

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          next();
        }
      }}
    >
      <SheetHeader>
        <p className="label-mono text-fg-3">{mode === "edit" ? "Редактирование" : "Новая кампания"}</p>
        <SheetTitle className="mt-1 text-lg">{d.name.trim() || campaignTypeMeta[d.type].label}</SheetTitle>
        <SheetDescription>{tpl.sentence(d.delay)}</SheetDescription>
        <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Шаги">
          {STEPS.map((s) => {
            const done = s.id < step;
            const current = s.id === step;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => s.id <= visited && go(s.id)}
                  disabled={s.id > visited}
                  aria-current={current ? "step" : undefined}
                  className="group w-full rounded-sm text-left disabled:cursor-not-allowed"
                >
                  <span className="block h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
                    <span
                      className={cn(
                        "block h-full rounded-full transition-[width,background-color] duration-200 ease-[var(--ease-snappy)]",
                        done ? "w-full bg-azure-400" : current ? "w-1/2 bg-azure-400" : "w-0",
                      )}
                    />
                  </span>
                  <span className={cn("mt-2 flex items-center gap-1.5 text-[12px]", current ? "text-fg" : done ? "text-fg-2" : "text-fg-4")}>
                    <span className="font-mono text-[11px] text-fg-4">{done ? <Check className="size-3 text-azure-300" /> : `0${s.id}`}</span>
                    <span className="hidden truncate sm:inline">{s.label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </SheetHeader>

      <SheetBody className="pb-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: reduce ? 0 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduce ? 0 : -10 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 1 ? (
              <div className="space-y-5">
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Шаблон кампании">
                  {TEMPLATE_ORDER.map((type) => {
                    const t = TEMPLATES[type];
                    const active = d.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => pickTemplate(type)}
                        className={cn(
                          "group relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-[border-color,background-color] duration-150",
                          active ? "border-azure-400/60 bg-azure-500/[0.07]" : "border-line bg-surface-2/60 hover:border-line-strong hover:bg-surface-2",
                        )}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="text-[13.5px] font-medium text-fg">{campaignTypeMeta[type].label}</span>
                          <span
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                              active ? "border-azure-400 bg-azure-500 text-white" : "border-line-strong",
                            )}
                          >
                            {active ? <Check className="size-2.5" strokeWidth={3} /> : null}
                          </span>
                        </span>
                        <span className="text-[12.5px] leading-snug text-fg-3">{campaignTypeMeta[type].description}</span>
                        <span className="mt-auto flex items-center justify-between gap-2 pt-1">
                          <span className="flex flex-wrap gap-1">
                            {t.channels.map((c) => (
                              <span key={c} className="rounded-xs bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-fg-3">
                                {channelMeta[c].label}
                              </span>
                            ))}
                          </span>
                          <span className="shrink-0 text-right font-mono text-[11px] text-fg-3">
                            {t.conversion ? (
                              <>
                                <span className="text-fg nums">{formatPercent(t.conversion)}</span>
                                <span className="text-fg-4"> · {t.conversionSource === "own" ? "у вас" : "по сети"}</span>
                              </>
                            ) : (
                              <span className="text-fg-4">без оффера</span>
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="flex items-start gap-2 text-xs text-fg-3">
                  <Info className="mt-px size-3.5 shrink-0 text-fg-4" />
                  Конверсия «у вас» — по вашим кампаниям за 90 дней, «по сети» — медиана похожих серверов PayMC.
                </p>
                <Field label="Название" hint="Видите только вы и команда" htmlFor="cmp-name">
                  <Input
                    id="cmp-name"
                    value={d.name}
                    placeholder={campaignTypeMeta[d.type].label}
                    onChange={(e) => update({ name: e.target.value })}
                    maxLength={48}
                  />
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-6">
                <section>
                  <p className="label-mono mb-2 text-fg-3">Триггер</p>
                  <div className="rounded-lg border border-line bg-surface-2/60 p-3.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[14px] leading-8 text-fg">
                      <Zap className="size-4 text-azure-300" />
                      {sentenceBefore ? <span>{sentenceBefore}</span> : null}
                      <Select
                        value={d.delay}
                        onValueChange={(v) =>
                          // texts that quote the delay («через 3 дня», «первые 6 часов») follow it
                          setD((prev) => ({
                            ...prev,
                            delay: v,
                            message: swapDelay(prev.message, prev.delay, v),
                            title: swapDelay(prev.title, prev.delay, v),
                            subtitle: swapDelay(prev.subtitle, prev.delay, v),
                          }))
                        }
                      >
                        <SelectTrigger size="sm" aria-label={tpl.delayLabel} className="h-7 w-auto gap-1.5 border-azure-400/40 bg-azure-500/10 px-2 font-mono text-azure-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tpl.delays.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {sentenceAfter ? <span>{sentenceAfter}</span> : null}
                    </div>
                    <p className="mt-2 text-xs text-fg-3">{tpl.delayLabel}: событие отслеживает плагин PayMC на сервере — без запросов к вашей базе.</p>
                  </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2">
                  <Field label="Аудитория" htmlFor="cmp-seg" hint={d.segment === "all" ? "Все, кто заходил за 30 дней — как на «Обзоре»" : segmentMeta[d.segment as PlayerSegment].description}>
                    <Select value={d.segment} onValueChange={(v) => update({ segment: v as SegmentKey })}>
                      <SelectTrigger id="cmp-seg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEGMENTS.map((s, i) => (
                          <React.Fragment key={s}>
                            {i === 1 ? <SelectSeparator /> : null}
                            <SelectItem value={s}>
                              {segmentLabel(s)} · {formatNumber(segmentCounts[s] ?? 0)}
                            </SelectItem>
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Частота" htmlFor="cmp-freq" hint={`Поверх общего лимита: не больше одного сообщения в ${GLOBAL_CAP_DAYS} дня по всем кампаниям`}>
                    <Select value={String(d.freqDays)} onValueChange={(v) => update({ freqDays: Number(v) })}>
                      <SelectTrigger id="cmp-freq">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQ_OPTIONS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            Не чаще {freqLabel(n)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </section>

                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="label-mono text-fg-3">Серверы</p>
                    <span className="font-mono text-[11px] text-fg-4">{d.servers.length} из {servers.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {servers.map((s) => {
                      const on = d.servers.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => update({ servers: on ? d.servers.filter((x) => x !== s.id) : [...d.servers, s.id] })}
                          className={cn(
                            "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors",
                            on ? "border-azure-400/50 bg-azure-500/12 text-azure-100" : "border-line text-fg-3 hover:border-line-strong hover:text-fg-2",
                          )}
                        >
                          {on ? <Check className="size-3.5" /> : null}
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                  <IssueList issues={issues[2]} />
                </section>

                <section className="flex items-start justify-between gap-4 rounded-lg border border-line bg-surface-2/60 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Moon className="mt-0.5 size-4 shrink-0 text-ice-300" />
                    <div>
                      <Label htmlFor="cmp-quiet" className="text-fg">
                        Не беспокоить 23:00–09:00
                      </Label>
                      <p className="mt-0.5 text-xs text-fg-3">
                        Telegram и VK ночью копятся и уходят в 09:00 МСК. В игре сообщение увидят, только пока играют.
                      </p>
                    </div>
                  </div>
                  <Switch id="cmp-quiet" checked={d.quietHours} onCheckedChange={(v) => update({ quietHours: v })} />
                </section>

                <p className="flex items-center gap-2 rounded-md bg-white/[0.03] px-3 py-2 text-[12.5px] text-fg-2">
                  <span className="font-mono text-fg nums">≈ {formatNumber(segCount)}</span>
                  {plural(segCount, ["игрок подходит", "игрока подходят", "игроков подходят"])} под аудиторию сейчас
                </p>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-6">
                <section>
                  <p className="label-mono mb-2 text-fg-3">Каналы</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "В игре", list: IN_GAME },
                      { label: "Вне игры", list: OFF_GAME },
                    ].map((g) => (
                      <div key={g.label}>
                        <p className="mb-1.5 text-xs text-fg-4">{g.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {g.list.map((c) => {
                            const on = d.channels.includes(c);
                            return (
                              <button
                                key={c}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggleChannel(c)}
                                className={cn(
                                  "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors",
                                  on ? "border-azure-400/50 bg-azure-500/12 text-azure-100" : "border-line text-fg-3 hover:border-line-strong hover:text-fg-2",
                                )}
                              >
                                {on ? <Check className="size-3.5" /> : null}
                                {channelMeta[c].label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {d.channels.includes("discord") ? (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-warn">
                      <AlertTriangle className="mt-px size-3.5 shrink-0" />
                      Discord заблокирован в РФ — дойдёт до игроков из Казахстана, Беларуси и других стран. Для России — Telegram и VK.
                    </p>
                  ) : null}
                </section>

                <section>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="cmp-msg">Сообщение</Label>
                    <div className="flex flex-wrap gap-1" aria-label="Переменные">
                      {KNOWN_VARS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVar(v)}
                          title={VAR_HINTS[v]}
                          className="h-6 rounded-xs border border-line bg-surface-3 px-1.5 font-mono text-[11px] text-ice-300 transition-colors hover:border-ice-400/40 hover:text-ice-200"
                        >
                          {`{${v}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    id="cmp-msg"
                    ref={textRef}
                    value={d.message}
                    onChange={(e) => update({ message: e.target.value })}
                    rows={3}
                    spellCheck={false}
                    aria-invalid={stepErrors(3).some((i) => i.text.includes("переменн") || i.text.includes("256")) || undefined}
                    className="font-mono text-[13px]"
                  />
                  <div className="mt-1.5 flex items-start justify-between gap-3">
                    <IssueList issues={issues[3]} className="mt-0" />
                    <span className={cn("ml-auto shrink-0 font-mono text-[11px] nums", d.message.length > 256 ? "text-bad" : "text-fg-4")}>
                      {d.message.length}/256
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs text-fg-4">Так строка выглядит в чате</p>
                    <MinecraftChat message={d.message || "…"} vars={vars} context={false} className="bg-black/70" />
                  </div>
                </section>

                {d.channels.includes("title") || d.channels.includes("bossbar") ? (
                  <section className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Титр и боссбар: заголовок"
                      htmlFor="cmp-title"
                      error={d.title.length > TITLE_LIMIT ? `Длиннее ${TITLE_LIMIT} символов — на экране обрежется` : undefined}
                      hint={`${d.title.length}/${TITLE_LIMIT}`}
                    >
                      <Input id="cmp-title" value={d.title} onChange={(e) => update({ title: e.target.value })} aria-invalid={d.title.length > TITLE_LIMIT || undefined} />
                    </Field>
                    <Field label="Подзаголовок" htmlFor="cmp-sub" hint={`${d.subtitle.length}/${SUBTITLE_LIMIT}`}>
                      <Input id="cmp-sub" value={d.subtitle} onChange={(e) => update({ subtitle: e.target.value })} maxLength={SUBTITLE_LIMIT} />
                    </Field>
                  </section>
                ) : null}

                <section className="rounded-lg border border-line bg-surface-2/60 p-3.5">
                  <p className="label-mono mb-3 text-fg-3">Оффер</p>
                  <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr_1fr]">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <Label htmlFor="cmp-discount">Скидка</Label>
                        <span className="font-mono text-[13px] text-fg nums">{d.discountPct ? `−${formatPercent(d.discountPct, { digits: 0 })}` : "без скидки"}</span>
                      </div>
                      <Slider
                        id="cmp-discount"
                        aria-label="Скидка, %"
                        min={0}
                        max={50}
                        step={5}
                        value={[d.discountPct]}
                        onValueChange={([v]) => update({ discountPct: v })}
                      />
                    </div>
                    <Field label="Товар" htmlFor="cmp-product">
                      <Select value={d.productId} onValueChange={(v) => update({ productId: v })}>
                        <SelectTrigger id="cmp-product" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cart">Товар из корзины</SelectItem>
                          <SelectItem value="rank">Текущая привилегия игрока</SelectItem>
                          <SelectSeparator />
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} · {formatMoney(p.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Срок действия" htmlFor="cmp-ttl">
                      <Select value={String(d.ttlHours)} onValueChange={(v) => update({ ttlHours: Number(v) })}>
                        <SelectTrigger id="cmp-ttl" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TTL_OPTIONS.map((h) => (
                            <SelectItem key={h} value={String(h)}>
                              {ttlLabel(h)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  {d.discountPct > 0 ? (
                    <p className="mt-3 font-mono text-[12px] text-fg-3">
                      {isSample ? "Например, " : ""}
                      {sampleProduct.name}: <span className="text-fg-4 line-through">{formatMoney(sampleProduct.price)}</span>{" "}
                      <span className="text-fg">{formatMoney(Math.round(sampleProduct.price * (1 - d.discountPct / 100)))}</span> · персональная цена сгорит через{" "}
                      {ttlLabel(d.ttlHours)}
                    </p>
                  ) : product ? (
                    <p className="mt-3 font-mono text-[12px] text-fg-3">
                      <span className="text-fg">{product.name}</span> в подарок при входе · оффер действует {ttlLabel(d.ttlHours)}
                    </p>
                  ) : null}
                </section>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="label-mono text-fg-3">Что увидит игрок</p>
                  <p className="font-mono text-[11px] text-fg-4">
                    {"{player}"} = kotik228 · {"{product}"} = {vars.product} · {"{discount}"} = {vars.discount}
                  </p>
                </div>
                <GameScreen
                  channels={d.channels}
                  message={d.message}
                  title={d.title}
                  subtitle={d.subtitle}
                  bossbarText={`${d.title} · ещё ${ttlLabel(d.ttlHours)}`}
                  bossbarPct={72}
                  vars={vars}
                  onEnable={(c) => toggleChannel(c)}
                />
                {offGame.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {offGame.map((c) => (
                      <MessengerBubble
                        key={c}
                        kind={c}
                        message={d.message}
                        vars={vars}
                        note={d.quietHours ? "ночью — в 09:00" : undefined}
                      />
                    ))}
                  </div>
                ) : null}

                <dl className="grid gap-x-6 gap-y-2.5 rounded-lg border border-line bg-surface-2/60 p-4 text-[13px] sm:grid-cols-2">
                  <Summary k="Триггер" v={tpl.sentence(d.delay)} />
                  <Summary k="Аудитория" v={`${segmentLabel(d.segment)} · ≈ ${pluralize(segCount, ["игрок", "игрока", "игроков"])}`} />
                  <Summary k="Каналы" v={d.channels.map((c) => channelMeta[c].label).join(", ") || "—"} />
                  <Summary k="Оффер" v={offerLabel(d, product?.name)} />
                  <Summary k="Частота" v={`Не чаще ${freqLabel(d.freqDays)}${d.quietHours ? " · тихие часы 23–09" : ""}`} />
                  <Summary k="Серверы" v={servers.filter((s) => d.servers.includes(s.id)).map((s) => s.name).join(", ")} />
                </dl>

                <div className="flex flex-col gap-1 rounded-lg border border-azure-400/25 bg-azure-500/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[13px] text-fg-2">
                    Оценка на 30 дней {own ? <>— по вашей кампании «{own.name}»</> : "— по похожим серверам PayMC"}
                  </p>
                  <p className="font-mono text-[13px] text-fg nums">
                    {tpl.conversion ? (
                      <>
                        ≈ {pluralize(reach, SHOWS)} → {pluralize(purchases, BUYS)} → {formatMoney(revenue)}
                      </>
                    ) : (
                      <>≈ {pluralize(reach, SHOWS)} · без оффера</>
                    )}
                  </p>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </SheetBody>

      <SheetFooter className="justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => go(Math.max(1, step - 1))} disabled={step === 1} aria-label="Назад" className="px-2 sm:px-3">
          <ArrowLeft /> <span className="hidden sm:inline">Назад</span>
        </Button>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 text-[11px] text-fg-4 md:flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>↵</Kbd>
          </span>
          {step === 4 ? (
            <Button variant="secondary" size="sm" onClick={() => onSave(d, "draft")}>
              Черновик
            </Button>
          ) : null}
          <Button variant="primary" size="sm" onClick={next} disabled={!canNext}>
            {step < 4 ? (
              <>
                Далее <ArrowRight />
              </>
            ) : (
              <>
                <Rocket /> {mode === "edit" ? "Сохранить" : "Запустить"}
                <span className="-ml-1 hidden sm:inline">{mode === "edit" ? " и запустить" : " кампанию"}</span>
              </>
            )}
          </Button>
        </div>
      </SheetFooter>
    </div>
  );
}

function Summary({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="label-mono text-fg-4">{k}</dt>
      <dd className="text-fg-2">{v}</dd>
    </div>
  );
}

function IssueList({ issues, className }: { issues?: Issue[]; className?: string }) {
  if (!issues?.length) return null;
  return (
    <ul className={cn("mt-2 space-y-1", className)}>
      {issues.map((i) => (
        <li
          key={i.text}
          className={cn("flex items-start gap-1.5 text-xs", i.level === "error" ? "text-bad" : i.level === "warn" ? "text-warn" : "text-fg-3")}
        >
          {i.level === "hint" ? <Info className="mt-px size-3.5 shrink-0" /> : <CircleAlert className="mt-px size-3.5 shrink-0" />}
          {i.text}
        </li>
      ))}
    </ul>
  );
}

function validate(d: CampaignDraft): Record<number, Issue[]> {
  const s2: Issue[] = [];
  const s3: Issue[] = [];
  if (!d.servers.length) s2.push({ level: "error", text: "Выберите хотя бы один сервер" });
  if (!d.channels.length) s3.push({ level: "error", text: "Включите хотя бы один канал" });
  if (!d.message.trim()) s3.push({ level: "error", text: "Напишите текст сообщения" });
  const unknown = unknownVars(`${d.message} ${d.title} ${d.subtitle}`);
  if (unknown.length) s3.push({ level: "error", text: `Неизвестная переменная ${unknown.join(", ")} — доступны {player}, {product}, {discount}, {link}` });
  if (d.channels.includes("chat") && d.message.length > (CHAR_LIMITS.chat ?? 256))
    s3.push({ level: "error", text: "Чат Minecraft обрезает сообщения длиннее 256 символов" });
  if (d.channels.includes("actionbar") && d.message.length > (CHAR_LIMITS.actionbar ?? 70))
    s3.push({ level: "warn", text: "Экшнбар показывает ~70 символов — сократите текст или выключите канал" });
  if (/\{discount\}/.test(`${d.message}${d.title}${d.subtitle}`) && d.discountPct === 0)
    s3.push({ level: "warn", text: "В тексте есть {discount}, а скидка 0 % — игрок увидит «0 %»" });
  if (d.discountPct > 0 && !d.message.includes("{link}"))
    s3.push({ level: "hint", text: "Добавьте {link} — в чате ссылка кликабельна и открывает оффер сразу" });
  return { 2: s2, 3: s3 };
}

export { STEPS };
