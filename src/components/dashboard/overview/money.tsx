import Link from "next/link";
import { ArrowRight, Package, Route } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Sparkline } from "@/components/ui/sparkline";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDuration, formatMoney, formatNumber, formatPercent, formatTime } from "@/lib/format";
import { PanelHeader } from "./bits";
import type { PayoutPreview } from "./types";
import type { Product } from "@/lib/mock/types";

type TopProduct = Pick<Product, "id" | "name" | "category" | "revenue30d" | "sales30d" | "salesTrend" | "price">;

export function TopProducts({ products }: { products: TopProduct[] }) {
  const max = Math.max(...products.map((p) => p.revenue30d), 1);
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader
        title="Топ товаров за 30 дней"
        actions={
          <Link href="/dashboard/products" className="inline-flex items-center gap-1 rounded-sm text-xs text-fg-3 transition-colors hover:text-fg">
            Каталог <ArrowRight className="size-3.5" />
          </Link>
        }
      />
      {products.length === 0 ? (
        <EmptyState icon={<Package />} title="Продаж ещё не было" description="Топ появится после первых заказов. Начните с 3–5 товаров — привилегия, кейс и валюта." />
      ) : (
        <ol className="divide-y divide-line-soft">
          {products.map((p, i) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/products/${p.id}`}
                className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 transition-colors hover:bg-white/[0.025] sm:px-5"
              >
                <span className="self-start pt-px font-mono text-[11px] text-fg-4 nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-fg">{p.name}</span>
                  <span className="mt-1.5 flex items-center gap-2.5">
                    <span className="block h-1 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <span
                        className="block h-full rounded-full bg-azure-500"
                        style={{ width: `${Math.max(4, (p.revenue30d / max) * 100)}%`, opacity: 1 - i * 0.12 }}
                      />
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] text-fg-4 nums">
                      {formatNumber(p.sales30d)} × {formatMoney(p.price)}
                    </span>
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="font-mono text-[13px] font-medium text-fg nums">{formatMoney(p.revenue30d)}</span>
                  <Sparkline data={p.salesTrend} width={56} height={16} tone="azure" fill={false} strokeWidth={1.25} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-auto border-t border-line-soft px-4 py-2.5 font-mono text-[10.5px] text-fg-4 sm:px-5">Полоса — выручка относительно лидера · линия — продажи за 14 дней</p>
    </Card>
  );
}

export function PayoutCard({ payout, now }: { payout: PayoutPreview; now: number }) {
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader
        title="Следующая выплата"
        actions={
          <Link href="/dashboard/finance" className="inline-flex items-center gap-1 rounded-sm text-xs text-fg-3 transition-colors hover:text-fg">
            Финансы <ArrowRight className="size-3.5" />
          </Link>
        }
      />
      <div className="px-4 pt-3.5 sm:px-5">
        <p className="text-[13px] text-fg-2">
          Завтра в {formatTime(payout.at)} МСК <span className="text-fg-4">· через {Math.round((new Date(payout.at).getTime() - now) / 3_600_000)} ч</span>
        </p>
        <p className="mt-2 font-mono text-[24px] leading-none font-semibold tracking-[-0.03em] text-fg nums">≈ {formatMoney(payout.estimate)}</p>
        <p className="mt-2 text-[11.5px] leading-snug text-fg-3">
          {formatMoney(payout.todayGross)} уже оплачено сегодня — обычно к 12:00 это {formatPercent(payout.morningShare * 100, { digits: 0 })} дня.
          Комиссия 3,9 % уже вычтена.
        </p>
      </div>
      <ul className="mt-3 space-y-px border-t border-line-soft px-2 py-1.5 sm:px-3">
        {payout.splits.map((s) => (
          <li key={s.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <Avatar name={s.name} size={24} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] text-fg">{s.name}</span>
              <span className="block truncate text-[11px] text-fg-4">
                {s.role} · {s.destination}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-mono text-[12.5px] text-fg nums">{formatMoney(s.amount)}</span>
              <span className="block font-mono text-[10.5px] text-fg-4 nums">{s.pct} %</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-auto flex items-start gap-2 border-t border-line-soft px-4 py-2.5 text-[11px] leading-snug text-fg-4 sm:px-5">
        <Route className="mt-px size-3.5 shrink-0 text-fg-3" />
        Если банк не примет перевод, через {formatDuration(40 * 60_000)} отправим резервным маршрутом через Точку
      </p>
    </Card>
  );
}
