"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, FileDown, Gift, Link2, RotateCw, SearchX, ShieldCheck, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatPercent, formatRelative, pluralize } from "@/lib/format";
import { COUNTRIES, PAYMENT_METHODS } from "@/lib/payments";
import { NOW_MS } from "@/lib/mock/now";
import { orderStatusMeta } from "@/lib/mock/meta";
import type { OrderStatus, TraceStep } from "@/lib/mock/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Kbd } from "@/components/ui/kbd";
import { PixelAvatar } from "@/components/ui/avatar";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status-dot";
import { toast } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { DeliveryTrace } from "./delivery-trace";
import { formatDeliveryTime, formatExact, riskLabel, riskTone, toneBg, toneText } from "./format";
import { RefundDialog } from "./refund-dialog";
import type { OrderDetail, OrderRow } from "./types";

export const RETRYABLE: OrderStatus[] = ["failed", "retrying", "awaiting_player"];
const NOT_REFUNDABLE: OrderStatus[] = ["refunded", "chargeback"];

export interface OrderOverride {
  status: OrderStatus;
  steps: TraceStep[];
}

export function OrderSheet({
  openId,
  detail,
  row,
  loading,
  override,
  onClose,
  onRetry,
  onRefund,
  canStep,
}: {
  openId: string | null;
  detail: OrderDetail | null;
  row?: OrderRow;
  loading: boolean;
  override?: OrderOverride;
  onClose: () => void;
  onRetry: (id: string) => void;
  onRefund: (id: string, refund: { amount: number; revoke: boolean; reason: string; commands: string[] }) => void;
  canStep: boolean;
}) {
  const [refundOpen, setRefundOpen] = React.useState(false);
  const ready = detail && detail.id === openId ? detail : null;
  const status = override?.status ?? ready?.status ?? row?.status;

  return (
    <Sheet open={Boolean(openId)} onOpenChange={(o) => (o ? null : onClose())}>
      <SheetContent
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          // focus the panel itself, not the first button (that would pop its tooltip)
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus?.();
        }}
      >
        {ready ? (
          <Loaded detail={ready} status={status ?? ready.status} extraSteps={override?.steps ?? []} onRefundClick={() => setRefundOpen(true)} onRetry={onRetry} canStep={canStep} />
        ) : loading || row ? (
          <LoadingState id={openId ?? ""} row={row} />
        ) : (
          <NotFound id={openId ?? ""} onClose={onClose} />
        )}
      </SheetContent>
      {ready ? (
        <RefundDialog
          key={ready.id}
          open={refundOpen}
          onOpenChange={setRefundOpen}
          orderId={ready.id}
          amount={ready.amount}
          method={ready.method}
          commands={ready.trace.filter((s) => s.kind === "executed" && s.command).map((s) => s.command!)}
          onConfirm={(r) => {
            setRefundOpen(false);
            onRefund(ready.id, {
              ...r,
              commands: ready.trace.filter((s) => s.kind === "executed" && s.command).map((s) => s.command!),
            });
          }}
        />
      ) : null}
    </Sheet>
  );
}

function deliverySummary(status: OrderStatus, deliveryMs?: number) {
  switch (status) {
    case "delivered":
      return deliveryMs && deliveryMs > 60_000
        ? { text: `выдано при входе · через ${formatDeliveryTime(deliveryMs)}`, cls: "text-ok" }
        : { text: `выдано за ${formatDeliveryTime(deliveryMs ?? 0)}`, cls: "text-ok" };
    case "delivering":
      return { text: "выдаётся…", cls: "text-azure-300" };
    case "awaiting_player":
      return { text: "ждёт входа игрока", cls: "text-ice-300" };
    case "retrying":
      return { text: "повторяем выдачу", cls: "text-warn" };
    case "failed":
      return { text: "не выдано · нужно действие", cls: "text-bad" };
    case "refunded":
      return { text: deliveryMs ? `выдано за ${formatDeliveryTime(deliveryMs)} · возврат` : "возврат", cls: "text-fg-3" };
    case "chargeback":
      return { text: deliveryMs ? `выдано за ${formatDeliveryTime(deliveryMs)} · спор` : "спор", cls: "text-bad" };
  }
}

function Loaded({
  detail: o,
  status,
  extraSteps,
  onRefundClick,
  onRetry,
  canStep,
}: {
  detail: OrderDetail;
  status: OrderStatus;
  extraSteps: TraceStep[];
  onRefundClick: () => void;
  onRetry: (id: string) => void;
  canStep: boolean;
}) {
  const meta = orderStatusMeta[status];
  const steps = extraSteps.length ? [...o.trace, ...extraSteps] : o.trace;
  const summary = deliverySummary(status, o.deliveryMs);
  const payment = o.trace.find((s) => s.kind === "payment");
  const bank = payment?.detail?.split(" · ")[1];
  const method = PAYMENT_METHODS[o.method];
  const tone = riskTone(o.risk);
  // root cause first (missing plugin, timeout), not the last retry line
  const errorStep =
    o.trace.find((s) => (s.status === "error" || s.status === "warn") && s.kind !== "retry" && s.kind !== "webhook") ??
    [...o.trace].reverse().find((s) => s.status === "error" || s.status === "warn");
  const canRetry = RETRYABLE.includes(status);
  const canRefund = !NOT_REFUNDABLE.includes(status);
  const itemsTotal = o.items.reduce((a, it) => a + it.price * it.qty, 0);
  const discount = itemsTotal - o.amount;

  const copyLink = async () => {
    const url = `${window.location.origin}/dashboard/orders?id=${o.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* insecure context — still confirm */
    }
    toast.success("Ссылка на заказ скопирована", { description: "Откроется сразу с этой трассой" });
  };

  return (
    <>
      <SheetHeader className="pr-12">
        <p className="label-mono flex items-center gap-2 text-fg-4">
          Заказ <span className="text-fg-4/60">·</span>
          <Tooltip content={formatExact(o.createdAt)}>
            <span className="cursor-default normal-case tracking-normal text-fg-3">{formatRelative(o.createdAt, NOW_MS)}</span>
          </Tooltip>
        </p>
        <div className="mt-1.5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <SheetTitle className="pr-0 font-mono text-[19px] font-semibold tracking-[-0.02em] nums">{o.id}</SheetTitle>
              <CopyButton value={o.id} label="Скопировать номер заказа" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={meta.tone} size="md" dot>
                {meta.label}
              </Badge>
              <span className={cn("font-mono text-[12px] nums", summary.cls)}>{summary.text}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[22px] leading-none font-semibold tracking-[-0.02em] text-fg nums">{formatMoney(o.amount)}</p>
            {discount > 0 ? (
              <p className="mt-1.5 font-mono text-[11px] text-fg-4 line-through nums">{formatMoney(itemsTotal)}</p>
            ) : (
              <p className="mt-1.5 text-[11.5px] text-fg-3">{method.short}</p>
            )}
          </div>
        </div>
        <SheetDescription className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {o.items.map((it) => (
            <span key={it.productId} className="text-fg-2">
              {it.name}
              {it.qty > 1 ? <span className="font-mono text-fg-3"> ×{it.qty}</span> : null}
              <span className="ml-1.5 font-mono text-[11.5px] text-fg-4 nums">{formatMoney(it.price * it.qty)}</span>
            </span>
          ))}
        </SheetDescription>
      </SheetHeader>

      <SheetBody className="space-y-6">
        {(status === "failed" || status === "retrying") && errorStep ? (
          <div
            className={cn(
              "rounded-lg border px-3.5 py-3 text-[12.5px] leading-relaxed",
              status === "failed" ? "border-bad/25 bg-bad-soft text-fg-2" : "border-warn/25 bg-warn-soft text-fg-2",
            )}
          >
            <p className={cn("font-medium", status === "failed" ? "text-bad" : "text-warn")}>{errorStep.title}</p>
            <p className="mt-0.5">
              {errorStep.detail}
              {status === "failed" ? ". Исправьте причину и нажмите «Повторить выдачу» — команды выполнятся заново." : null}
            </p>
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5">
          <Fact label="Игрок">
            <Link
              href={`/dashboard/players/${o.playerId}`}
              className="group inline-flex max-w-full items-center gap-2 rounded-sm text-fg hover:text-azure-200"
            >
              <PixelAvatar name={o.playerName} size={18} />
              <span className="truncate font-medium">{o.playerName}</span>
              <ArrowUpRight className="size-3.5 shrink-0 text-fg-4 transition-colors group-hover:text-azure-300" />
            </Link>
          </Fact>
          <Fact label="Способ оплаты">
            {method.label}
            {bank ? <span className="text-fg-3"> · {bank}</span> : null}
          </Fact>
          <Fact label="Сервер">
            <span className="inline-flex items-center gap-2">
              <StatusDot tone={o.serverStatus === "online" ? "ok" : o.serverStatus === "degraded" ? "warn" : "bad"} />
              {o.serverName}
              {o.serverStatus !== "online" ? (
                <span className="text-xs text-fg-3">{o.serverStatus === "degraded" ? "тормозит" : "нет связи"}</span>
              ) : null}
            </span>
          </Fact>
          <Fact label="Источник">
            {o.promoCode ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="rounded-xs bg-ice-400/10 px-1 font-mono text-[11.5px] text-ice-300">{o.promoCode}</span>
                <span className="text-fg-3">промокод</span>
              </span>
            ) : o.creatorCode ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="rounded-xs bg-azure-500/12 px-1 font-mono text-[11.5px] text-azure-300">{o.creatorCode}</span>
                <span className="text-fg-3">код блогера</span>
              </span>
            ) : o.campaignName ? (
              <span>
                <span className="text-fg-3">кампания</span> «{o.campaignName}»
              </span>
            ) : (
              <span className="text-fg-3">Прямой заход в магазин</span>
            )}
          </Fact>
          <Fact label="Страна">
            {COUNTRIES[o.country].name} <span className="font-mono text-[11.5px] text-fg-4">{o.country}</span>
          </Fact>
          <Fact label="Риск">
            <span className="inline-flex items-center gap-2">
              <span className={cn("font-mono nums", toneText[tone])}>{o.risk}</span>
              <span className="relative h-1 w-14 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden>
                <span className={cn("absolute inset-y-0 left-0 rounded-full", toneBg[tone])} style={{ width: `${Math.max(4, o.risk)}%` }} />
              </span>
              <span className="text-xs text-fg-3">{riskLabel[tone]}</span>
            </span>
          </Fact>
          <Fact label="Комиссия">
            <span className="font-mono nums">{formatMoney(o.fee)}</span>{" "}
            <span className="font-mono text-[11.5px] text-fg-4 nums">{formatPercent(o.feeRate * 100)}</span>
          </Fact>
          <Fact label="К выплате">
            <span className="font-mono text-fg nums">{formatMoney(o.net)}</span> <span className="text-xs text-fg-3">· {method.settlement}</span>
          </Fact>
          <Fact label="Чек">
            {o.receipt?.status === "sent" ? (
              <span>
                <span className="font-mono nums">№ {o.receipt.number}</span> <span className="text-xs text-fg-3">· «Мой налог»</span>
              </span>
            ) : o.receipt?.status === "pending" ? (
              <span className="text-ice-300">регистрируется…</span>
            ) : (
              <span className="text-fg-3">не требуется</span>
            )}
          </Fact>
          <Fact label="Подарок">
            {o.giftTo ? (
              <span className="inline-flex items-center gap-1.5">
                <Gift className="size-3.5 text-ice-300" /> для <span className="font-medium text-fg">{o.giftTo}</span>
              </span>
            ) : (
              <span className="text-fg-4">нет</span>
            )}
          </Fact>
        </dl>

        <section aria-labelledby="trace-title">
          <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-line-soft pb-2">
            <h3 id="trace-title" className="text-[13px] font-semibold text-fg">
              Трасса выдачи
            </h3>
            <p className="font-mono text-[11px] text-fg-3 nums">
              <span className={summary.cls}>{summary.text}</span> · {pluralize(steps.length, ["шаг", "шага", "шагов"])}
            </p>
          </div>
          <DeliveryTrace steps={steps} />
        </section>

        {status !== "refunded" && status !== "chargeback" ? (
          <section aria-label="Что видит игрок" className="overflow-hidden rounded-lg border border-line bg-[#06080c]">
            <p className="label-mono border-b border-line-soft px-3.5 py-2 text-fg-4">
              {status === "delivered" ? "Что увидел игрок в чате" : status === "delivering" ? "Игрок увидит через мгновение" : "Игрок увидит после выдачи"}
            </p>
            <div className="space-y-0.5 px-3.5 py-2.5 font-mono text-[12px] leading-[1.6]">
              <p>
                <span className="text-ice-300">[ArcticMC]</span> <span className="text-fg-2">{o.chat.broadcast}</span>
              </p>
              <p className="text-azure-200">
                <span className="text-fg-4">→ </span>
                {o.chat.personal}
              </p>
            </div>
          </section>
        ) : null}

        <section className={cn("rounded-lg border p-3.5", status === "chargeback" ? "border-azure-500/30 bg-azure-500/[0.06]" : "border-line bg-surface-2/50")}>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-azure-300" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-fg">
                {status === "chargeback" ? "Пакет доказательств уже отправлен в банк" : "Пакет доказательств для банка"}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-fg-3">
                Трасса выдачи с точным временем, IP и страна платежа, время входа на сервер после покупки, UUID и ник игрока. Банки принимают его
                в споре по коду «Не получил товар».
              </p>
              <Button
                size="xs"
                variant="secondary"
                className="mt-2.5"
                onClick={() =>
                  toast.success(`evidence-${o.id}.pdf готов`, {
                    description: "4 страницы: трасса, IP, вход на сервер, UUID. Подписан ключом PayMC.",
                  })
                }
              >
                <FileDown /> Скачать PDF
              </Button>
            </div>
          </div>
        </section>
      </SheetBody>

      <SheetFooter className="flex-wrap gap-y-2">
        {canRetry ? (
          <Button size="sm" variant="primary" onClick={() => onRetry(o.id)}>
            <RotateCw /> Повторить выдачу
          </Button>
        ) : null}
        {canRefund ? (
          <Button size="sm" variant={canRetry ? "ghost" : "secondary"} onClick={onRefundClick}>
            <Undo2 /> Вернуть деньги
          </Button>
        ) : null}
        <Tooltip content="Скопировать ссылку на заказ">
          <Button size="icon-sm" variant="ghost" aria-label="Скопировать ссылку" onClick={copyLink}>
            <Link2 />
          </Button>
        </Tooltip>
        <div className="ml-auto hidden items-center gap-2.5 text-[11px] text-fg-4 sm:flex">
          {canStep ? (
            <span className="flex items-center gap-1" title="J / K — следующий и предыдущий заказ на странице">
              <Kbd>J</Kbd>
              <Kbd>K</Kbd>
              <span className="sr-only">следующий и предыдущий заказ</span>
            </span>
          ) : null}
          <span className="flex items-center gap-1" title="Закрыть">
            <Kbd>Esc</Kbd>
          </span>
        </div>
      </SheetFooter>
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="label-mono text-fg-4">{label}</dt>
      <dd className="mt-1 truncate text-[13px] text-fg-2">{children}</dd>
    </div>
  );
}

function LoadingState({ id, row }: { id: string; row?: OrderRow }) {
  const meta = row ? orderStatusMeta[row.status] : null;
  return (
    <>
      <SheetHeader className="pr-12">
        <p className="label-mono text-fg-4">Заказ</p>
        <div className="mt-1.5 flex items-start justify-between gap-4">
          <div>
            <SheetTitle className="font-mono text-[19px] font-semibold tracking-[-0.02em] nums">{id}</SheetTitle>
            <div className="mt-2 flex items-center gap-2">
              {meta ? (
                <Badge tone={meta.tone} size="md" dot>
                  {meta.label}
                </Badge>
              ) : (
                <Skeleton className="h-6 w-20" />
              )}
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          {row ? (
            <p className="font-mono text-[22px] leading-none font-semibold tracking-[-0.02em] text-fg nums">{formatMoney(row.amount)}</p>
          ) : (
            <Skeleton className="h-6 w-20" />
          )}
        </div>
        <div className="mt-3 h-4">
          {row ? <p className="truncate text-[13px] text-fg-2">{row.items.map((it) => it.name).join(", ")}</p> : <Skeleton className="h-3 w-40" />}
        </div>
      </SheetHeader>
      <SheetBody className="space-y-6" aria-busy>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="mt-2 h-3.5 w-28" />
            </div>
          ))}
        </div>
        <div>
          <Skeleton className="mb-4 h-3.5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-4 grid grid-cols-[22px_1fr_auto] gap-3">
              <Skeleton className="size-[22px] rounded-full" />
              <div>
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="mt-1.5 h-3 w-32" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </SheetBody>
    </>
  );
}

function NotFound({ id, onClose }: { id: string; onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg-3">
        <SearchX className="size-5" />
      </div>
      <SheetTitle className="pr-0">Заказ {id} не найден</SheetTitle>
      <p className="mt-1.5 max-w-xs text-[13px] text-fg-3">
        Номер выглядит как <span className="font-mono text-fg-2">PMC-104823</span>. Проверьте ссылку или найдите заказ по нику игрока.
      </p>
      <Button size="sm" variant="secondary" className="mt-4" onClick={onClose}>
        К списку заказов
      </Button>
    </div>
  );
}
