"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  EyeOff,
  Eye,
  LayoutGrid,
  MoreHorizontal,
  PackageSearch,
  Pencil,
  Rows3,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort, formatMoney, formatNumber, formatPercent, formatRelative, plural, pluralize } from "@/lib/format";
import { eulaMeta, productKindMeta } from "@/lib/mock/meta";
import type { ProductKind } from "@/lib/mock/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Sparkline } from "@/components/ui/sparkline";
import { Progress } from "@/components/ui/progress";
import { StatusDot } from "@/components/ui/status-dot";
import { Tooltip } from "@/components/ui/tooltip";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { ProductArt } from "./product-art";
import { BADGE_META, KIND_ORDER, STATUS_META, conversionOf, durationLabel } from "./product-meta";
import type { CatalogFilters, CatalogProduct, CatalogStatusFilter } from "./types";

type View = "table" | "cards";

const EULA_TONE = { ok: "ok", warn: "warn", risk: "bad" } as const;

function writeUrl(f: CatalogFilters) {
  const sp = new URLSearchParams(window.location.search);
  const set = (k: string, v: string, def: string) => (v && v !== def ? sp.set(k, v) : sp.delete(k));
  set("cat", f.cat, "all");
  set("status", f.status, "all");
  set("q", f.q.trim(), "");
  set("eula", f.eula, "all");
  const qs = sp.toString();
  window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}

export function ProductsCatalog({
  products,
  initialFilters,
  now,
  gameName,
}: {
  products: CatalogProduct[];
  initialFilters: CatalogFilters;
  now: number;
  gameName: string;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(products);
  const [filters, setFilters] = React.useState(initialFilters);
  const [view, setView] = React.useState<View>("table");
  const [confirm, setConfirm] = React.useState<CatalogProduct | null>(null);

  // URL sync happens in the event handler, never inside a state updater (Next's history patch updates the router)
  const update = (patch: Partial<CatalogFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    writeUrl(next);
  };

  // "N" — new product
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "т") {
        e.preventDefault();
        router.push("/dashboard/products/new");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const q = filters.q.trim().toLowerCase();
  const visible = items.filter(
    (p) =>
      (filters.cat === "all" || p.kind === filters.cat) &&
      (filters.status === "all" || p.status === filters.status) &&
      (filters.eula === "all" || p.eula.level === filters.eula) &&
      (!q || `${p.name} ${p.category}`.toLowerCase().includes(q)),
  );

  const kindCounts = new Map<ProductKind, number>();
  for (const p of items) kindCounts.set(p.kind, (kindCounts.get(p.kind) ?? 0) + 1);
  const kinds = KIND_ORDER.filter((k) => kindCounts.has(k));
  const statusCount = (s: CatalogStatusFilter) => (s === "all" ? items.length : items.filter((p) => p.status === s).length);
  const riskCount = items.filter((p) => p.eula.level === "risk" && p.status !== "hidden").length;
  const warnCount = items.filter((p) => p.eula.level === "warn" && p.status !== "hidden").length;

  const totals = React.useMemo(() => {
    const revenue = items.reduce((a, p) => a + p.revenue30d, 0);
    const sales = items.reduce((a, p) => a + p.sales30d, 0);
    const sellable = items.filter((p) => p.kind !== "pool");
    const views = sellable.reduce((a, p) => a + p.views30d, 0);
    const conv = views ? (sellable.reduce((a, p) => a + p.sales30d, 0) / views) * 100 : 0;
    return { revenue, sales, conv, active: items.filter((p) => p.status === "active").length };
  }, [items]);

  const setStatus = (id: string, status: CatalogProduct["status"]) =>
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));

  const toggle = (p: CatalogProduct, on: boolean) => {
    const prevStatus = p.status;
    setStatus(p.id, on ? "active" : "hidden");
    toast(on ? `«${p.name}» снова в магазине` : `«${p.name}» скрыт с витрины`, {
      description: on ? "Игроки видят товар и могут его купить" : "Купить нельзя. Выданное раньше остаётся у игроков",
      action: { label: "Отменить", onClick: () => setStatus(p.id, prevStatus) },
    });
  };

  const remove = (p: CatalogProduct) => {
    const idx = items.findIndex((x) => x.id === p.id);
    setItems((prev) => prev.filter((x) => x.id !== p.id));
    setConfirm(null);
    toast(`«${p.name}» удалён`, {
      description: "Заказы и статистика по товару сохранены",
      action: {
        label: "Отменить",
        onClick: () =>
          setItems((prev) => {
            const next = [...prev];
            next.splice(Math.min(idx, next.length), 0, p);
            return next;
          }),
      },
    });
  };

  const actions: RowActions = {
    toggle,
    hide: (p) => toggle(p, p.status !== "active"),
    askDelete: setConfirm,
  };

  const resetFilters = () => update({ cat: "all", status: "all", q: "", eula: "all" });
  const filtered = filters.cat !== "all" || filters.status !== "all" || filters.eula !== "all" || !!q;

  return (
    <div className="space-y-5">
      {/* totals */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        <Stat label="Выручка · 30 дн" value={formatMoney(totals.revenue)} />
        <Stat label="Продано, шт · 30 дн" value={formatNumber(totals.sales)} />
        <Stat label="Конверсия витрины" value={formatPercent(totals.conv)} hint="Покупки / просмотры карточек" />
        <Stat label="В магазине" value={`${totals.active} из ${items.length}`} hint={`${statusCount("draft")} черн. · ${statusCount("hidden")} скрыт.`} />
      </dl>

      {riskCount > 0 ? (
        <RulesBanner
          riskCount={riskCount}
          warnCount={warnCount}
          gameName={gameName}
          active={filters.eula}
          onShow={(level) => update({ eula: filters.eula === level ? "all" : level, cat: "all", status: "all" })}
        />
      ) : null}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-raise">
        {/* category tabs */}
        <div className="scrollbar-none flex items-center gap-5 overflow-x-auto border-b border-line px-4 sm:px-5" role="tablist" aria-label="Категории">
          {(["all", ...kinds] as const).map((k) => {
            const active = filters.cat === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => update({ cat: k })}
                className={cn(
                  "relative flex h-11 shrink-0 items-center gap-1.5 text-[13px] font-medium transition-colors outline-none focus-visible:text-fg",
                  active ? "text-fg" : "text-fg-3 hover:text-fg-2",
                )}
              >
                {k === "all" ? "Все" : productKindMeta[k].category}
                <span className={cn("font-mono text-[11px] nums", active ? "text-fg-2" : "text-fg-4")}>
                  {k === "all" ? items.length : kindCounts.get(k)}
                </span>
                {active ? <span className="absolute inset-x-0 -bottom-px h-px bg-fg" /> : null}
              </button>
            );
          })}
        </div>

        {/* toolbar */}
        <div className="flex flex-col gap-2.5 border-b border-line-soft px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
            <Segmented
              value={filters.status}
              onChange={(v) => update({ status: v })}
              options={(["all", "active", "draft", "hidden"] as const).map((s) => ({
                value: s,
                label: (
                  <>
                    {s === "all" ? "Все статусы" : STATUS_META[s].short}
                    <span className="font-mono text-[10.5px] text-fg-4 nums">{statusCount(s)}</span>
                  </>
                ),
              }))}
            />
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Input
              value={filters.q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="Название или категория"
              aria-label="Поиск товаров"
              leading={<Search />}
              trailing={
                filters.q ? (
                  <button
                    type="button"
                    aria-label="Очистить поиск"
                    onClick={() => update({ q: "" })}
                    className="rounded-sm p-1 text-fg-3 hover:bg-white/5 hover:text-fg"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null
              }
              className="w-full sm:w-64 [&_input]:h-8 [&_input]:text-[13px]"
            />
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: <Rows3 aria-label="Таблица" /> },
                { value: "cards", label: <LayoutGrid aria-label="Карточки" /> },
              ]}
            />
          </div>
        </div>

        {filters.eula !== "all" ? (
          <div className="flex items-center gap-2 border-b border-line-soft bg-surface-2/50 px-4 py-2 text-[12.5px] text-fg-3 sm:px-5">
            <StatusDot tone={EULA_TONE[filters.eula]} />
            Показаны товары: {eulaMeta[filters.eula].label.toLowerCase()}
            <button type="button" onClick={() => update({ eula: "all" })} className="ml-auto text-fg-2 underline-offset-4 hover:text-fg hover:underline">
              Показать все
            </button>
          </div>
        ) : null}

        {visible.length === 0 ? (
          items.length === 0 ? (
            <EmptyState
              icon={<PackageSearch />}
              title="В каталоге пока пусто"
              description="Создайте первый товар из шаблона или перенесите каталог с другой платформы — команды выдачи подтянутся сами."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/dashboard/settings?tab=import">Импорт</Link>
                  </Button>
                  <Button asChild variant="primary" size="sm">
                    <Link href="/dashboard/products/new">Новый товар</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={<PackageSearch />}
              title="Ничего не нашли"
              description={
                q
                  ? `По запросу «${filters.q.trim()}» товаров нет. Ищем по названию и категории — проверьте раскладку.`
                  : "В этой выборке нет товаров. Попробуйте другую категорию или статус."
              }
              action={
                filtered ? (
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    Сбросить фильтры
                  </Button>
                ) : null
              }
            />
          )
        ) : view === "table" ? (
          <>
            <CatalogTable rows={visible} now={now} actions={actions} />
            <CatalogList rows={visible} now={now} actions={actions} />
          </>
        ) : (
          <CatalogCards rows={visible} now={now} actions={actions} />
        )}

        {visible.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-line-soft px-4 py-2.5 text-xs text-fg-4 sm:px-5">
            <span>
              {pluralize(visible.length, ["товар", "товара", "товаров"])}
              {filtered ? ` из ${items.length}` : ""}
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              Новый товар —{" "}
              <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-xs border border-line-strong bg-surface-3 px-1 font-mono text-[10px] text-fg-2">
                N
              </kbd>
            </span>
          </div>
        ) : null}
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          {confirm ? (
            <>
              <DialogHeader>
                <DialogTitle>Удалить «{confirm.name}»?</DialogTitle>
                <DialogDescription>
                  Товар пропадёт из магазина и из каталога. Заказы, чеки и трассы выдачи останутся в разделе «Заказы».
                </DialogDescription>
              </DialogHeader>
              {confirm.sales30d > 0 ? (
                <DialogBody>
                  <div className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-3 text-[13px] text-fg-2">
                    <EyeOff className="mt-0.5 size-4 shrink-0 text-fg-3" />
                    <p>
                      За 30 дней — {pluralize(confirm.sales30d, ["продажа", "продажи", "продаж"])} на {formatMoney(confirm.revenue30d)}. Если товар
                      нужен позже, его лучше скрыть: команды и статистика сохранятся.
                    </p>
                  </div>
                </DialogBody>
              ) : null}
              <DialogFooter>
                {confirm.status === "active" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      toggle(confirm, false);
                      setConfirm(null);
                    }}
                  >
                    Скрыть вместо удаления
                  </Button>
                ) : null}
                <Button variant="danger" size="sm" onClick={() => remove(confirm)}>
                  <Trash2 /> Удалить
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RowActions {
  toggle: (p: CatalogProduct, on: boolean) => void;
  hide: (p: CatalogProduct) => void;
  askDelete: (p: CatalogProduct) => void;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="label-mono text-[10px] text-fg-4">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-[19px] font-medium tracking-[-0.02em] text-fg nums">{value}</span>
        {hint ? <span className="hidden truncate text-[11.5px] text-fg-4 xl:inline">{hint}</span> : null}
      </dd>
    </div>
  );
}

function RulesBanner({
  riskCount,
  warnCount,
  gameName,
  active,
  onShow,
}: {
  riskCount: number;
  warnCount: number;
  gameName: string;
  active: CatalogFilters["eula"];
  onShow: (level: "risk" | "warn") => void;
}) {
  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-line bg-surface p-4 pl-5 shadow-raise sm:flex-row sm:items-center">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-bad" />
      <ShieldAlert className="hidden size-5 shrink-0 text-bad sm:block" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-fg">
          {pluralize(riskCount, ["товар может", "товара могут", "товаров могут"])} нарушать правила коммерческого использования {gameName}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-3">
          Продавать можно косметику, доступ к серверу и общесерверные бонусы. За наборы, /fly и ресурсы за деньги Mojang может заблокировать сервер.
          {warnCount ? ` Ещё ${pluralize(warnCount, ["товар стоит", "товара стоит", "товаров стоит"])} перепроверить.` : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {warnCount ? (
          <Button variant={active === "warn" ? "secondary" : "ghost"} size="sm" onClick={() => onShow("warn")} aria-pressed={active === "warn"}>
            Перепроверить · {warnCount}
          </Button>
        ) : null}
        <Button variant={active === "risk" ? "primary" : "secondary"} size="sm" onClick={() => onShow("risk")} aria-pressed={active === "risk"}>
          {active === "risk" ? "Показать все" : "Показать"}
        </Button>
      </div>
    </div>
  );
}

function PriceCell({ p }: { p: CatalogProduct }) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="font-mono text-fg nums">{formatMoney(p.price)}</span>
      {p.oldPrice ? <span className="font-mono text-[11px] text-fg-4 line-through nums">{formatMoney(p.oldPrice)}</span> : null}
    </div>
  );
}

function EulaDot({ p }: { p: CatalogProduct }) {
  const meta = eulaMeta[p.eula.level];
  return (
    <Tooltip
      side="left"
      content={
        <span className="block max-w-60">
          <span className="block font-medium text-fg">{meta.label}</span>
          <span className="mt-0.5 block">{p.eula.note ?? meta.hint}</span>
        </span>
      }
    >
      <button type="button" aria-label={`Правила игры: ${meta.label}`} className="inline-flex size-7 items-center justify-center rounded-sm hover:bg-white/[0.05]">
        <StatusDot tone={EULA_TONE[p.eula.level]} />
      </button>
    </Tooltip>
  );
}

function NameCell({ p }: { p: CatalogProduct }) {
  const duration = durationLabel(p.durationDays);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductArt tint={p.tint} glyph={p.glyph} size={36} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/products/${p.id}`}
            className="truncate font-medium text-fg underline-offset-4 hover:underline focus-visible:underline"
          >
            {p.name}
          </Link>
          {p.badge ? (
            <Badge tone={BADGE_META[p.badge].tone} className="shrink-0">
              {BADGE_META[p.badge].label}
            </Badge>
          ) : null}
          {p.status !== "active" ? (
            <Badge tone="neutral" className="shrink-0">
              {STATUS_META[p.status].label}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-fg-4">
          {[
            p.pool ? `сбор до ${formatDateShort(p.pool.endsAt)}` : duration || "разовая выдача",
            pluralize(p.serverCount, ["сервер", "сервера", "серверов"]),
            pluralize(p.commandCount, ["команда", "команды", "команд"]),
          ].join(" · ")}
        </p>
      </div>
    </div>
  );
}

function PoolCell({ pool, now }: { pool: NonNullable<CatalogProduct["pool"]>; now: number }) {
  const pct = Math.round((pool.raised / pool.target) * 100);
  return (
    <div className="flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
          <span className="text-fg-2">
            <span className="font-mono text-fg nums">{formatMoney(pool.raised)}</span>
            <span className="text-fg-4"> из {formatMoney(pool.target)}</span>
          </span>
          <span className="font-mono text-ice-300 nums">{formatPercent(pct, { digits: 0 })}</span>
        </div>
        <Progress value={pool.raised} max={pool.target} tone="ice" size="sm" />
      </div>
      <div className="shrink-0 text-right text-xs leading-tight">
        <p className="flex items-center justify-end gap-1 text-fg-2">
          <Users className="size-3 text-fg-4" />
          <span className="font-mono nums">{pool.contributors}</span>
        </p>
        <p className="mt-0.5 text-fg-4">{formatRelative(pool.endsAt, now)}</p>
      </div>
    </div>
  );
}

function RowMenu({ p, actions }: { p: CatalogProduct; actions: RowActions }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`Действия с товаром «${p.name}»`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/products/${p.id}`}>
            <Pencil /> Редактировать
          </Link>
        </DropdownMenuItem>
        {/* opens the editor with an unsaved draft copy — commands and servers included */}
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/products/new?from=${p.id}`}>
            <Copy /> Дублировать
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.hide(p)}>
          {p.status === "active" ? (
            <>
              <EyeOff /> Скрыть с витрины
            </>
          ) : (
            <>
              <Eye /> Показать на витрине
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => actions.askDelete(p)}>
          <Trash2 /> Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusSwitch({ p, actions }: { p: CatalogProduct; actions: RowActions }) {
  return (
    <Switch
      checked={p.status === "active"}
      onCheckedChange={(v) => actions.toggle(p, v)}
      aria-label={p.status === "active" ? `Скрыть «${p.name}» с витрины` : `Показать «${p.name}» на витрине`}
    />
  );
}

function CatalogTable({ rows, now, actions }: { rows: CatalogProduct[]; now: number; actions: RowActions }) {
  return (
    <TableWrap className="hidden md:block">
      <Table className="min-w-[920px]">
        <THead>
          <TR>
            <TH>Товар</TH>
            <TH>Категория</TH>
            <TH className="text-right">Цена</TH>
            <TH>Продажи · 30 дн</TH>
            <TH className="text-right">Выручка · 30 дн</TH>
            <TH className="text-right">Конверсия</TH>
            <TH className="text-center">Правила</TH>
            <TH className="text-center">В магазине</TH>
            <TH>
              <span className="sr-only">Действия</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((p) => {
            const conv = conversionOf(p);
            return (
              <TR key={p.id} className={cn("group hover:bg-white/[0.02]", p.status !== "active" && "[&>td:not(:last-child):not(:nth-last-child(2))]:opacity-60")}>
                <TD className="max-w-[300px] py-2.5">
                  <NameCell p={p} />
                </TD>
                <TD className="text-fg-3">{p.category}</TD>
                <TD className="text-right">
                  <PriceCell p={p} />
                </TD>
                {p.pool ? (
                  <TD colSpan={3}>
                    <PoolCell pool={p.pool} now={now} />
                  </TD>
                ) : (
                  <>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="w-9 font-mono text-fg nums">{formatNumber(p.sales30d)}</span>
                        <Sparkline data={p.salesTrend} width={84} height={22} tone={p.sales30d ? "azure" : "muted"} />
                      </div>
                    </TD>
                    <TD className="text-right font-mono text-fg nums">{p.revenue30d ? formatMoney(p.revenue30d) : <span className="text-fg-4">—</span>}</TD>
                    <TD className="text-right font-mono nums">{conv === null ? <span className="text-fg-4">—</span> : formatPercent(conv, { fixed: true })}</TD>
                  </>
                )}
                <TD className="text-center">
                  <EulaDot p={p} />
                </TD>
                <TD className="text-center">
                  <StatusSwitch p={p} actions={actions} />
                </TD>
                <TD className="w-12 text-right">
                  <RowMenu p={p} actions={actions} />
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </TableWrap>
  );
}

/** Compact list used instead of the wide table on phones. */
function CatalogList({ rows, now, actions }: { rows: CatalogProduct[]; now: number; actions: RowActions }) {
  return (
    <ul className="divide-y divide-line-soft md:hidden">
      {rows.map((p) => (
        <li key={p.id} className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={cn("min-w-0 flex-1", p.status !== "active" && "opacity-60")}>
              <NameCell p={p} />
            </div>
            <StatusSwitch p={p} actions={actions} />
            <RowMenu p={p} actions={actions} />
          </div>
          <div className="mt-2.5 flex items-center gap-3 pl-12 text-xs">
            {p.pool ? (
              <div className="flex-1">
                <PoolCell pool={p.pool} now={now} />
              </div>
            ) : (
              <>
                <span className="font-mono text-fg nums">{formatMoney(p.price)}</span>
                <span className="text-fg-4">·</span>
                <span className="text-fg-3">
                  <span className="font-mono text-fg-2 nums">{formatNumber(p.sales30d)}</span> {plural(p.sales30d, ["продажа", "продажи", "продаж"])}
                </span>
                <Sparkline data={p.salesTrend} width={56} height={16} tone={p.sales30d ? "azure" : "muted"} className="ml-auto" />
                <EulaDot p={p} />
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CatalogCards({ rows, now, actions }: { rows: CatalogProduct[]; now: number; actions: RowActions }) {
  return (
    <div className="-mb-px grid sm:-mr-px sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rows.map((p) => {
        const duration = durationLabel(p.durationDays);
        const conv = conversionOf(p);
        return (
          <article
            key={p.id}
            className="group relative flex flex-col border-b border-line-soft bg-surface p-4 transition-colors hover:bg-surface-2/60 sm:border-r"
          >
            <div className="flex items-start justify-between gap-3">
              <ProductArt tint={p.tint} glyph={p.glyph} size={52} className={cn(p.status !== "active" && "opacity-60")} />
              <div className="flex items-center gap-1">
                <EulaDot p={p} />
                <RowMenu p={p} actions={actions} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Link href={`/dashboard/products/${p.id}`} className="truncate text-[14px] font-medium text-fg underline-offset-4 hover:underline">
                {p.name}
              </Link>
              {p.badge ? <Badge tone={BADGE_META[p.badge].tone}>{BADGE_META[p.badge].label}</Badge> : null}
            </div>
            <p className="mt-0.5 text-xs text-fg-4">
              {p.category}
              {duration ? ` · ${duration}` : ""}
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-[17px] font-medium text-fg nums">{formatMoney(p.price)}</span>
              {p.oldPrice ? <span className="font-mono text-xs text-fg-4 line-through nums">{formatMoney(p.oldPrice)}</span> : null}
            </div>
            <div className="mt-auto pt-4">
              {p.pool ? (
                <PoolCell pool={p.pool} now={now} />
              ) : (
                <div className="flex items-end justify-between gap-3">
                  <div className="text-xs leading-snug">
                    <p className="text-fg-3">
                      <span className="font-mono text-fg nums">{formatNumber(p.sales30d)}</span> {plural(p.sales30d, ["продажа", "продажи", "продаж"])} ·{" "}
                      <span className="font-mono text-fg-2 nums">{p.revenue30d ? formatMoney(p.revenue30d) : "—"}</span>
                    </p>
                    <p className="text-fg-4">конверсия {conv === null ? "—" : formatPercent(conv, { fixed: true })}</p>
                  </div>
                  <Sparkline data={p.salesTrend} width={72} height={22} tone={p.sales30d ? "azure" : "muted"} />
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3 text-xs">
              <span className={cn("flex items-center gap-1.5", p.status === "active" ? "text-fg-2" : "text-fg-4")}>
                <StatusDot tone={p.status === "active" ? "ok" : "idle"} />
                {STATUS_META[p.status].label}
              </span>
              <StatusSwitch p={p} actions={actions} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
