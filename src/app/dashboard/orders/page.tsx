import type { Metadata } from "next";
import { AlertTriangle, ArrowRight, CheckCheck, Clock3, Inbox, SearchX, ShieldCheck, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LIVE_METHODS } from "@/lib/payments";
import { NOW_MS, getIssues } from "@/lib/mock";
import { orderStatusMeta } from "@/lib/mock/meta";
import { formatMoneyCompact, formatNumber, plural, pluralize } from "@/lib/format";
import { ListPagination } from "@/components/dashboard/orders/list-pagination";
import { OrderViewTabs } from "@/components/dashboard/orders/order-view-tabs";
import { OrdersFilterBar } from "@/components/dashboard/orders/orders-filter-bar";
import { OrdersHeaderActions } from "@/components/dashboard/orders/orders-header-actions";
import { OrdersTable } from "@/components/dashboard/orders/orders-table";
import { ListPendingBar, NavLink, UrlNavProvider } from "@/components/dashboard/orders/url-nav";
import { PROJECT_SERVERS, getOrderDetail, queryOrders } from "@/components/dashboard/orders/data";
import {
  CLEARED_ORDER_FILTERS,
  ORDER_PERIOD_LABELS,
  ORDER_VIEW_LABELS,
  hasOrderFilters,
  ordersHref,
  parseOrdersQuery,
  type OrdersQuery,
} from "@/components/dashboard/orders/params";

export const metadata: Metadata = { title: "Заказы" };

export default async function OrdersPage(props: PageProps<"/dashboard/orders">) {
  const raw = await props.searchParams;
  const query = parseOrdersQuery(raw, LIVE_METHODS, PROJECT_SERVERS.map((s) => s.id));
  const result = queryOrders(query);
  const detail = query.id ? getOrderDetail(query.id) : null;
  const issues = getIssues();
  const pagedQuery: OrdersQuery = { ...query, page: result.page };

  // operational context for the header and the attention strip
  const failed = issues.orders.filter((o) => o.status === "failed");
  const retrying = issues.orders.filter((o) => o.status === "retrying");
  const byServer = new Map<string, number>();
  for (const o of issues.orders) byServer.set(o.serverId, (byServer.get(o.serverId) ?? 0) + 1);
  const serverName = (id: string) => PROJECT_SERVERS.find((s) => s.id === id)?.name ?? id;
  const issuesNote = [...byServer.entries()].map(([id, n]) => `${serverName(id)}: ${n}`).join(" · ") + " — команды уйдут, как только сервер ответит";
  const offline = issues.servers.filter((s) => s.status === "offline");
  const offlineQueued = offline.map((s) => ({ s, n: issues.orders.filter((o) => o.serverId === s.id).length }));

  return (
    <UrlNavProvider>
      <PageHeader
        title="Заказы"
        description="Каждая покупка — с трассировкой выдачи: от платежа до ответа консоли сервера"
        actions={
          <OrdersHeaderActions
            issues={issues.count}
            issuesNote={issuesNote}
            exportCount={result.total}
            exportLabel={`${ORDER_PERIOD_LABELS[query.days]}${hasOrderFilters(query) || query.view !== "all" ? " с текущими фильтрами" : ""}`}
          />
        }
      />

      {issues.count > 0 || issues.awaiting.length > 0 ? (
        <div className="mb-5 flex flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] shadow-raise sm:flex-row sm:items-center sm:gap-4">
          <p className="flex items-center gap-2 font-medium text-fg">
            <AlertTriangle className="size-4 text-warn" />
            Требуют внимания
            <span className="font-mono text-warn nums">{formatNumber(issues.count)}</span>
          </p>
          <ul className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-1 text-fg-3">
            {offlineQueued.map(({ s, n }) => (
              <li key={s.id} className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-bad" />
                «{s.name}» без связи {Math.round((NOW_MS - new Date(s.lastSeenAt).getTime()) / 60_000)} мин — {pluralize(n, ["заказ ждёт", "заказа ждут", "заказов ждут"])} в очереди
              </li>
            ))}
            {failed.length ? (
              <li className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-bad" />
                {pluralize(failed.length, ["ошибка", "ошибки", "ошибок"])} выдачи на «{serverName(failed[0].serverId)}»
              </li>
            ) : null}
            {retrying.length - (offlineQueued[0]?.n ?? 0) > 0 ? (
              <li className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-warn" />
                {pluralize(retrying.length - (offlineQueued[0]?.n ?? 0), ["заказ", "заказа", "заказов"])} в автоповторе
              </li>
            ) : null}
            {issues.awaiting.length ? (
              <li className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-ice-400" />
                {pluralize(issues.awaiting.length, ["игрок", "игрока", "игроков"])} {plural(issues.awaiting.length, ["ждёт", "ждут", "ждут"])} выдачи при входе
              </li>
            ) : null}
          </ul>
          <NavLink
            href={ordersHref(query, { view: "issues", status: "all", page: 1, id: undefined })}
            className="inline-flex shrink-0 items-center gap-1 self-start rounded-sm text-[12.5px] font-medium text-azure-300 hover:text-azure-200 sm:self-auto"
          >
            Разобрать <ArrowRight className="size-3.5" />
          </NavLink>
        </div>
      ) : null}

      <div className="space-y-3">
        <OrderViewTabs query={pagedQuery} counts={result.counts} />
        <OrdersFilterBar query={pagedQuery} servers={PROJECT_SERVERS} />

        <Card className="overflow-hidden">
          <ListPendingBar className="absolute inset-x-0 top-0 z-10" />
          <OrdersTable
            rows={result.rows}
            query={pagedQuery}
            detail={detail}
            servers={PROJECT_SERVERS}
            empty={<OrdersEmpty query={pagedQuery} />}
          />
          <ListPagination
            start={result.start}
            shown={result.rows.length}
            total={result.total}
            page={result.page}
            pages={result.pages}
            prevHref={ordersHref(pagedQuery, { page: result.page - 1, id: undefined })}
            nextHref={ordersHref(pagedQuery, { page: result.page + 1, id: undefined })}
            summary={
              result.paidSum > 0 || result.disputed === 0 ? (
                <>
                  оплачено <span className="font-mono text-fg-2 nums">{formatMoneyCompact(result.paidSum)}</span>
                  {result.disputed > 0 ? (
                    <>
                      {" "}
                      · возвраты и споры <span className="font-mono text-fg-2 nums">{formatMoneyCompact(result.disputedSum)}</span>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  возвращено и оспорено <span className="font-mono text-fg-2 nums">{formatMoneyCompact(result.disputedSum)}</span>
                </>
              )
            }
          />
        </Card>
      </div>
    </UrlNavProvider>
  );
}

function OrdersEmpty({ query }: { query: OrdersQuery }) {
  const filtered = hasOrderFilters(query);
  const cleared = ordersHref(query, { ...CLEARED_ORDER_FILTERS, page: 1, id: undefined });
  const wider = ordersHref(query, { days: "90", page: 1, id: undefined });
  const linkCls =
    "inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-3 text-[13px] font-medium text-fg shadow-raise transition-colors hover:border-line-strong hover:bg-surface-3";

  if (filtered) {
    const parts = [
      query.q ? `по запросу «${query.q}»` : null,
      query.status !== "all" ? `со статусом «${orderStatusMeta[query.status].label}»` : null,
      query.creator ? `с кодом блогера ${query.creator}` : null,
      query.promo ? `с промокодом ${query.promo}` : null,
    ].filter(Boolean);
    return (
      <EmptyState
        icon={<SearchX />}
        title="Таких заказов нет"
        description={`Ничего ${parts.length ? parts.join(" ") + " " : ""}за ${ORDER_PERIOD_LABELS[query.days]}${query.view !== "all" ? ` в «${ORDER_VIEW_LABELS[query.view]}»` : ""}. Ищите по номеру PMC-…, нику, товару, промокоду или коду блогера.`}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <NavLink href={cleared} className={linkCls}>
              Сбросить фильтры
            </NavLink>
            {query.days !== "90" ? (
              <NavLink href={wider} className={linkCls}>
                Искать за 90 дней
              </NavLink>
            ) : null}
          </div>
        }
      />
    );
  }

  const byView = {
    all: { icon: <Inbox />, title: "Заказов пока нет", description: "Как только игрок оплатит покупку, здесь появится заказ с полной трассой выдачи." },
    issues: {
      icon: <CheckCheck />,
      title: "Все выдачи прошли",
      description: "Сбой бывает, когда сервер не отвечает или на нём нет нужного плагина. Мы повторяем выдачу 5 раз — 30 с, 1, 2 и 5 минут — и пишем вам в Telegram.",
    },
    awaiting: {
      icon: <Clock3 />,
      title: "Никто не ждёт входа",
      description: "Наборы и предметы требуют игрока онлайн. Если он вышел, выдача откладывается и срабатывает через секунду после входа на сервер.",
    },
    disputes: {
      icon: <ShieldCheck />,
      title: "Возвратов и споров нет",
      description: "При чарджбэке PayMC снимет выданное и отправит в банк пакет доказательств: трассу, IP, время входа и UUID.",
    },
    large: {
      icon: <Wallet />,
      title: "Крупных заказов нет",
      description: "Здесь собираются заказы от 1 000 ₽. Их стоит проверять глазами, если риск выше 30.",
    },
  }[query.view];

  return (
    <EmptyState
      icon={byView.icon}
      title={byView.title}
      description={`${byView.description}${query.days !== "90" ? ` Период — ${ORDER_PERIOD_LABELS[query.days]}.` : ""}`}
      action={
        query.days !== "90" ? (
          <NavLink href={wider} className={linkCls}>
            Посмотреть за 90 дней
          </NavLink>
        ) : null
      }
    />
  );
}
