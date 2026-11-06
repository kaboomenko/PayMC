"use client";

import Link from "next/link";
import { ArrowUpRight, ChartNoAxesColumn } from "lucide-react";
import { formatMoney, formatNumber, formatPercent, formatRelative, pluralize } from "@/lib/format";
import { orderStatusMeta } from "@/lib/mock/meta";
import { PAYMENT_METHODS } from "@/lib/payments";
import { BarTrend } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PixelAvatar } from "@/components/ui/avatar";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { ProductStatsData } from "./types";

export function ProductStats({
  stats,
  now,
  productName,
  isNew,
  isPool = false,
}: {
  stats: ProductStatsData | null;
  now: number;
  productName: string;
  isNew: boolean;
  /** a pool sells contributions, not units */
  isPool?: boolean;
}) {
  if (!stats || (!stats.sales30d && !stats.recent.length)) {
    return (
      <Card>
        <EmptyState
          icon={<ChartNoAxesColumn />}
          title={isNew ? (isPool ? "Статистика появится после первых взносов" : "Статистика появится после первых продаж") : isPool ? "Взносов пока не было" : "Продаж пока не было"}
          description="Здесь будут продажи по дням, выручка, конверсия карточки и последние заказы с трассой выдачи."
        />
      </Card>
    );
  }
  const conv = stats.views30d ? (stats.sales30d / stats.views30d) * 100 : 0;
  const best = stats.trend.reduce((a, b) => (b.value > a.value ? b : a), stats.trend[0]);
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        {[
          { label: isPool ? "Взносов · 30 дн" : "Продано, шт · 30 дн", value: formatNumber(stats.sales30d) },
          { label: isPool ? "Собрано · 30 дн" : "Выручка · 30 дн", value: formatMoney(stats.revenue30d) },
          { label: "Просмотров карточки", value: formatNumber(stats.views30d) },
          { label: "Конверсия", value: formatPercent(conv) },
        ].map((s) => (
          <div key={s.label} className="bg-surface px-4 py-3">
            <dt className="label-mono text-[10px] text-fg-4">{s.label}</dt>
            <dd className="mt-1 font-mono text-[19px] font-medium tracking-[-0.02em] text-fg nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{isPool ? "Взносы по дням" : "Продажи по дням"}</CardTitle>
            <CardDescription>
              Последние 14 дней · лучший день — {best.label}, {pluralize(best.value, isPool ? ["взнос", "взноса", "взносов"] : ["продажа", "продажи", "продаж"])}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <BarTrend data={stats.trend} xKey="label" yKey="value" label={isPool ? "Взносы" : "Продажи"} height={200} highlightLast formatY={(v) => formatNumber(v)} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-line-soft pb-3">
          <div>
            <CardTitle>Последние заказы</CardTitle>
            <CardDescription>С трассой выдачи — откройте заказ, чтобы увидеть команды и ответ сервера</CardDescription>
          </div>
          <Link href={`/dashboard/orders?q=${encodeURIComponent(productName)}`} className="inline-flex shrink-0 items-center gap-1 text-xs text-fg-3 hover:text-fg-2">
            Все заказы <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>
        <TableWrap>
          <Table className="min-w-[640px]">
            <THead>
              <TR>
                <TH>Заказ</TH>
                <TH>Игрок</TH>
                <TH>Сервер</TH>
                <TH>Статус</TH>
                <TH className="text-right">Сумма</TH>
                <TH className="text-right">Когда</TH>
              </TR>
            </THead>
            <TBody>
              {stats.recent.map((o) => {
                const st = orderStatusMeta[o.status];
                return (
                  <TR key={o.id} className="hover:bg-white/[0.02]">
                    <TD>
                      <Link href={`/dashboard/orders?id=${o.id}`} className="font-mono text-[12.5px] text-fg underline-offset-4 hover:underline">
                        {o.id}
                      </Link>
                    </TD>
                    <TD>
                      <span className="flex items-center gap-2">
                        <PixelAvatar name={o.playerName} size={20} />
                        <span className="text-fg">{o.playerName}</span>
                        {o.qty > 1 ? <span className="font-mono text-[11px] text-fg-4">×{o.qty}</span> : null}
                      </span>
                    </TD>
                    <TD className="text-fg-3">{o.serverName}</TD>
                    <TD>
                      <Badge tone={st.tone} dot>
                        {st.label}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <span className="font-mono text-fg nums">{formatMoney(o.amount)}</span>
                      <span className="ml-1.5 text-[11px] text-fg-4">{PAYMENT_METHODS[o.method].short}</span>
                    </TD>
                    <TD className="text-right font-mono text-[12px] text-fg-3">{formatRelative(o.createdAt, now)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}
