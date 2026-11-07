import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PixelAvatar } from "@/components/ui/avatar";
import { StatusDot } from "@/components/ui/status-dot";
import { Sparkline } from "@/components/ui/sparkline";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber, formatRelative, pluralize } from "@/lib/format";
import { serverStatusMeta } from "@/lib/mock/meta";
import { PanelHeader } from "./bits";
import type { RecentOrderRow, ServerRow } from "./types";

export function RecentOrders({ orders, now, salesLastHour }: { orders: RecentOrderRow[]; now: number; salesLastHour: number }) {
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader
        title="Последние заказы"
        meta={
          <span className="hidden items-center gap-1.5 sm:flex">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ok" />
            <span className="font-mono text-[11px] nums">{pluralize(salesLastHour, ["продажа", "продажи", "продаж"])} за час</span>
          </span>
        }
        actions={
          <Link href="/dashboard/orders" className="inline-flex items-center gap-1 rounded-sm text-xs text-fg-3 transition-colors hover:text-fg">
            Все заказы <ArrowRight className="size-3.5" />
          </Link>
        }
      />
      {orders.length === 0 ? (
        <EmptyState
          icon={<Receipt />}
          title="Заказов пока нет"
          description="Откройте витрину и купите что-нибудь за 1 ₽ в тестовом режиме — заказ появится здесь через секунду."
        />
      ) : (
        <ul className="divide-y divide-line-soft">
          {orders.map((o, i) => {
            const live = o.status === "delivering" && i === 0;
            return (
              <li key={o.id}>
                <Link
                  href={`/dashboard/orders?id=${o.id}`}
                  className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 transition-colors hover:bg-white/[0.025] sm:grid-cols-[28px_minmax(0,1fr)_auto_96px] sm:px-5"
                >
                  <PixelAvatar name={o.playerName} size={28} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-fg">{o.playerName}</span>
                    <span className="block truncate text-xs text-fg-3">
                      {o.items}
                      <span className="text-fg-4"> · {o.serverName}</span>
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-[13px] font-medium text-fg nums">{formatMoney(o.amount)}</span>
                    <span className="block text-[11px] text-fg-4">{o.method}</span>
                  </span>
                  <span className="col-span-3 mt-1.5 flex items-center justify-between gap-2 sm:col-span-1 sm:mt-0 sm:flex-col sm:items-end sm:justify-center sm:gap-1">
                    <Badge tone={o.tone}>
                      {live ? <StatusDot tone="azure" pulse className="size-1.5" /> : null}
                      {o.statusLabel}
                    </Badge>
                    <span className="font-mono text-[11px] text-fg-4 nums">{formatRelative(o.createdAt, now)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const SPARK_TONE = { online: "azure", degraded: "ice", offline: "muted" } as const;
const DOT_TONE = { online: "ok", degraded: "warn", offline: "bad" } as const;

export function ServersCard({ servers, onlineNow, nowHour }: { servers: ServerRow[]; onlineNow: number; nowHour: number }) {
  const latest = servers.map((x) => x.agentVersion).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1);
  const upToDate = servers.filter((s) => s.agentVersion === latest).length;
  const total24 = (servers[0]?.onlineHistory ?? []).map((_, i) => servers.reduce((a, s) => a + (s.onlineHistory[i] ?? 0), 0));
  const peak = Math.max(0, ...total24);
  const peakHour = (nowHour - (total24.length - 1 - total24.indexOf(peak)) + 24) % 24;
  const capacity = servers.reduce((a, s) => a + s.maxOnline, 0);
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader
        title="Серверы"
        meta={<span className="font-mono text-[11px] nums">{formatNumber(onlineNow)} онлайн</span>}
        actions={
          <Link href="/dashboard/servers" className="inline-flex items-center gap-1 rounded-sm text-xs text-fg-3 transition-colors hover:text-fg">
            Все <ArrowRight className="size-3.5" />
          </Link>
        }
      />
      {total24.length > 1 ? (
        <div className="border-b border-line-soft px-4 pt-3 pb-2 sm:px-5">
          <div className="flex items-end justify-between gap-3">
            <p className="font-mono text-[22px] leading-none font-semibold tracking-[-0.03em] text-fg nums">
              {formatNumber(onlineNow)}
              <span className="text-[12px] font-normal tracking-normal text-fg-4"> / {formatNumber(capacity)} слотов</span>
            </p>
            <p className="text-right font-mono text-[11px] text-fg-4 nums">
              пик за сутки {formatNumber(peak)} · {String(peakHour).padStart(2, "0")}:00
            </p>
          </div>
          <Sparkline data={total24} width={340} height={40} tone="ice" className="mt-2 h-auto w-full" />
        </div>
      ) : null}
      <ul className="divide-y divide-line-soft">
        {servers.map((s) => {
          const load = s.maxOnline ? s.online / s.maxOnline : 0;
          return (
            <li key={s.id}>
              <Link
                href="/dashboard/servers"
                className="grid grid-cols-[minmax(0,1fr)_64px_76px] items-center gap-x-3 px-4 py-3.5 transition-colors hover:bg-white/[0.025] sm:px-5"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <StatusDot tone={DOT_TONE[s.status]} />
                    <span className="truncate text-[13px] font-medium text-fg">{s.name}</span>
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block truncate pl-4 text-[11.5px]",
                      s.status === "online" ? "text-fg-4" : s.status === "degraded" ? "text-warn/80" : "text-bad/80",
                    )}
                  >
                    {s.note}
                  </span>
                  <span aria-hidden className="mt-1.5 ml-4 block h-[2px] overflow-hidden rounded-full bg-white/[0.05]">
                    <span
                      className={cn("block h-full rounded-full", s.status === "online" ? "bg-azure-500/70" : s.status === "degraded" ? "bg-warn/60" : "bg-bad/50")}
                      style={{ width: `${Math.max(1, load * 100)}%` }}
                    />
                  </span>
                </span>
                <Sparkline data={s.onlineHistory} width={64} height={22} tone={SPARK_TONE[s.status]} strokeWidth={1.25} />
                <span className="text-right">
                  <span className="block font-mono text-[12.5px] text-fg nums">
                    {formatNumber(s.online)}
                    <span className="text-fg-4">/{formatNumber(s.maxOnline)}</span>
                  </span>
                  <span className={cn("block font-mono text-[11px] nums", s.status === "online" ? "text-fg-4" : s.status === "degraded" ? "text-warn" : "text-bad")}>
                    {s.status === "offline" ? serverStatusMeta.offline.label.toLowerCase() : `${formatNumber(s.latencyMs)} мс`}
                  </span>
                </span>
                <span className="sr-only">Заполненность {Math.round(load * 100)} %</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-auto border-t border-line-soft px-4 py-2.5 font-mono text-[11px] text-fg-4 sm:px-5">
        Плагин PayMC {latest} — на {upToDate} из {servers.length} серверов
      </p>
    </Card>
  );
}
