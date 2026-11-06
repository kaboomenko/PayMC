import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { NOW_MS, ONLINE_NOW, ORDERS, HOUR, getTopProducts } from "@/lib/mock";
import { formatDate, formatTime, formatWeekday, mskHour } from "@/lib/format";
import { PeriodProvider, OverviewActions } from "@/components/dashboard/overview/period-context";
import { KpiTiles, RevenueCard } from "@/components/dashboard/overview/pulse";
import { AttentionCard } from "@/components/dashboard/overview/attention-card";
import { RecentOrders, ServersCard } from "@/components/dashboard/overview/lists";
import { GoalCard } from "@/components/dashboard/overview/goal-card";
import { TopProducts, PayoutCard } from "@/components/dashboard/overview/money";
import { MethodsCard } from "@/components/dashboard/overview/methods-card";
import { SetupBanner } from "@/components/dashboard/overview/setup-banner";
import {
  SETUP_STEPS,
  buildAttention,
  buildGoal,
  buildMethods,
  buildPayout,
  buildPulse,
  buildRecentOrders,
  buildServers,
} from "@/components/dashboard/overview/data";

export const metadata: Metadata = { title: "Обзор" };

const WEEKDAY_FULL: Record<string, string> = {
  пн: "Понедельник",
  вт: "Вторник",
  ср: "Среда",
  чт: "Четверг",
  пт: "Пятница",
  сб: "Суббота",
  вс: "Воскресенье",
};

export default function OverviewPage() {
  const pulse = buildPulse();
  const salesLastHour = ORDERS.filter((o) => NOW_MS - new Date(o.createdAt).getTime() < HOUR).length;
  const topProducts = getTopProducts(5).map(({ id, name, category, revenue30d, sales30d, salesTrend, price }) => ({
    id,
    name,
    category,
    revenue30d,
    sales30d,
    salesTrend,
    price,
  }));

  return (
    <PeriodProvider initial="30">
      <PageHeader
        title="Обзор"
        meta={
          <>
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-ok" />
            <span className="font-mono text-[11.5px] text-fg-3 nums">
              {WEEKDAY_FULL[formatWeekday(NOW_MS)]}, {formatDate(NOW_MS, { year: false })} · {formatTime(NOW_MS)} МСК
            </span>
          </>
        }
        actions={<OverviewActions />}
      />

      <SetupBanner steps={SETUP_STEPS} />

      <KpiTiles data={pulse} />

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8 [&>*]:h-full">
          <RevenueCard data={pulse} />
        </div>
        <div className="min-w-0 xl:col-span-4 [&>*]:h-full">
          <AttentionCard data={buildAttention()} now={NOW_MS} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <div className="min-w-0 md:col-span-2 xl:col-span-5 [&>*]:h-full">
          <RecentOrders orders={buildRecentOrders(8)} now={NOW_MS} salesLastHour={salesLastHour} />
        </div>
        <div className="min-w-0 xl:col-span-4 [&>*]:h-full">
          <ServersCard servers={buildServers()} onlineNow={ONLINE_NOW} nowHour={mskHour(NOW_MS)} />
        </div>
        <div className="min-w-0 xl:col-span-3 [&>*]:h-full">
          <GoalCard goal={buildGoal()} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <div className="min-w-0 md:col-span-2 xl:col-span-5 [&>*]:h-full">
          <TopProducts products={topProducts} />
        </div>
        <div className="min-w-0 xl:col-span-4 [&>*]:h-full">
          <MethodsCard methods={buildMethods()} />
        </div>
        <div className="min-w-0 xl:col-span-3 [&>*]:h-full">
          <PayoutCard payout={buildPayout()} now={NOW_MS} />
        </div>
      </div>
    </PeriodProvider>
  );
}
