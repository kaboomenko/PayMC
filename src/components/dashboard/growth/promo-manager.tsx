"use client";

import * as React from "react";
import { Download, Link2, MoreHorizontal, Pause, Play, Search, Shuffle, Trash2, TicketPercent } from "lucide-react";
import { cn, createRng } from "@/lib/utils";
import { formatDate, formatDateShort, formatMoney, formatNumber, formatRelative, pluralize } from "@/lib/format";
import { DAY, NOW_MS, msk } from "@/lib/mock/now";
import type { PromoCode } from "@/lib/mock/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Progress } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { useHotkey, useQueryState } from "./use-query-state";

export interface PromoProduct {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface PromoRow extends PromoCode {
  /** one-time batch: `code` is the prefix, `limit` is the number of codes */
  batch?: number;
}

type Filter = "all" | "active" | "paused" | "expired";

const STATUS: Record<PromoCode["status"], { label: string; tone: "ok" | "neutral" | "warn" }> = {
  active: { label: "Активен", tone: "ok" },
  paused: { label: "На паузе", tone: "neutral" },
  expired: { label: "Истёк", tone: "warn" },
};

const EXPIRY_PRESETS = [
  { value: "none", label: "Бессрочно" },
  { value: "7", label: "7 дней" },
  { value: "30", label: "30 дней" },
  { value: "bf", label: "До конца Чёрной пятницы" },
  { value: "eoy", label: "До 31 декабря" },
] as const;
type ExpiryPreset = (typeof EXPIRY_PRESETS)[number]["value"];

function expiryFrom(preset: ExpiryPreset): string | undefined {
  if (preset === "none") return undefined;
  if (preset === "bf") return msk(2026, 11, 30, 23, 59);
  if (preset === "eoy") return msk(2026, 12, 31, 23, 59);
  return new Date(NOW_MS + Number(preset) * DAY).toISOString();
}

const discountLabel = (p: Pick<PromoCode, "kind" | "value">) => (p.kind === "percent" ? `−${p.value} %` : `−${formatMoney(p.value)}`);

export function PromoManager({ codes, products }: { codes: PromoRow[]; products: PromoProduct[] }) {
  const [rows, setRows] = React.useState<PromoRow[]>(codes);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");
  const [newParam, setNewParam] = useQueryState("new");
  const [batchParam, setBatchParam] = useQueryState("batch");
  const productName = React.useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);

  useHotkey("n", () => setNewParam("1"));

  const patch = (id: string, p: Partial<PromoRow>) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const toggle = (r: PromoRow) => {
    const prev = r.status;
    const next = prev === "active" ? "paused" : "active";
    patch(r.id, { status: next });
    toast(next === "paused" ? `${r.code} на паузе` : `${r.code} снова работает`, {
      description: next === "paused" ? "Игроки увидят «Промокод временно не действует»" : undefined,
      action: { label: "Отменить", onClick: () => patch(r.id, { status: prev }) },
    });
  };

  const remove = (r: PromoRow) => {
    const index = rows.findIndex((x) => x.id === r.id);
    setRows((list) => list.filter((x) => x.id !== r.id));
    toast(`Промокод ${r.code} удалён`, {
      action: { label: "Вернуть", onClick: () => setRows((list) => [...list.slice(0, index), r, ...list.slice(index)]) },
    });
  };

  const counts = {
    all: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    paused: rows.filter((r) => r.status === "paused").length,
    expired: rows.filter((r) => r.status === "expired").length,
  };
  const q = query.trim().toLowerCase();
  const visible = rows.filter((r) => (filter === "all" || r.status === filter) && (!q || r.code.toLowerCase().includes(q)));

  const scopeLabel = (r: PromoRow) => {
    if (r.scope === "all") return { short: "Все товары", full: null as string | null };
    const names = r.scope.map((id) => productName.get(id) ?? id);
    return { short: names.length === 1 ? names[0] : pluralize(names.length, ["товар", "товара", "товаров"]), full: names.join(", ") };
  };

  return (
    <>
      <div className="mt-8 mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          className="max-w-full self-start overflow-x-auto"
          options={(["all", "active", "paused", "expired"] as Filter[]).map((f) => ({
            value: f,
            label: (
              <>
                {{ all: "Все", active: "Активные", paused: "На паузе", expired: "Истёкшие" }[f]}{" "}
                <span className="font-mono text-[11px] text-fg-4 nums">{counts[f]}</span>
              </>
            ),
          }))}
        />
        <Input
          leading={<Search />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти код"
          aria-label="Найти промокод"
          className="w-full sm:w-64"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-raise">
        {visible.length === 0 ? (
          <EmptyState
            icon={<TicketPercent />}
            title={q ? `Нет кодов с «${query}»` : "Здесь пока пусто"}
            description={
              q
                ? "Проверьте раскладку: коды пишутся латиницей, регистр не важен."
                : "Сделайте код для стрима или розыгрыша — с лимитом использований он не уйдёт в публичные чаты навсегда."
            }
            action={
              <Button variant="secondary" size="sm" onClick={() => (q ? setQuery("") : setNewParam("1"))}>
                {q ? "Сбросить поиск" : "Создать промокод"}
              </Button>
            }
          />
        ) : (
          <>
            {/* desktop table */}
            <TableWrap className="hidden md:block">
              <Table>
                <THead>
                  <TR>
                    <TH>Код</TH>
                    <TH>Скидка</TH>
                    <TH>Применимо к</TH>
                    <TH className="w-[180px]">Использований</TH>
                    <TH className="text-right">Выручка</TH>
                    <TH>Срок</TH>
                    <TH>Статус</TH>
                    <TH className="w-10">
                      <span className="sr-only">Действия</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {visible.map((r) => {
                    const scope = scopeLabel(r);
                    return (
                      <TR key={r.id} className={cn(r.status !== "active" && "[&>td]:text-fg-3")}>
                        <TD>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[13px] font-medium tracking-[0.02em] text-fg">
                              {r.code}
                              {r.batch ? <span className="text-fg-4">-•••••</span> : null}
                            </span>
                            <CopyButton value={r.code} label={`Скопировать ${r.code}`} className="opacity-60 hover:opacity-100" />
                          </div>
                          <CodeFlags r={r} />
                        </TD>
                        <TD className="font-mono text-fg nums">{discountLabel(r)}</TD>
                        <TD>
                          {scope.full ? (
                            <Tooltip content={scope.full}>
                              <span className="cursor-help border-b border-dotted border-fg-4">{scope.short}</span>
                            </Tooltip>
                          ) : (
                            scope.short
                          )}
                        </TD>
                        <TD>
                          <UsesCell r={r} />
                        </TD>
                        <TD className="text-right font-mono text-fg nums">{r.revenue ? formatMoney(r.revenue) : "—"}</TD>
                        <TD>
                          <ExpiryCell r={r} />
                        </TD>
                        <TD>
                          <Badge tone={STATUS[r.status].tone} dot={r.status === "active"}>
                            {STATUS[r.status].label}
                          </Badge>
                        </TD>
                        <TD>
                          <RowMenu r={r} onToggle={() => toggle(r)} onDelete={() => remove(r)} />
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>

            {/* phone list */}
            <ul className="divide-y divide-line-soft md:hidden">
              {visible.map((r) => (
                <li key={r.id} className="px-4 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="truncate font-mono text-[13.5px] font-medium text-fg">
                        {r.code}
                        {r.batch ? <span className="text-fg-4">-•••••</span> : null}
                      </span>
                      <CopyButton value={r.code} label={`Скопировать ${r.code}`} />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                      <RowMenu r={r} onToggle={() => toggle(r)} onDelete={() => remove(r)} />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="label-mono text-[10px] text-fg-4">Скидка</p>
                      <p className="mt-0.5 font-mono text-fg nums">{discountLabel(r)}</p>
                    </div>
                    <div>
                      <p className="label-mono text-[10px] text-fg-4">Исп.</p>
                      <p className="mt-0.5 font-mono text-fg-2 nums">
                        {formatNumber(r.uses)}
                        {r.limit ? <span className="text-fg-4"> / {formatNumber(r.limit)}</span> : null}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="label-mono text-[10px] text-fg-4">Выручка</p>
                      <p className="mt-0.5 font-mono text-fg nums">{r.revenue ? formatMoney(r.revenue) : "—"}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-fg-3">
                    {scopeLabel(r).short} · {r.expiresAt ? `до ${formatDateShort(r.expiresAt)}` : "бессрочно"}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <CreatePromoDialog
        open={newParam === "1"}
        onOpenChange={(o) => setNewParam(o ? "1" : null)}
        products={products}
        existing={rows.map((r) => r.code)}
        onCreate={(row) => {
          setRows((list) => [row, ...list]);
          setFilter("all");
          setNewParam(null);
          toast.success(`Промокод ${row.code} создан`, {
            description: `${discountLabel(row)} · ${row.limit ? `лимит ${formatNumber(row.limit)}` : "без лимита"} · ${row.expiresAt ? `до ${formatDate(row.expiresAt, { year: false })}` : "бессрочно"}`,
          });
        }}
      />
      <BatchDialog
        open={batchParam === "1"}
        onOpenChange={(o) => setBatchParam(o ? "1" : null)}
        onDone={(row) => {
          setRows((list) => [row, ...list]);
          setFilter("all");
          setBatchParam(null);
        }}
      />
    </>
  );
}

function CodeFlags({ r }: { r: PromoRow }) {
  const flags: string[] = [];
  if (r.batch) flags.push(`пачка · ${pluralize(r.batch, ["код", "кода", "кодов"])}`);
  if (r.firstPurchaseOnly) flags.push("первая покупка");
  if (r.minAmount) flags.push(`от ${formatMoney(r.minAmount)}`);
  if (!flags.length) return null;
  return <p className="mt-0.5 text-[11.5px] text-fg-4">{flags.join(" · ")}</p>;
}

function UsesCell({ r }: { r: PromoRow }) {
  if (!r.limit) {
    return (
      <span className="font-mono text-fg-2 nums">
        {formatNumber(r.uses)} <span className="text-fg-4">· без лимита</span>
      </span>
    );
  }
  const pct = (r.uses / r.limit) * 100;
  return (
    <div className="w-[150px]">
      <div className="flex items-baseline justify-between font-mono text-[12px] nums">
        <span className="text-fg-2">{formatNumber(r.uses)}</span>
        <span className="text-fg-4">из {formatNumber(r.limit)}</span>
      </div>
      <Progress value={r.uses} max={r.limit} size="sm" tone={pct >= 90 ? "warn" : "azure"} className="mt-1.5" />
    </div>
  );
}

function ExpiryCell({ r }: { r: PromoRow }) {
  if (!r.expiresAt) return <span className="text-fg-3">Бессрочно</span>;
  const left = new Date(r.expiresAt).getTime() - NOW_MS;
  const soon = left > 0 && left < 7 * DAY;
  return (
    <div className="leading-tight">
      <p className={cn("text-[13px]", left <= 0 ? "text-fg-3" : "text-fg-2")}>
        {left <= 0 ? "истёк " : "до "}
        {formatDateShort(r.expiresAt)}
      </p>
      <p className={cn("mt-0.5 font-mono text-[11px]", soon ? "text-warn" : "text-fg-4")}>{formatRelative(r.expiresAt, NOW_MS)}</p>
    </div>
  );
}

function RowMenu({ r, onToggle, onDelete }: { r: PromoRow; onToggle: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`Действия с ${r.code}`} className="data-[state=open]:bg-white/[0.06]">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => {
            void navigator.clipboard?.writeText(`https://shop.arcticmc.ru/?promo=${r.code}`).catch(() => undefined);
            toast("Ссылка скопирована", { description: `shop.arcticmc.ru/?promo=${r.code} — код подставится в корзину сам` });
          }}
        >
          <Link2 /> Ссылка с кодом
        </DropdownMenuItem>
        {r.status !== "expired" ? (
          <DropdownMenuItem onSelect={onToggle}>
            {r.status === "active" ? (
              <>
                <Pause /> Поставить на паузу
              </>
            ) : (
              <>
                <Play /> Включить
              </>
            )}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={onDelete}>
          <Trash2 /> Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ───────────── Create ───────────── */

const WORDS = ["ARCTIC", "FROST", "SNOW", "POLAR", "ICE", "AURORA", "BLIZZARD", "WINTER"];

function CreatePromoDialog({
  open,
  onOpenChange,
  products,
  existing,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: PromoProduct[];
  existing: string[];
  onCreate: (row: PromoRow) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {open ? <CreatePromoForm products={products} existing={existing} onCreate={onCreate} onCancel={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CreatePromoForm({
  products,
  existing,
  onCreate,
  onCancel,
}: {
  products: PromoProduct[];
  existing: string[];
  onCreate: (row: PromoRow) => void;
  onCancel: () => void;
}) {
  const rng = React.useRef(createRng(existing.length * 7919 + 17));
  const [code, setCode] = React.useState("");
  const [kind, setKind] = React.useState<"percent" | "fixed">("percent");
  const [value, setValue] = React.useState("15");
  const [limit, setLimit] = React.useState("");
  const [expiry, setExpiry] = React.useState<ExpiryPreset>("30");
  const [firstOnly, setFirstOnly] = React.useState(false);
  const [minAmount, setMinAmount] = React.useState("");
  const [scopeMode, setScopeMode] = React.useState<"all" | "list">("all");
  const [scope, setScope] = React.useState<string[]>([]);
  const [touched, setTouched] = React.useState(false);

  const generate = () => {
    const word = WORDS[Math.floor(rng.current() * WORDS.length)];
    setCode(`${word}${10 + Math.floor(rng.current() * 89)}`);
  };

  const num = Number(value);
  const codeErr = !code
    ? "Придумайте код или нажмите «Сгенерировать»"
    : !/^[A-Z0-9_-]{3,20}$/.test(code)
      ? "3–20 символов: латиница, цифры, «-» и «_»"
      : existing.some((c) => c.toLowerCase() === code.toLowerCase())
        ? "Такой код уже есть"
        : null;
  const valueErr = !Number.isFinite(num) || num <= 0 ? "Укажите размер скидки" : kind === "percent" && num > 90 ? "Не больше 90 %" : null;
  const scopeErr = scopeMode === "list" && scope.length === 0 ? "Отметьте хотя бы один товар" : null;
  const valid = !codeErr && !valueErr && !scopeErr;

  const sample = products.find((p) => scope.includes(p.id)) ?? products.find((p) => p.id === "p-frost") ?? products[0];
  const samplePrice = sample ? (kind === "percent" ? Math.round(sample.price * (1 - (num || 0) / 100)) : Math.max(1, sample.price - (num || 0))) : 0;
  const categories = [...new Set(products.map((p) => p.category))];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onCreate({
      id: `pr-new-${code.toLowerCase()}`,
      code,
      kind,
      value: num,
      uses: 0,
      limit: limit ? Number(limit) : undefined,
      expiresAt: expiryFrom(expiry),
      revenue: 0,
      status: "active",
      scope: scopeMode === "all" ? "all" : scope,
      firstPurchaseOnly: firstOnly || undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>Новый промокод</DialogTitle>
        <DialogDescription>Игрок вводит код в корзине на витрине или командой /donate в игре.</DialogDescription>
      </DialogHeader>
      <DialogBody className="max-h-[min(68vh,620px)] space-y-4 overflow-y-auto">
        <Field label="Код" htmlFor="promo-code" error={touched || code ? codeErr ?? undefined : undefined} hint="Регистр не важен: winter25 и WINTER25 — один код">
          <div className="flex gap-2">
            <Input
              id="promo-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="WINTER26"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={(touched || !!code) && !!codeErr ? true : undefined}
              className="font-mono tracking-[0.04em]"
            />
            <Button type="button" variant="secondary" onClick={generate}>
              <Shuffle /> Сгенерировать
            </Button>
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Тип скидки</Label>
            <Segmented<"percent" | "fixed">
              value={kind}
              onChange={setKind}
              className="self-start"
              options={[
                { value: "percent", label: "Процент" },
                { value: "fixed", label: "Сумма, ₽" },
              ]}
            />
          </div>
          <Field label="Размер" htmlFor="promo-value" error={touched ? valueErr ?? undefined : undefined}>
            <Input
              id="promo-value"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
              trailing={<span className="pr-1 font-mono text-xs">{kind === "percent" ? "%" : "₽"}</span>}
              aria-invalid={touched && !!valueErr ? true : undefined}
            />
          </Field>
          <Field label="Лимит использований" htmlFor="promo-limit" hint="Пусто — без лимита">
            <Input id="promo-limit" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^\d]/g, ""))} placeholder="∞" />
          </Field>
          <Field label="Срок действия" htmlFor="promo-exp" hint={expiryFrom(expiry) ? `До ${formatDate(expiryFrom(expiry)!)} включительно` : "Пока не выключите вручную"}>
            <Select value={expiry} onValueChange={(v) => setExpiry(v as ExpiryPreset)}>
              <SelectTrigger id="promo-exp">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Мин. сумма заказа" htmlFor="promo-min" hint="Пусто — для любой корзины">
            <Input
              id="promo-min"
              inputMode="numeric"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value.replace(/[^\d]/g, ""))}
              trailing={<span className="pr-1 font-mono text-xs">₽</span>}
            />
          </Field>
          <label className="flex items-center justify-between gap-3 self-end rounded-md border border-line bg-surface-2 px-3 py-2">
            <span>
              <span className="block text-[13px] text-fg-2">Только первая покупка</span>
              <span className="block text-[11.5px] text-fg-4">Проверяем по нику и карте</span>
            </span>
            <Switch checked={firstOnly} onCheckedChange={setFirstOnly} aria-label="Только первая покупка" />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Товары</Label>
            <Segmented<"all" | "list">
              size="xs"
              value={scopeMode}
              onChange={setScopeMode}
              options={[
                { value: "all", label: "Все товары" },
                { value: "list", label: "Выбранные" },
              ]}
            />
          </div>
          {scopeMode === "list" ? (
            <div className="max-h-48 overflow-y-auto rounded-md border border-line bg-surface-2/60 p-2">
              {categories.map((cat) => (
                <div key={cat} className="mb-1.5 last:mb-0">
                  <p className="label-mono px-1 py-1 text-[10px] text-fg-4">{cat}</p>
                  {products
                    .filter((p) => p.category === cat)
                    .map((p) => (
                      <label key={p.id} className="flex h-8 cursor-pointer items-center gap-2.5 rounded-sm px-1 text-[13px] text-fg-2 hover:bg-white/[0.03]">
                        <Checkbox
                          checked={scope.includes(p.id)}
                          onCheckedChange={(v) => setScope((s) => (v ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                        />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="font-mono text-[11.5px] text-fg-4 nums">{formatMoney(p.price)}</span>
                      </label>
                    ))}
                </div>
              ))}
            </div>
          ) : null}
          {touched && scopeErr ? <p className="text-xs text-bad">{scopeErr}</p> : null}
        </div>

        {sample && num > 0 && !valueErr ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-line-soft bg-[#06080c] px-3 py-2.5 font-mono text-[12px]">
            <span className="text-fg-3">
              Корзина: <span className="text-fg-2">{sample.name}</span>
            </span>
            <span className="nums">
              <span className="text-fg-4 line-through">{formatMoney(sample.price)}</span> <span className="text-fg">{formatMoney(samplePrice)}</span>
              <span className="ml-2 text-ice-300">{code || "КОД"}</span>
            </span>
          </div>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={touched && !valid}>
          Создать промокод
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ───────────── Batch of one-time codes ───────────── */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function batchCodes(prefix: string, count: number) {
  let seed = count * 131;
  for (const ch of prefix) seed = (seed * 33 + ch.charCodeAt(0)) >>> 0;
  const rng = createRng(seed);
  return Array.from({ length: count }, () => `${prefix}-${Array.from({ length: 5 }, () => ALPHABET[Math.floor(rng() * ALPHABET.length)]).join("")}`);
}

function BatchDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (row: PromoRow) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">{open ? <BatchForm onDone={onDone} onCancel={() => onOpenChange(false)} /> : null}</DialogContent>
    </Dialog>
  );
}

function BatchForm({ onDone, onCancel }: { onDone: (row: PromoRow) => void; onCancel: () => void }) {
  const [count, setCount] = React.useState("50");
  const [prefix, setPrefix] = React.useState("STREAM");
  const [discount, setDiscount] = React.useState("20");
  const [expiry, setExpiry] = React.useState<ExpiryPreset>("7");

  const n = Number(count);
  const pct = Number(discount);
  const countErr = !n || n < 1 ? "Хотя бы один код" : n > 2000 ? "До 2 000 кодов за раз" : null;
  const prefixErr = !/^[A-Z0-9]{2,10}$/.test(prefix) ? "2–10 символов, латиница и цифры" : null;
  const pctErr = !pct || pct > 90 ? "От 1 до 90 %" : null;
  const valid = !countErr && !prefixErr && !pctErr;
  const preview = valid ? batchCodes(prefix, Math.min(n, 6)) : [];

  const download = () => {
    if (!valid) return;
    const exp = expiryFrom(expiry);
    const lines = ["code,discount_pct,uses_left,expires_at", ...batchCodes(prefix, n).map((c) => `${c},${pct},1,${exp ?? ""}`)];
    const blob = new Blob([`﻿${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prefix.toLowerCase()}-${n}-codes.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV с ${pluralize(n, ["кодом", "кодами", "кодами"])} готов`, {
      description: "Каждый код срабатывает один раз. Раздайте в чате стрима или в розыгрыше.",
    });
    onDone({
      id: `pr-batch-${prefix.toLowerCase()}-${n}`,
      code: prefix,
      kind: "percent",
      value: pct,
      uses: 0,
      limit: n,
      batch: n,
      expiresAt: exp,
      revenue: 0,
      status: "active",
      scope: "all",
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Пачка одноразовых кодов</DialogTitle>
        <DialogDescription>Для розыгрышей и стримов: каждый код работает один раз, утечка в чат не съест бюджет.</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Сколько кодов" htmlFor="batch-n" error={countErr ?? undefined}>
            <Input id="batch-n" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/[^\d]/g, ""))} aria-invalid={!!countErr || undefined} />
          </Field>
          <Field label="Префикс" htmlFor="batch-prefix" error={prefixErr ?? undefined}>
            <Input
              id="batch-prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              className="font-mono"
              aria-invalid={!!prefixErr || undefined}
            />
          </Field>
          <Field label="Скидка" htmlFor="batch-pct" error={pctErr ?? undefined} className="col-span-2 sm:col-span-1">
            <Input
              id="batch-pct"
              inputMode="numeric"
              value={discount}
              onChange={(e) => setDiscount(e.target.value.replace(/[^\d]/g, ""))}
              trailing={<span className="pr-1 font-mono text-xs">%</span>}
              aria-invalid={!!pctErr || undefined}
            />
          </Field>
        </div>
        <Field label="Срок действия" htmlFor="batch-exp">
          <Select value={expiry} onValueChange={(v) => setExpiry(v as ExpiryPreset)}>
            <SelectTrigger id="batch-exp">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="rounded-md border border-line-soft bg-[#06080c] p-3">
          <p className="label-mono mb-2 text-[10px] text-fg-4">Превью · первые {Math.min(n || 0, 6)} из {formatNumber(n || 0)}</p>
          {preview.length ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[12.5px] text-ice-200 sm:grid-cols-3">
              {preview.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-fg-4">Исправьте поля выше</p>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
        <Button variant="primary" size="sm" onClick={download} disabled={!valid}>
          <Download /> Скачать CSV
        </Button>
      </DialogFooter>
    </>
  );
}
