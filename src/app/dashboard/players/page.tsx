import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SearchX, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Delta } from "@/components/ui/delta";
import { EmptyState } from "@/components/ui/empty-state";
import { BUYERS_ONLINE, DAY, NOW_MS, ONLINE_NOW, PLAYERS, getKpis, pct } from "@/lib/mock";
import { formatMoney, formatNumber, pluralize } from "@/lib/format";
import { ListPagination } from "@/components/dashboard/orders/list-pagination";
import { ListPendingBar, NavLink, UrlNavProvider } from "@/components/dashboard/orders/url-nav";
import { queryPlayers } from "@/components/dashboard/players/data";
import { parsePlayersQuery, playersHref, type PlayersQuery } from "@/components/dashboard/players/params";
import { PlayerSegmentTabs, PlayersToolbar } from "@/components/dashboard/players/players-toolbar";
import { PlayersTable } from "@/components/dashboard/players/players-table";
import { SegmentActionBar } from "@/components/dashboard/players/segment-action-bar";

export const metadata: Metadata = { title: "Игроки" };

function baseStats() {
  const buyers = PLAYERS.filter((p) => p.ltv > 0)
    .map((p) => p.ltv)
    .sort((a, b) => a - b);
  const avgLtv = buyers.length ? buyers.reduce((a, b) => a + b, 0) / buyers.length : 0;
  const median = buyers.length ? buyers[Math.floor(buyers.length / 2)] : 0;
  const fresh = PLAYERS.filter((p) => NOW_MS - new Date(p.firstSeenAt).getTime() < 14 * DAY).length;
  return { avgLtv, median, fresh, buyers: buyers.length };
}

export default async function PlayersPage(props: PageProps<"/dashboard/players">) {
  const query = parsePlayersQuery(await props.searchParams);
  const result = queryPlayers(query);
  const kpis = getKpis(30);
  const stats = baseStats();
  const paged: PlayersQuery = { ...query, page: result.page };

  return (
    <UrlNavProvider>
      <PageHeader title="Игроки" description="Кто платит, кто уходит и кому нужен лимит трат. Профиль игрока — с историей покупок и риском." />

      <div className="mb-6 grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface shadow-raise lg:grid-cols-4">
        <Stat label="Игроков в базе" value={formatNumber(PLAYERS.length)} sub={`+${pluralize(stats.fresh, ["новичок", "новичка", "новичков"])} за 14 дней`} />
        <Stat
          label="Онлайн сейчас"
          value={
            <span className="inline-flex items-center gap-2.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-50" />
                <span className="relative inline-flex size-2 rounded-full bg-ok" />
              </span>
              {formatNumber(ONLINE_NOW)}
            </span>
          }
          sub={`из них покупателей — ${formatNumber(BUYERS_ONLINE)}`}
        />
        <Stat
          label="Покупателей за 30 дней"
          value={formatNumber(kpis.buyers)}
          sub={
            <span className="inline-flex items-center gap-1.5">
              <Delta value={pct(kpis.buyers, kpis.buyersPrev)} /> к прошлым 30 дням
            </span>
          }
        />
        <Stat label="Средний LTV покупателя" value={formatMoney(stats.avgLtv)} sub={`медиана ${formatMoney(stats.median)} · ${formatNumber(stats.buyers)} платили`} />
      </div>

      <div className="space-y-3">
        <PlayerSegmentTabs query={paged} counts={result.counts} />
        {paged.segment !== "all" && result.total > 0 ? <SegmentActionBar segment={paged.segment} stats={result.segmentStats} /> : null}
        <PlayersToolbar query={paged} />
        <Card className="overflow-hidden">
          <ListPendingBar className="absolute inset-x-0 top-0 z-10" />
          <PlayersTable rows={result.rows} empty={<PlayersEmpty query={paged} />} />
          <ListPagination
            start={result.start}
            shown={result.rows.length}
            total={result.total}
            page={result.page}
            pages={result.pages}
            prevHref={playersHref(paged, { page: result.page - 1 })}
            nextHref={playersHref(paged, { page: result.page + 1 })}
          />
        </Card>
      </div>
    </UrlNavProvider>
  );
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub: ReactNode }) {
  return (
    <div className="border-line-soft p-4 not-last:border-r max-lg:nth-[2]:border-r-0 max-lg:nth-[-n+2]:border-b sm:p-5">
      <p className="label-mono text-fg-4">{label}</p>
      <p className="mt-2 font-mono text-[22px] leading-none font-semibold tracking-[-0.02em] text-fg nums sm:text-[26px]">{value}</p>
      <p className="mt-2 text-[12px] text-fg-3">{sub}</p>
    </div>
  );
}

function PlayersEmpty({ query }: { query: PlayersQuery }) {
  const cls =
    "inline-flex h-8 items-center rounded-md border border-line bg-surface-2 px-3 text-[13px] font-medium text-fg shadow-raise transition-colors hover:border-line-strong hover:bg-surface-3";
  if (query.q) {
    return (
      <EmptyState
        icon={<SearchX />}
        title={`Никого по запросу «${query.q}»`}
        description="Ищем по нику, UUID и привязанному Telegram. Ник в Minecraft чувствителен к регистру только в игре — здесь нет."
        action={
          <NavLink href={playersHref(query, { q: "", page: 1 })} className={cls}>
            Сбросить поиск
          </NavLink>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={<Users />}
      title="В этом сегменте пока пусто"
      description="Сегменты пересчитываются каждую ночь по визитам и покупкам. Загляните завтра — или откройте всех игроков."
      action={
        <NavLink href={playersHref(query, { segment: "all", page: 1 })} className={cls}>
          Все игроки
        </NavLink>
      }
    />
  );
}
