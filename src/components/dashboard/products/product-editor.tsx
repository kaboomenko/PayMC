"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowUpRight, CircleAlert, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber, formatPercent, pluralize } from "@/lib/format";
import { productKindMeta, serverStatusMeta } from "@/lib/mock/meta";
import type { DeliveryCommand, ProductKind } from "@/lib/mock/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Progress } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusDot } from "@/components/ui/status-dot";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { CommandBuilder } from "./command-builder";
import { commandIssues } from "./dry-run";
import { ChatPreview, PreviewCard, RulesCheck, RulesInline, StorefrontPreview } from "./editor-preview";
import { PerksEditor, type Perk } from "./perks-editor";
import { ProductArt, ART_TINTS } from "./product-art";
import { BADGE_META, KIND_ORDER, STATUS_META, glyphFromName, type ProductBadge, type ProductStatus } from "./product-meta";
import { ProductStats } from "./product-stats";
import { checkRules } from "./rules-check";
import type { EditorContext, EditorProduct, EditorServer, ProductStatsData } from "./types";
import { useLeaveGuard } from "./use-leave-guard";

type DurationMode = "once" | "7" | "30" | "90" | "forever" | "custom";

interface FormState {
  name: string;
  kind: ProductKind;
  description: string;
  perks: Perk[];
  price: string;
  oldPrice: string;
  duration: DurationMode;
  customDays: string;
  stockOn: boolean;
  stock: string;
  commands: DeliveryCommand[];
  serverIds: string[];
  status: ProductStatus;
  badge: ProductBadge | "none";
  tint: number;
  glyph: string;
  chatMessage: string;
  pool: { target: string; minContribution: string; deadline: string; refundIfFailed: boolean };
}

const STATUS_TONE = { online: "ok", degraded: "warn", offline: "bad" } as const;
/** A pool contribution is not a purchase: thank for the contribution and show the progress instead of a term. */
const defaultMessage = (kind: ProductKind) => (kind === "pool" ? "Спасибо за взнос! Собрано {raised} из {target}." : "Спасибо за покупку! {product} — {expires}.");

function toForm(p: EditorProduct, defaultDeadline: string): FormState {
  const d = p.durationDays;
  const duration: DurationMode = d === undefined ? "once" : d === null ? "forever" : d === 7 || d === 30 || d === 90 ? (String(d) as DurationMode) : "custom";
  return {
    name: p.name,
    kind: p.kind,
    description: p.description,
    perks: p.perks.map((text, i) => ({ id: `perk-${i}`, text })),
    price: p.price ? String(p.price) : "",
    oldPrice: p.oldPrice ? String(p.oldPrice) : "",
    duration,
    customDays: duration === "custom" && typeof d === "number" ? String(d) : "14",
    stockOn: typeof p.stock === "number",
    stock: typeof p.stock === "number" ? String(p.stock) : "100",
    commands: p.commands,
    serverIds: p.serverIds,
    status: p.status,
    badge: p.badge ?? "none",
    tint: p.tint,
    glyph: p.glyph,
    chatMessage: defaultMessage(p.kind),
    pool: p.pool
      ? {
          target: String(p.pool.target),
          minContribution: String(p.pool.minContribution),
          deadline: p.pool.deadline,
          refundIfFailed: p.pool.refundIfFailed,
        }
      : { target: "3000", minContribution: "50", deadline: defaultDeadline, refundIfFailed: true },
  };
}

const num = (s: string) => {
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

function durationOf(f: FormState): number | null | undefined {
  if (f.duration === "once") return undefined;
  if (f.duration === "forever") return null;
  if (f.duration === "custom") return Math.round(num(f.customDays)) || 0;
  return Number(f.duration);
}

const serialize = (f: FormState) => JSON.stringify({ ...f, perks: f.perks.map((p) => p.text) });

export function ProductEditor({
  product,
  servers,
  ctx,
  stats,
  defaultDeadline,
}: {
  product: EditorProduct;
  servers: EditorServer[];
  ctx: EditorContext;
  stats: ProductStatsData | null;
  defaultDeadline: string;
}) {
  const reduce = useReducedMotion();
  const isNew = product.id === null;
  const [initial, setInitial] = React.useState(() => toForm(product, defaultDeadline));
  const [form, setForm] = React.useState(initial);
  const [tab, setTab] = React.useState("setup");
  const [showErrors, setShowErrors] = React.useState(false);
  const [glyphTouched, setGlyphTouched] = React.useState(!isNew);
  const seq = React.useRef(0);
  const newId = React.useCallback(() => {
    seq.current += 1;
    return `new-${seq.current}`;
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const isPool = form.kind === "pool";
  const durationDays = isPool ? undefined : durationOf(form);
  const price = num(form.price);
  const oldPrice = form.oldPrice.trim() ? num(form.oldPrice) : undefined;
  const poolTarget = num(form.pool.target);
  const poolMin = num(form.pool.minContribution);
  const category = productKindMeta[form.kind].category;

  const commandErrors = form.commands.filter((c) =>
    commandIssues(c.template, ctx.game, durationDays, ctx.gameName).some((i) => i.level === "error" && (showErrors || i.code !== "empty")),
  ).length;
  const errors = {
    name: !form.name.trim() && (showErrors || initial.name.trim()) ? "Без названия товар не опубликовать" : undefined,
    price: !isPool && !(price > 0) && (showErrors || form.price !== "") ? "Укажите цену больше нуля" : undefined,
    oldPrice: oldPrice !== undefined && (!(oldPrice > 0) || oldPrice <= price) ? "Старая цена должна быть выше текущей — иначе скидку не покажем" : undefined,
    customDays: !isPool && form.duration === "custom" && !(durationDays && durationDays >= 1 && durationDays <= 3650) ? "От 1 до 3 650 дней" : undefined,
    stock: form.stockOn && !(num(form.stock) >= 0) ? "Укажите число от 0" : undefined,
    servers: !form.serverIds.length ? "Выберите хотя бы один сервер — иначе выдавать некуда" : undefined,
    poolTarget: isPool && !(poolTarget >= 100) ? "Цель — от 100 ₽" : undefined,
    poolMin: isPool && (!(poolMin >= 10) || poolMin > poolTarget) ? "От 10 ₽ и не больше цели" : undefined,
    commands: commandErrors ? `${commandErrors}` : undefined,
    noCommands: showErrors && !form.commands.length ? "Добавьте хотя бы одну команду выдачи" : undefined,
  };
  const errorCount = Object.values(errors).filter(Boolean).length;
  const dirty = serialize(form) !== serialize(initial);

  const verdict = checkRules({
    description: form.description,
    perks: form.perks.map((p) => p.text),
    commands: form.commands.map((c) => c.template),
  });
  const flaggedPerks = new Set(
    [...verdict.advantage, ...verdict.grey].filter((h) => h.where === "perk" && h.index !== undefined).map((h) => h.index as number),
  );

  const save = () => {
    setShowErrors(true);
    // validate against the "show all" rules
    const blocking =
      !form.name.trim() ||
      (!isPool && !(num(form.price) > 0)) ||
      !form.serverIds.length ||
      !form.commands.length ||
      Object.entries(errors).some(([k, v]) => v && k !== "name" && k !== "price" && k !== "noCommands");
    if (blocking) {
      toast.error("Не сохранили — есть ошибки", { description: "Поля с ошибками подсвечены красным" });
      return false;
    }
    setInitial(form);
    setShowErrors(false);
    toast.success(isNew ? "Товар создан" : "Товар сохранён", {
      description: form.status === "active" ? "Изменения уже на витрине и в командах выдачи" : "Игроки не видят товар, пока он не активен",
    });
    return true;
  };

  const cancel = () => {
    setForm(initial);
    setShowErrors(false);
    toast("Изменения отменены");
  };

  // ⌘S / Ctrl+S
  const saveRef = React.useRef(save);
  React.useEffect(() => {
    saveRef.current = save;
  });
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // unsaved changes: ask before any in-app navigation, Back/Forward or closing the tab
  const [leave, setLeave] = React.useState<{ proceed: () => void } | null>(null);
  useLeaveGuard(dirty, (proceed) => setLeave({ proceed }));
  const leaveWith = (saveFirst: boolean) => {
    const next = leave;
    setLeave(null);
    if (!next || (saveFirst && !save())) return;
    next.proceed();
  };

  const rulesCheck = (
    <RulesCheck
      verdict={verdict}
      gameName={ctx.gameName}
      rules={ctx.gameRules}
      perks={form.perks.map((p) => p.text)}
      onRemovePerk={(i) => {
        const removed = form.perks[i];
        set(
          "perks",
          form.perks.filter((_, j) => j !== i),
        );
        toast(`Перк «${removed.text}» убран`, {
          action: {
            label: "Вернуть",
            onClick: () =>
              setForm((f) => {
                const perks = [...f.perks];
                perks.splice(i, 0, removed);
                return { ...f, perks };
              }),
          },
        });
      }}
    />
  );

  const fee = price > 0 ? price * ctx.feeRate : 0;
  const allServersOn = servers.length > 0 && servers.every((s) => form.serverIds.includes(s.id));
  const offlineSelected = servers.filter((s) => form.serverIds.includes(s.id) && s.status === "offline");

  return (
    <div className={cn(dirty && "pb-20")}>
      {/* header */}
      <div className="mb-5">
        <Link href="/dashboard/products" className="inline-flex items-center gap-1 text-xs text-fg-3 transition-colors hover:text-fg-2">
          <ArrowLeft className="size-3.5" /> Товары
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <ProductArt tint={form.tint} glyph={form.glyph} size={46} />
            <div className="min-w-0">
              <h1 className="truncate text-[24px] leading-tight font-semibold tracking-[-0.03em] text-fg">
                {form.name.trim() || (isNew ? "Новый товар" : "Без названия")}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-fg-3">
                <Badge tone={STATUS_META[form.status].tone === "ok" ? "ok" : "neutral"} dot>
                  {STATUS_META[form.status].label}
                </Badge>
                <span>{productKindMeta[form.kind].label}</span>
                {product.id ? (
                  <span className="font-mono text-[11px] text-fg-4">{product.id}</span>
                ) : product.copyOf ? (
                  <span className="text-fg-4">
                    копия{" "}
                    <Link href={`/dashboard/products/${product.copyOf.id}`} className="text-fg-3 underline decoration-line-strong underline-offset-4 hover:text-fg-2">
                      «{product.copyOf.name}»
                    </Link>{" "}
                    · ещё не сохранена
                  </span>
                ) : (
                  <span className="text-fg-4">ещё не сохранён</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isNew ? (
              <Button asChild variant="secondary" size="sm">
                <a href="/s/arctic" target="_blank" rel="noreferrer">
                  На витрине <ArrowUpRight />
                </a>
              </Button>
            ) : null}
            <Button variant={dirty ? "secondary" : "primary"} size="sm" onClick={save} disabled={!dirty && !isNew}>
              {isNew ? "Создать товар" : "Сохранить"}
              <Kbd className="hidden h-[18px] border-white/25 bg-white/10 text-[11px] text-white sm:inline-flex">⌘S</Kbd>
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="setup">Настройка</TabsTrigger>
          <TabsTrigger value="stats">
            Статистика
            {stats?.sales30d ? <span className="font-mono text-[11px] text-fg-4 nums">{formatNumber(stats.sales30d)}</span> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="pt-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] xl:items-start">
            {/* ── left: form ── */}
            <div className="min-w-0 space-y-5">
              <Section title="Основное" description="Что увидит игрок на витрине">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                  <Field
                    label="Название"
                    htmlFor="p-name"
                    error={errors.name}
                    aside={<span className="font-mono text-[11px] text-fg-4 nums">{form.name.length}/48</span>}
                  >
                    <Input
                      id="p-name"
                      value={form.name}
                      maxLength={48}
                      placeholder="Например, Frost"
                      aria-invalid={!!errors.name || undefined}
                      onChange={(e) => {
                        const name = e.target.value;
                        setForm((f) => ({ ...f, name, glyph: glyphTouched ? f.glyph : glyphFromName(name || "?") }));
                      }}
                    />
                  </Field>
                  <Field label="Категория" htmlFor="p-kind">
                    <Select
                      value={form.kind}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          kind: v as ProductKind,
                          // an untouched default message follows the category (purchase ↔ pool contribution)
                          chatMessage: f.chatMessage === defaultMessage(f.kind) ? defaultMessage(v as ProductKind) : f.chatMessage,
                        }))
                      }
                    >
                      <SelectTrigger id="p-kind">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KIND_ORDER.map((k) => (
                          <SelectItem key={k} value={k}>
                            {productKindMeta[k].category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field
                  label="Описание"
                  htmlFor="p-desc"
                  className="mt-4"
                  hint="Одно-два предложения. Числа убеждают лучше прилагательных: «3 дома», «на 30 дней»."
                  aside={<span className="font-mono text-[11px] text-fg-4 nums">{form.description.length}/280</span>}
                >
                  <Textarea id="p-desc" rows={3} maxLength={280} value={form.description} onChange={(e) => set("description", e.target.value)} />
                </Field>
                <div className="mt-4">
                  <p className="mb-1.5 text-[13px] font-medium text-fg-2">Перки на карточке</p>
                  <PerksEditor perks={form.perks} onChange={(perks) => set("perks", perks)} flagged={flaggedPerks} newId={newId} />
                  {/* on wide screens the full check sits first in the sticky aside, next to this field */}
                  <RulesInline verdict={verdict} gameName={ctx.gameName} className="xl:hidden" />
                </div>
              </Section>

              {isPool ? (
                <Section title="Складчина" description="Игроки скидываются вместе — товар выдаётся, когда сумма собрана">
                  {product.pool && product.pool.raised > 0 ? (
                    <div className="mb-4 rounded-lg border border-line bg-surface-2/60 p-3">
                      <div className="mb-2 flex items-baseline justify-between text-[12.5px]">
                        <span className="text-fg-2">
                          Собрано <span className="font-mono text-fg nums">{formatMoney(product.pool.raised)}</span>
                          <span className="text-fg-4"> из {formatMoney(poolTarget > 0 ? poolTarget : product.pool.target)}</span>
                        </span>
                        <span className="flex items-center gap-1 text-fg-3">
                          <Users className="size-3.5" /> {pluralize(product.pool.contributors, ["участник", "участника", "участников"])}
                        </span>
                      </div>
                      <Progress value={product.pool.raised} max={poolTarget > 0 ? poolTarget : product.pool.target} tone="ice" />
                    </div>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Цель" htmlFor="pool-target" error={errors.poolTarget}>
                      <Input id="pool-target" inputMode="numeric" value={form.pool.target} onChange={(e) => set("pool", { ...form.pool, target: e.target.value })} trailing={<span className="font-mono text-xs">₽</span>} />
                    </Field>
                    <Field label="Мин. взнос" htmlFor="pool-min" error={errors.poolMin}>
                      <Input id="pool-min" inputMode="numeric" value={form.pool.minContribution} onChange={(e) => set("pool", { ...form.pool, minContribution: e.target.value })} trailing={<span className="font-mono text-xs">₽</span>} />
                    </Field>
                    <Field label="Дедлайн" htmlFor="pool-deadline">
                      <Input id="pool-deadline" type="date" value={form.pool.deadline} onChange={(e) => set("pool", { ...form.pool, deadline: e.target.value })} className="[color-scheme:dark]" />
                    </Field>
                  </div>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface-2/40 p-3">
                    <Switch checked={form.pool.refundIfFailed} onCheckedChange={(v) => set("pool", { ...form.pool, refundIfFailed: v })} className="mt-0.5" aria-label="Вернуть взносы, если не собрали" />
                    <span>
                      <span className="block text-[13px] font-medium text-fg">Вернуть взносы, если не собрали</span>
                      <span className="mt-0.5 block text-xs text-fg-3">
                        Деньги вернутся тем же способом, которым платили. Иначе взносы останутся вам, а участники получат уведомление в чате и Telegram.
                      </span>
                    </span>
                  </label>
                </Section>
              ) : (
                <Section title="Цена и срок">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Цена"
                      htmlFor="p-price"
                      error={errors.price}
                      hint={fee > 0 ? `Вам — ${formatMoney(price - fee, { fraction: true })} с продажи, комиссия ${ctx.feeLabel} всё включает` : undefined}
                    >
                      <Input
                        id="p-price"
                        inputMode="decimal"
                        value={form.price}
                        onChange={(e) => set("price", e.target.value)}
                        aria-invalid={!!errors.price || undefined}
                        trailing={<span className="font-mono text-xs">₽</span>}
                        className="[&_input]:font-mono"
                      />
                    </Field>
                    <Field
                      label="Старая цена"
                      htmlFor="p-old"
                      error={errors.oldPrice}
                      hint={oldPrice && oldPrice > price && price > 0 ? `На витрине: скидка −${formatPercent((1 - price / oldPrice) * 100, { digits: 0 })}` : "Необязательно — для зачёркнутой цены"}
                    >
                      <Input
                        id="p-old"
                        inputMode="decimal"
                        value={form.oldPrice}
                        placeholder="—"
                        onChange={(e) => set("oldPrice", e.target.value)}
                        aria-invalid={!!errors.oldPrice || undefined}
                        trailing={<span className="font-mono text-xs">₽</span>}
                        className="[&_input]:font-mono"
                      />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <p className="mb-1.5 text-[13px] font-medium text-fg-2">Срок действия</p>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="scrollbar-none -mx-1 max-w-full overflow-x-auto px-1">
                        <Segmented
                          value={form.duration}
                          onChange={(v) => set("duration", v)}
                          options={[
                            { value: "once", label: "Разово" },
                            { value: "7", label: "7 дней" },
                            { value: "30", label: "30 дней" },
                            { value: "90", label: "90 дней" },
                            { value: "forever", label: "Навсегда" },
                            { value: "custom", label: "Свой" },
                          ]}
                        />
                      </div>
                      {form.duration === "custom" ? (
                        <Input
                          aria-label="Свой срок, дней"
                          inputMode="numeric"
                          value={form.customDays}
                          onChange={(e) => set("customDays", e.target.value)}
                          aria-invalid={!!errors.customDays || undefined}
                          trailing={<span className="text-xs">дн.</span>}
                          className="w-28 [&_input]:h-8 [&_input]:font-mono"
                        />
                      ) : null}
                    </div>
                    <p className={cn("mt-1.5 text-xs", errors.customDays ? "text-bad" : "text-fg-3")}>
                      {errors.customDays ??
                        (form.duration === "once"
                          ? "Разовая выдача — валюта, ключи, разбан. {days} в командах не нужен."
                          : form.duration === "forever"
                            ? "Без срока: в командах используйте «parent add», а не «addtemp»."
                            : `{days} в командах станет ${durationDays}. Повторная покупка продлит срок, если в команде есть accumulate.`)}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
                    <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg-2 select-none">
                      <Switch checked={form.stockOn} onCheckedChange={(v) => set("stockOn", v)} aria-label="Ограничить количество" />
                      Ограничить количество
                    </label>
                    {form.stockOn ? (
                      <Input
                        aria-label="Сколько осталось, штук"
                        inputMode="numeric"
                        value={form.stock}
                        onChange={(e) => set("stock", e.target.value)}
                        aria-invalid={!!errors.stock || undefined}
                        trailing={<span className="text-xs">шт.</span>}
                        className="w-28 [&_input]:h-8 [&_input]:font-mono"
                      />
                    ) : null}
                    <span className="text-xs text-fg-4">
                      {form.stockOn ? "Когда закончится, карточка покажет «Нет в наличии»" : "Для лимитированных ивент-товаров"}
                    </span>
                  </div>
                </Section>
              )}

              <Section
                title="Выдача"
                description={isPool ? "Выполним один раз, когда сумма будет собрана — не после каждого взноса" : "Сервер выполнит эти команды в консоли сразу после оплаты"}
                aside={errors.commands ? <Badge tone="bad">{pluralize(commandErrors, ["ошибка", "ошибки", "ошибок"])}</Badge> : form.commands.length ? <Badge tone="neutral">{pluralize(form.commands.length, ["команда", "команды", "команд"])}</Badge> : null}
              >
                {errors.noCommands ? (
                  <p className="mb-3 flex items-center gap-1.5 text-xs text-bad">
                    <CircleAlert className="size-3.5" /> {errors.noCommands}
                  </p>
                ) : null}
                <CommandBuilder
                  commands={form.commands}
                  onChange={(c) => set("commands", c)}
                  game={ctx.game}
                  gameName={ctx.gameName}
                  servers={servers}
                  productServerIds={form.serverIds}
                  durationDays={durationDays}
                  newId={newId}
                  isPool={isPool}
                />
              </Section>

              <Section
                title="Серверы"
                description="Где товар можно купить и куда уйдут команды"
                aside={
                  <button
                    type="button"
                    onClick={() => set("serverIds", allServersOn ? [] : servers.map((s) => s.id))}
                    className="text-xs text-fg-3 underline-offset-4 hover:text-fg-2 hover:underline"
                  >
                    {allServersOn ? "Снять все" : "Выбрать все"}
                  </button>
                }
              >
                <ul className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line">
                  {servers.map((s) => {
                    const checked = form.serverIds.includes(s.id);
                    return (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.02]">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => set("serverIds", v ? [...form.serverIds, s.id] : form.serverIds.filter((x) => x !== s.id))}
                            aria-label={s.name}
                          />
                          <StatusDot tone={STATUS_TONE[s.status]} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium text-fg">{s.name}</span>
                            <span className="block truncate font-mono text-[11px] text-fg-4">{s.platform}</span>
                          </span>
                          <span className="shrink-0 text-right text-xs">
                            <span className={cn("block", s.status === "online" ? "text-fg-3" : s.status === "degraded" ? "text-warn" : "text-bad")}>
                              {serverStatusMeta[s.status].label}
                            </span>
                            <span className="block font-mono text-[11px] text-fg-4 nums">
                              {s.status === "offline" ? `с ${s.offlineSince}` : `${formatNumber(s.online)} онлайн`}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {errors.servers ? <p className="mt-2 text-xs text-bad">{errors.servers}</p> : null}
                {offlineSelected.length ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-fg-3">
                    <StatusDot tone="bad" className="mt-1 size-1.5" />
                    {offlineSelected.map((s) => `«${s.name}»`).join(", ")} сейчас без связи — покупки будут ждать в очереди и выдадутся после подключения.
                  </p>
                ) : null}
              </Section>

              <Section title="Видимость">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-[13px] font-medium text-fg-2">Статус</p>
                    <Segmented
                      value={form.status}
                      onChange={(v) => set("status", v)}
                      options={(["active", "draft", "hidden"] as const).map((s) => ({ value: s, label: STATUS_META[s].label }))}
                    />
                    <p className="mt-1.5 text-xs text-fg-3">
                      {form.status === "active"
                        ? "Товар в магазине и в меню /donate на сервере."
                        : form.status === "draft"
                          ? "Виден только команде проекта."
                          : "Скрыт с витрины, прямая ссылка ведёт в каталог."}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[13px] font-medium text-fg-2">Бейдж</p>
                    <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
                      <Segmented
                        value={form.badge}
                        onChange={(v) => set("badge", v)}
                        options={[{ value: "none" as const, label: "Нет" }, ...(Object.keys(BADGE_META) as ProductBadge[]).map((b) => ({ value: b, label: BADGE_META[b].label }))]}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 border-t border-line-soft pt-4">
                  <p className="mb-2 text-[13px] font-medium text-fg-2">Обложка</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div role="radiogroup" aria-label="Цвет обложки" className="flex items-center gap-1.5">
                      {Array.from({ length: ART_TINTS }, (_, t) => (
                        <button
                          key={t}
                          type="button"
                          role="radio"
                          aria-checked={form.tint === t}
                          aria-label={`Вариант ${t + 1}`}
                          onClick={() => set("tint", t)}
                          className={cn(
                            "rounded-md p-0.5 ring-1 transition-[box-shadow,opacity]",
                            form.tint === t ? "ring-azure-400" : "opacity-70 ring-transparent hover:opacity-100",
                          )}
                        >
                          <ProductArt tint={t} glyph={form.glyph} size={34} />
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-fg-3">
                      Символы
                      <input
                        value={form.glyph}
                        maxLength={3}
                        onChange={(e) => {
                          setGlyphTouched(true);
                          set("glyph", e.target.value);
                        }}
                        className="h-8 w-16 rounded-md border border-line bg-surface-2 px-2 text-center font-display text-[14px] font-semibold text-fg outline-none hover:border-line-strong focus:border-azure-500/70"
                      />
                    </label>
                  </div>
                </div>
              </Section>
            </div>

            {/* ── right: live previews ── */}
            {/* the aside is taller than the viewport: it scrolls on its own, and the rules check comes first —
                it reacts to the description and perks the owner is editing on the left */}
            <aside
              className="min-w-0 space-y-4 [scrollbar-color:var(--color-line-strong)_transparent] [scrollbar-width:thin] xl:sticky xl:top-[72px] xl:-mx-1 xl:max-h-[calc(100dvh-88px)] xl:overflow-y-auto xl:px-1 xl:pb-1"
              aria-label="Предпросмотр"
            >
              {rulesCheck}
              <StorefrontPreview
                name={form.name}
                category={category}
                description={form.description}
                perks={form.perks.map((p) => p.text)}
                price={price > 0 ? price : 0}
                oldPrice={oldPrice}
                durationDays={durationDays}
                badge={form.badge === "none" ? undefined : form.badge}
                tint={form.tint}
                glyph={form.glyph}
                domain="shop.arcticmc.ru"
                pool={isPool ? { target: poolTarget > 0 ? poolTarget : 0, raised: product.pool?.raised ?? 0, contributors: product.pool?.contributors ?? 0, min: poolMin > 0 ? poolMin : 0 } : undefined}
              />
              <div>
                <ChatPreview
                  prefix={ctx.chatPrefix}
                  player="kotik228"
                  productName={form.name}
                  durationDays={durationDays}
                  price={isPool ? (poolMin > 0 ? poolMin : 0) : price}
                  message={form.chatMessage}
                  now={ctx.now}
                  pool={isPool ? { raised: (product.pool?.raised ?? 0) + (poolMin > 0 ? poolMin : 0), target: poolTarget > 0 ? poolTarget : 0 } : undefined}
                />
                <MessageField value={form.chatMessage} onChange={(v) => set("chatMessage", v)} isPool={isPool} />
              </div>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="pt-5">
          <ProductStats stats={stats} now={ctx.now} productName={product.name} isNew={isNew} isPool={product.kind === "pool"} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!leave} onOpenChange={(o) => !o && setLeave(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Уйти без сохранения?</DialogTitle>
            <DialogDescription>
              Изменения в «{form.name.trim() || (isNew ? "Новый товар" : "Без названия")}» не сохранены. Если уйти, они пропадут — на витрине и в командах выдачи останется
              {isNew ? " всё как было: товар не создан." : " прежняя версия."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setLeave(null)}>
              Остаться
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => leaveWith(false)}>
              Уйти
            </Button>
            <Button variant="primary" size="sm" onClick={() => leaveWith(true)}>
              {isNew ? "Создать и уйти" : "Сохранить и уйти"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* sticky save bar */}
      <AnimatePresence>
        {dirty ? (
          <motion.div
            key="savebar"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:left-[248px]"
          >
            <div
              role="region"
              aria-label="Несохранённые изменения"
              className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-xl border border-line-strong bg-surface-3 py-2 pr-2 pl-4 shadow-pop"
            >
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-azure-400" />
              <p className="min-w-0 flex-1 truncate text-[13px] text-fg">
                Есть несохранённые изменения
                {showErrors && errorCount ? <span className="text-bad"> · {pluralize(errorCount, ["ошибка", "ошибки", "ошибок"])}</span> : null}
              </p>
              <Button variant="ghost" size="sm" onClick={cancel}>
                Отменить
              </Button>
              <Button variant="primary" size="sm" onClick={save}>
                Сохранить
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Section({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <Card>
      <section aria-labelledby={id}>
        <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-3.5">
          <div className="min-w-0">
            <h2 id={id} className="text-sm font-medium text-fg">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-[12.5px] text-fg-3">{description}</p> : null}
          </div>
          {aside ? <div className="shrink-0 pt-0.5">{aside}</div> : null}
        </div>
        <div className="p-5">{children}</div>
      </section>
    </Card>
  );
}

function MessageField({ value, onChange, isPool }: { value: string; onChange: (v: string) => void; isPool: boolean }) {
  const vars = isPool ? ["{player}", "{product}", "{raised}", "{target}"] : ["{player}", "{product}", "{expires}"];
  return (
    <PreviewCard title="Текст сообщения" className="mt-2 rounded-t-md">
      <div className="p-3">
        <Input aria-label="Текст сообщения игроку" value={value} maxLength={120} onChange={(e) => onChange(e.target.value)} className="[&_input]:h-8 [&_input]:text-[13px]" />
        <p className="mt-1.5 font-mono text-[11px] text-fg-4">
          {vars.map((v) => (
            <React.Fragment key={v}>
              <span className="text-ice-300">{v}</span>{" "}
            </React.Fragment>
          ))}
          — подставим сами
        </p>
      </div>
    </PreviewCard>
  );
}
