"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CHART, Donut } from "@/components/charts";
import { formatMoney, formatPercent } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/payments";
import { PanelHeader, ShareLegend } from "./bits";
import type { MethodSlice } from "./types";

const HOLD_ORDER = ["без холда", "холд 24 ч", "до 3 дней"];
const HOLD_COLOR: Record<string, string> = { "без холда": CHART.ice, "холд 24 ч": CHART.azureStrong, "до 3 дней": CHART.muted };

export function MethodsCard({ methods }: { methods: MethodSlice[] }) {
  // short names («Карта», «Телефон») fit next to the donut; the full name stays in the row tooltip
  const items = methods.map((m, i) => ({ label: PAYMENT_METHODS[m.key].short, value: m.amount, color: CHART.series[i % CHART.series.length] }));
  const top = methods[0];
  const total = methods.reduce((a, m) => a + m.amount, 0) || 1;
  const byHold = HOLD_ORDER.map((h) => ({
    label: h,
    amount: methods.filter((m) => m.settlement === h).reduce((a, m) => a + m.amount, 0),
  })).filter((h) => h.amount > 0);

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader
        title="Способы оплаты"
        meta={<span className="text-[11px]">30 дней</span>}
        actions={
          <Link href="/dashboard/analytics" className="inline-flex items-center gap-1 rounded-sm text-xs text-fg-3 transition-colors hover:text-fg">
            Аналитика <ArrowRight className="size-3.5" />
          </Link>
        }
      />
      <div className="flex flex-col items-center gap-4 px-4 pt-4 sm:flex-row sm:gap-5 sm:px-5">
        <Donut
          data={items}
          size={136}
          thickness={13}
          format={(v) => formatMoney(v)}
          center={
            top ? (
              <>
                <span className="font-mono text-[17px] font-semibold text-fg nums">{formatPercent(top.share * 100, { digits: 0 })}</span>
                <span className="text-[11px] text-fg-3">{PAYMENT_METHODS[top.key].short}</span>
              </>
            ) : null
          }
        />
        <ShareLegend items={items} format={(v) => formatMoney(v)} showValue={false} className="w-full min-w-0 space-y-2.5" />
      </div>

      <div className="mt-auto border-t border-line-soft px-4 pt-3 pb-3.5 sm:px-5">
        <p className="label-mono text-[10px] text-fg-4">Когда деньги доступны к выплате</p>
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          {byHold.map((h) => (
            <span key={h.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(h.amount / total) * 100}%`, background: HOLD_COLOR[h.label] }} />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-fg-3">
          {byHold.map((h) => (
            <li key={h.label} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-[2px]" style={{ background: HOLD_COLOR[h.label] }} />
              {h.label}
              <span className="font-mono text-fg-2 nums">{formatPercent((h.amount / total) * 100, { digits: 0 })}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
