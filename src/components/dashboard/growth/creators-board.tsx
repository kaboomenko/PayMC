"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, FileCheck2, Link2, MoreHorizontal, Pause, Play, Send, UserPlus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompact, formatDateShort, formatMoney, formatNumber, formatPercent, formatRelative, plural, pluralize } from "@/lib/format";
import { DAY, NOW, NOW_MS, mskDayStart } from "@/lib/mock/now";
import { creatorPlatformMeta } from "@/lib/mock/meta";
import type { Creator, CreatorPlatform } from "@/lib/mock/types";
import { AreaTrend } from "@/components/charts/area-trend";
import { CHART } from "@/components/charts/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Sparkline } from "@/components/ui/sparkline";
import { Slider } from "@/components/ui/slider";
import { PixelAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { KpiStrip, Unit } from "./kpi-strip";
import { useQueryState } from "./use-query-state";

export interface CreatorOrder {
  id: string;
  playerName: string;
  items: string;
  amount: number;
  createdAt: string;
}

export interface CreatorPayout {
  id: string;
  amount: number;
  at: string;
  receipt: string;
}

export interface CreatorRow extends Creator {
  revenue30: number;
  buyers30: number;
  /** revenue of the last 14 days — what `owed` is accrued from */
  revenue14: number;
  recentOrders: CreatorOrder[];
  payouts: CreatorPayout[];
  cabinetUrl: string;
}

const STATUS: Record<Creator["status"], { label: string; tone: "ok" | "neutral" | "ice" }> = {
  active: { label: "Активен", tone: "ok" },
  paused: { label: "На паузе", tone: "neutral" },
  invited: { label: "Приглашён", tone: "ice" },
};

const FROST_PRICE = 299;

/** Figures only the server knows: attributed buyers and orders over 30 days, daily revenue. */
export interface CreatorKpiBase {
  buyers30: number;
  orders30: number;
  daily: number[];
}

/** KPIs follow the table: paying a creator or inviting one updates them at once. */
function CreatorKpis({ rows, kpi }: { rows: CreatorRow[]; kpi: CreatorKpiBase }) {
  const revenue30 = rows.reduce((a, r) => a + r.revenue30, 0);
  const selling = rows.filter((r) => r.revenue30 > 0).length;
  const owed = rows.reduce((a, r) => a + r.owed, 0);
  const owedTo = rows.filter((r) => r.owed > 0).length;
  const avgShare = rows.reduce((a, r) => a + r.sharePct * r.revenue30, 0) / (revenue30 || 1);
  const shares = rows.filter((r) => r.status === "active").map((r) => r.sharePct);
  return (
    <KpiStrip
      items={[
        {
          label: "Выручка через блогеров · 30 дн",
          value: (
            <>
              {formatNumber(revenue30)}
              <Unit>₽</Unit>
            </>
          ),
          sub: `${selling} ${plural(selling, ["блогер приносит", "блогера приносят", "блогеров приносят"])} продажи`,
        },
        {
          label: "Покупателей пришло",
          value: formatNumber(kpi.buyers30),
          sub: `${pluralize(kpi.orders30, ["заказ", "заказа", "заказов"])} с кодами за 30 дней`,
        },
        {
          label: "К выплате блогерам",
          value: (
            <>
              {formatNumber(owed)}
              <Unit>₽</Unit>
            </>
          ),
          sub: owedTo ? `${owedTo} ${plural(owedTo, ["блогеру", "блогерам", "блогерам"])} · автовыплата раз в 14 дней` : "всё выплачено · следующая через 14 дней",
        },
        {
          label: "Средняя доля",
          value: formatPercent(avgShare),
          sub: shares.length ? `от ${Math.min(...shares)} до ${formatPercent(Math.max(...shares), { digits: 0 })} · взвешено по выручке` : "нет активных кодов",
        },
      ]}
    />
  );
}

export function CreatorsBoard({ creators, kpi }: { creators: CreatorRow[]; kpi: CreatorKpiBase }) {
  const [rows, setRows] = React.useState(creators);
  const [creatorParam, setCreatorParam] = useQueryState("creator");
  const [inviteParam, setInviteParam] = useQueryState("invite");
  const [paying, setPaying] = React.useState<CreatorRow | null>(null);
  const selected = rows.find((r) => r.id === creatorParam) ?? null;

  const patch = (id: string, p: Partial<CreatorRow>) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const copyCabinet = (r: CreatorRow) => {
    void navigator.clipboard?.writeText(r.cabinetUrl).catch(() => undefined);
    toast("Ссылка на кабинет скопирована", { description: `${r.name} увидит только свою статистику: переходы, покупки, начисления` });
  };

  const toggle = (r: CreatorRow) => {
    const prev = r.status;
    const next = prev === "active" ? "paused" : "active";
    patch(r.id, { status: next });
    toast(next === "paused" ? `Код ${r.code} на паузе` : `Код ${r.code} снова работает`, {
      description: next === "paused" ? "Скидка по коду отключена, начисления остановлены" : undefined,
      action: { label: "Отменить", onClick: () => patch(r.id, { status: prev }) },
    });
  };

  const pay = (r: CreatorRow) => {
    const payout: CreatorPayout = { id: `cp-${r.id}-now`, amount: r.owed, at: NOW.toISOString(), receipt: `НПД ${r.code.slice(0, 3)}-${String(r.owed).padStart(5, "0")}` };
    patch(r.id, { owed: 0, paidOut: r.paidOut + r.owed, payouts: [payout, ...r.payouts] });
    setPaying(null);
    toast.success("Выплата отправлена, чек сформирован", {
      description: `${formatMoney(r.owed)} · ${r.name} · СБП, обычно доходит за минуту`,
    });
  };

  return (
    <>
      <CreatorKpis rows={rows} kpi={kpi} />

      <div className="mt-8 overflow-hidden rounded-xl border border-line bg-surface shadow-raise">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-[15px] font-medium text-fg">Лидерборд</h2>
            <p className="text-[12.5px] text-fg-3">По выручке за 30 дней · доля начисляется с каждой оплаты по коду</p>
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={<UserPlus />}
            title="Блогеров пока нет"
            description="Дайте стримеру свой код: игрок получит −5 %, блогер — долю с каждой покупки, а вы — новых игроков с атрибуцией."
            action={
              <Button variant="primary" size="sm" onClick={() => setInviteParam("1")}>
                Пригласить блогера
              </Button>
            }
          />
        ) : (
          <>
            <TableWrap className="hidden lg:block">
              <Table>
                <THead>
                  <TR>
                    <TH className="w-10">#</TH>
                    <TH>Блогер</TH>
                    <TH>Код</TH>
                    <TH className="text-right">Аудитория</TH>
                    <TH className="text-right">Покуп.</TH>
                    <TH className="text-right">Выручка · 30 дн</TH>
                    <TH className="text-right">Доля</TH>
                    <TH className="text-right">К выплате</TH>
                    <TH>Тренд</TH>
                    <TH>Статус</TH>
                    <TH className="w-10">
                      <span className="sr-only">Действия</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((r, i) => (
                    <TR key={r.id} interactive onClick={() => setCreatorParam(r.id)} data-selected={selected?.id === r.id}>
                      <TD className="font-mono text-fg-4 nums">{r.status === "invited" ? "—" : String(i + 1).padStart(2, "0")}</TD>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <PixelAvatar name={r.handle} size={28} />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCreatorParam(r.id);
                              }}
                              className="block truncate text-left text-[13px] font-medium text-fg hover:text-azure-200"
                            >
                              {r.name}
                            </button>
                            <p className="truncate text-[11.5px] text-fg-3">
                              {creatorPlatformMeta[r.platform].label} · {r.handle}
                            </p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <span className="rounded-xs bg-white/[0.05] px-1.5 py-0.5 font-mono text-[12px] text-ice-200 ring-1 ring-line">{r.code}</span>
                      </TD>
                      <TD className="text-right font-mono nums">{formatCompact(r.followers)}</TD>
                      <TD className="text-right font-mono nums">{formatNumber(r.buyers30)}</TD>
                      <TD className="text-right font-mono text-fg nums">{r.revenue30 ? formatMoney(r.revenue30) : "—"}</TD>
                      <TD className="text-right font-mono nums">{formatPercent(r.sharePct, { digits: 0 })}</TD>
                      <TD className="text-right" onClick={(e) => e.stopPropagation()}>
                        {r.owed > 0 ? (
                          <Button size="xs" variant="secondary" className="font-mono nums" onClick={() => setPaying(r)} aria-label={`Выплатить ${formatMoney(r.owed)} — ${r.name}`}>
                            Выплатить {formatMoney(r.owed)}
                          </Button>
                        ) : (
                          <span className="font-mono text-fg-4 nums">0 ₽</span>
                        )}
                      </TD>
                      <TD>
                        <Sparkline data={r.trend} width={64} height={22} tone={r.revenue30 ? "azure" : "muted"} fill={!!r.revenue30} />
                      </TD>
                      <TD>
                        <Badge tone={STATUS[r.status].tone} dot={r.status === "active"}>
                          {STATUS[r.status].label}
                        </Badge>
                      </TD>
                      <TD onClick={(e) => e.stopPropagation()} className="w-10">
                        <RowMenu r={r} onOpen={() => setCreatorParam(r.id)} onCopy={() => copyCabinet(r)} onToggle={() => toggle(r)} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>

            <ul className="divide-y divide-line-soft lg:hidden">
              {rows.map((r, i) => (
                <li key={r.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => setCreatorParam(r.id)} className="flex min-w-0 items-center gap-2.5 text-left">
                      <span className="w-5 font-mono text-[11px] text-fg-4">{r.status === "invited" ? "—" : String(i + 1).padStart(2, "0")}</span>
                      <PixelAvatar name={r.handle} size={28} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-medium text-fg">{r.name}</span>
                        <span className="block truncate text-[11.5px] text-fg-3">
                          {creatorPlatformMeta[r.platform].label} · {formatCompact(r.followers)}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                      <RowMenu r={r} onOpen={() => setCreatorParam(r.id)} onCopy={() => copyCabinet(r)} onToggle={() => toggle(r)} />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 pl-[30px] text-xs">
                    <Mini label="Код" value={<span className="text-ice-200">{r.code}</span>} />
                    <Mini label="30 дн" value={r.revenue30 ? formatMoney(r.revenue30) : "—"} />
                    <Mini label="К выплате" value={formatMoney(r.owed)} align="right" />
                  </div>
                  {r.owed > 0 ? (
                    <Button size="xs" variant="secondary" className="mt-3 ml-[30px]" onClick={() => setPaying(r)}>
                      Выплатить {formatMoney(r.owed)}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <CreatorSheet
        creator={selected}
        onClose={() => setCreatorParam(null)}
        onPay={(r) => setPaying(r)}
        onCopy={copyCabinet}
      />

      <Dialog open={!!paying} onOpenChange={(o) => (o ? null : setPaying(null))}>
        <DialogContent className="max-w-md">
          {paying ? (
            <>
              <DialogHeader>
                <DialogTitle>Выплатить {formatMoney(paying.owed)}</DialogTitle>
                <DialogDescription>
                  {paying.name} · {creatorPlatformMeta[paying.platform].label}
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <dl className="divide-y divide-line-soft rounded-lg border border-line bg-surface-2/60 text-[13px]">
                  <Row k="Выручка по коду за 14 дней" v={formatMoney(paying.revenue14)} />
                  <Row k="Доля блогера" v={formatPercent(paying.sharePct, { digits: 0 })} />
                  <Row k="К выплате" v={<span className="text-fg">{formatMoney(paying.owed)}</span>} />
                  <Row k="Куда" v="СБП · по реквизитам из кабинета блогера" />
                </dl>
                <p className="mt-3 flex items-start gap-2 text-xs text-fg-3">
                  <FileCheck2 className="mt-px size-3.5 shrink-0 text-ok" />
                  Блогер — самозанятый: чек в «Мой налог» сформируется автоматически, закрывающие документы — в разделе «Финансы».
                </p>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setPaying(null)}>
                  Отмена
                </Button>
                <Button variant="primary" size="sm" onClick={() => pay(paying)}>
                  <Wallet /> Выплатить
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <InviteDialog
        open={inviteParam === "1"}
        onOpenChange={(o) => setInviteParam(o ? "1" : null)}
        existingCodes={rows.map((r) => r.code)}
        onInvite={(row) => {
          setRows((list) => [...list, row]);
          setInviteParam(null);
          toast.success("Приглашение отправлено", {
            description: `${row.name} получит ссылку на кабинет · код ${row.code}, доля ${row.sharePct} %`,
          });
        }}
      />
    </>
  );
}

function Mini({ label, value, align }: { label: string; value: React.ReactNode; align?: "right" }) {
  return (
    <div className={cn(align === "right" && "text-right")}>
      <p className="label-mono text-fg-4">{label}</p>
      <p className="mt-0.5 font-mono text-fg nums">{value}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
      <dt className="text-fg-3">{k}</dt>
      <dd className="text-right font-mono text-fg-2 nums">{v}</dd>
    </div>
  );
}

function RowMenu({ r, onOpen, onCopy, onToggle }: { r: CreatorRow; onOpen: () => void; onCopy: () => void; onToggle: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`Действия: ${r.name}`} className="data-[state=open]:bg-white/[0.06]">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onOpen}>
          <ArrowUpRight /> Карточка блогера
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCopy}>
          <Link2 /> Ссылка на кабинет блогера
        </DropdownMenuItem>
        {r.status === "invited" ? (
          <DropdownMenuItem onSelect={() => toast("Приглашение отправлено повторно", { description: r.handle })}>
            <Send /> Напомнить о приглашении
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onToggle}>
              {r.status === "active" ? (
                <>
                  <Pause /> Поставить код на паузу
                </>
              ) : (
                <>
                  <Play /> Включить код
                </>
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ───────────── Detail sheet ───────────── */

function CreatorSheet({
  creator,
  onClose,
  onPay,
  onCopy,
}: {
  creator: CreatorRow | null;
  onClose: () => void;
  onPay: (r: CreatorRow) => void;
  onCopy: (r: CreatorRow) => void;
}) {
  return (
    <Sheet open={!!creator} onOpenChange={(o) => (o ? null : onClose())}>
      <SheetContent
        className="max-w-[620px]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        {creator ? <CreatorDetail r={creator} onPay={onPay} onCopy={onCopy} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function CreatorDetail({ r, onPay, onCopy }: { r: CreatorRow; onPay: (r: CreatorRow) => void; onCopy: (r: CreatorRow) => void }) {
  const start = mskDayStart(29);
  const chart = r.trend.map((v, i) => ({ day: start + i * DAY, revenue: v }));
  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <PixelAvatar name={r.handle} size={40} />
          <div className="min-w-0">
            <SheetTitle className="truncate">{r.name}</SheetTitle>
            <SheetDescription className="mt-0.5 truncate">
              {creatorPlatformMeta[r.platform].label} · {r.handle} · {formatCompact(r.followers)} подписчиков
            </SheetDescription>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={STATUS[r.status].tone} dot={r.status === "active"}>
            {STATUS[r.status].label}
          </Badge>
          <span className="inline-flex h-6 items-center gap-1 rounded-sm bg-white/[0.05] pr-0.5 pl-2 font-mono text-[12px] text-ice-200 ring-1 ring-line">
            {r.code}
            <CopyButton value={r.code} label={`Скопировать код ${r.code}`} className="size-5" />
          </span>
          <span className="font-mono text-[12px] text-fg-3">доля {formatPercent(r.sharePct, { digits: 0 })} · с {formatDateShort(r.joinedAt)}</span>
        </div>
      </SheetHeader>
      <SheetBody className="space-y-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
          {[
            { k: "Выручка · 30 дн", v: formatMoney(r.revenue30) },
            { k: "Всего", v: formatMoney(r.revenue) },
            { k: "Покупателей", v: formatNumber(r.buyers) },
            { k: "Выплачено", v: formatMoney(r.paidOut) },
          ].map((s) => (
            <div key={s.k} className="bg-surface px-3 py-2.5">
              <p className="label-mono text-fg-4">{s.k}</p>
              <p className="mt-1 font-mono text-[14px] text-fg nums">{s.v}</p>
            </div>
          ))}
        </div>

        <section>
          <p className="label-mono mb-2 text-fg-3">Выручка по коду · 30 дней</p>
          {r.revenue30 ? (
            <AreaTrend
              data={chart}
              xKey="day"
              series={[{ key: "revenue", label: "Выручка", color: CHART.azure }]}
              height={170}
              formatX={(v) => formatDateShort(Number(v))}
              formatY={(v) => formatCompact(v)}
              formatValue={(v) => formatMoney(v)}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-fg-3">
              Первые покупки появятся, когда блогер примет приглашение и расскажет о коде
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-azure-400/25 bg-azure-500/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] text-fg">К выплате: <span className="font-mono nums">{formatMoney(r.owed)}</span></p>
            <p className="text-xs text-fg-3">Автовыплата раз в 14 дней от 500 ₽ · следующая {formatDateShort(mskDayStart(-8))}</p>
          </div>
          <Button variant="primary" size="sm" disabled={!r.owed} onClick={() => onPay(r)}>
            <Wallet /> Выплатить сейчас
          </Button>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="label-mono text-fg-3">Последние заказы с кодом</p>
            {r.recentOrders.length ? (
              // exact code filter: a text search for FROST would also match the «Frost» rank
              <Link href={`/dashboard/orders?creator=${encodeURIComponent(r.code)}&days=90`} className="text-xs text-azure-300 hover:text-azure-200">
                Все заказы →
              </Link>
            ) : null}
          </div>
          {r.recentOrders.length ? (
            <ul className="divide-y divide-line-soft rounded-lg border border-line">
              {r.recentOrders.map((o) => (
                <li key={o.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2 text-[12.5px]">
                  <div className="min-w-0">
                    <p className="truncate text-fg-2">
                      <span className="text-fg">{o.playerName}</span> · {o.items}
                    </p>
                    <Link href={`/dashboard/orders?id=${o.id}`} className="font-mono text-[11px] text-fg-4 hover:text-azure-300">
                      {o.id} · {formatRelative(o.createdAt, NOW_MS)}
                    </Link>
                  </div>
                  <span className="font-mono text-fg nums">{formatMoney(o.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-fg-3">Заказов с этим кодом ещё не было.</p>
          )}
        </section>

        <section>
          <p className="label-mono mb-2 text-fg-3">История выплат</p>
          {r.payouts.length ? (
            <ul className="space-y-1.5">
              {r.payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.025] px-3 py-2 text-[12.5px]">
                  <span className="flex items-center gap-2 text-fg-2">
                    <span className="size-1.5 rounded-full bg-ok" />
                    {formatDateShort(p.at)} · СБП
                  </span>
                  <span className="hidden font-mono text-[11px] text-fg-4 sm:inline">чек {p.receipt}</span>
                  <span className="font-mono text-fg nums">{formatMoney(p.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-fg-3">Выплат пока не было.</p>
          )}
        </section>
      </SheetBody>
      <SheetFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-surface-2 px-2.5 py-1.5">
          <span className="truncate font-mono text-[11.5px] text-fg-3">{r.cabinetUrl}</span>
          <CopyButton value={r.cabinetUrl} label="Скопировать ссылку на кабинет" className="ml-auto size-6 shrink-0" />
        </div>
        <Button variant="secondary" size="sm" onClick={() => onCopy(r)}>
          <Link2 /> Ссылка на кабинет блогера
        </Button>
      </SheetFooter>
    </>
  );
}

/* ───────────── Invite ───────────── */

const PLATFORMS = Object.keys(creatorPlatformMeta) as CreatorPlatform[];

function codeFromHandle(handle: string) {
  return handle
    .replace(/^https?:\/\//, "")
    .replace(/^(t\.me\/|vk\.com\/|youtube\.com\/|twitch\.tv\/|@)/i, "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 10);
}

function InviteDialog({
  open,
  onOpenChange,
  existingCodes,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingCodes: string[];
  onInvite: (row: CreatorRow) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">{open ? <InviteForm existingCodes={existingCodes} onInvite={onInvite} onCancel={() => onOpenChange(false)} /> : null}</DialogContent>
    </Dialog>
  );
}

function InviteForm({ existingCodes, onInvite, onCancel }: { existingCodes: string[]; onInvite: (row: CreatorRow) => void; onCancel: () => void }) {
  const [name, setName] = React.useState("");
  const [platform, setPlatform] = React.useState<CreatorPlatform>("youtube");
  const [handle, setHandle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [codeEdited, setCodeEdited] = React.useState(false);
  const [share, setShare] = React.useState(10);
  const [touched, setTouched] = React.useState(false);

  const effectiveCode = codeEdited ? code : codeFromHandle(handle);
  const nameErr = name.trim().length < 2 ? "Как блогера знают зрители" : null;
  const handleErr = handle.trim().length < 2 ? "Ник или ссылка на канал" : null;
  const codeErr = !/^[A-Z0-9]{3,12}$/.test(effectiveCode)
    ? "3–12 символов, латиница и цифры"
    : existingCodes.includes(effectiveCode)
      ? "Код уже занят другим блогером"
      : null;
  const valid = !nameErr && !handleErr && !codeErr;
  const perPurchase = Math.round((FROST_PRICE * share) / 100);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onInvite({
      id: `cr-new-${effectiveCode.toLowerCase()}`,
      name: name.trim(),
      platform,
      handle: handle.trim(),
      followers: 0,
      code: effectiveCode,
      sharePct: share,
      buyers: 0,
      revenue: 0,
      owed: 0,
      paidOut: 0,
      status: "invited",
      joinedAt: new Date(NOW_MS).toISOString(),
      trend: Array.from({ length: 30 }, () => 0),
      revenue30: 0,
      buyers30: 0,
      revenue14: 0,
      recentOrders: [],
      payouts: [],
      cabinetUrl: `https://paymc.ru/partner/arctic/${effectiveCode.toLowerCase()}`,
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>Пригласить блогера</DialogTitle>
        <DialogDescription>Блогер получит ссылку на свой кабинет: код, статистика и выплаты — без доступа к вашему.</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Имя или название канала" htmlFor="inv-name" error={touched ? nameErr ?? undefined : undefined}>
            <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Сеня Крафт" aria-invalid={touched && !!nameErr ? true : undefined} />
          </Field>
          <Field label="Площадка" htmlFor="inv-platform">
            <Select value={platform} onValueChange={(v) => setPlatform(v as CreatorPlatform)}>
              <SelectTrigger id="inv-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {creatorPlatformMeta[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ник или ссылка" htmlFor="inv-handle" error={touched ? handleErr ?? undefined : undefined}>
            <Input id="inv-handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@senya.craft" aria-invalid={touched && !!handleErr ? true : undefined} />
          </Field>
          <Field
            label="Код"
            htmlFor="inv-code"
            error={(touched || codeEdited || handle) && codeErr ? codeErr : undefined}
            hint={codeEdited ? "Задан вручную" : "Соберём из ника — можно поменять"}
          >
            <Input
              id="inv-code"
              value={effectiveCode}
              onChange={(e) => {
                setCodeEdited(true);
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
              }}
              className="font-mono tracking-[0.04em]"
              aria-invalid={(touched || codeEdited) && !!codeErr ? true : undefined}
            />
          </Field>
        </div>
        <div className="rounded-lg border border-line bg-surface-2/60 p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="inv-share" className="text-[13px] font-medium text-fg-2">
              Доля блогера
            </label>
            <span className="font-mono text-[15px] text-fg nums">{share} %</span>
          </div>
          <Slider id="inv-share" aria-label="Доля блогера, %" min={1} max={30} step={1} value={[share]} onValueChange={([v]) => setShare(v)} />
          <p className="mt-3 text-[13px] text-fg-2">
            С покупки <span className="font-mono text-fg">{formatMoney(FROST_PRICE)}</span> блогер получит{" "}
            <span className="font-mono text-ice-200">{formatMoney(perPurchase)}</span>
          </p>
          <p className="mt-1 text-xs text-fg-3">
            Игрок с кодом получает −5 %. На серверах PayMC блогерам чаще всего дают 8–12 %.
          </p>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={touched && !valid}>
          <Send /> Отправить приглашение
        </Button>
      </DialogFooter>
    </form>
  );
}
