import "server-only";
import {
  BALANCE,
  DAILY,
  DAY,
  FORECAST,
  HOUR,
  METHOD_SPLIT,
  NOW_MS,
  ORDERS,
  PRODUCTS,
  PROJECTS,
  CURRENT_PROJECT_ID,
  SERVERS,
  TEAM,
  getIssues,
  getKpis,
  getRecentOrders,
  getServer,
  isPaid,
  msk,
  mskDayStart,
  pct,
} from "@/lib/mock";
import { memberRoleMeta, orderStatusMeta } from "@/lib/mock/meta";
import { PAYMENT_METHODS } from "@/lib/payments";
import { formatDuration, formatMoney, formatNumber, formatPercent, plural, pluralize } from "@/lib/format";
import type { Order } from "@/lib/mock/types";
import type {
  AttentionData,
  AttentionGroup,
  AttentionOrder,
  GoalData,
  KpiTile,
  MethodSlice,
  OverviewPulseData,
  PayoutPreview,
  PeriodBundle,
  RecentOrderRow,
  ServerRow,
  SetupStep,
} from "./types";

const ts = (iso: string) => new Date(iso).getTime();
const sumOf = <T,>(list: T[], f: (x: T) => number) => list.reduce((a, x) => a + f(x), 0);

/** Paid revenue in [from, to) straight from the order log. */
function revenueBetween(from: number, to: number) {
  let total = 0;
  for (const o of ORDERS) {
    const t = ts(o.createdAt);
    if (t >= from && t < to && isPaid(o)) total += o.amount;
  }
  return total;
}

/** Share of a day's revenue that usually lands before the current hour (MSK), last 28 full days. */
export function morningShare() {
  const cutoffHour = (NOW_MS - mskDayStart(0)) / HOUR;
  let before = 0;
  let all = 0;
  const from = mskDayStart(28);
  const to = mskDayStart(0);
  for (const o of ORDERS) {
    const t = ts(o.createdAt);
    if (t < from || t >= to || !isPaid(o)) continue;
    const h = ((t - mskDayStart(0)) % DAY + DAY) % DAY / HOUR;
    all += o.amount;
    if (h < cutoffHour) before += o.amount;
  }
  return all ? before / all : 0.22;
}

function periodBundle(days: 7 | 30): PeriodBundle {
  const k = getKpis(days);
  const cur = DAILY.slice(-days);
  const prev = DAILY.slice(-2 * days, -days);
  const full = DAILY.slice(-(days + 1), -1);
  const todayIdx = cur.length - 1;
  // compare today's partial day with the same time of day in the previous period
  const prevDayStart = ts(prev[todayIdx].date);
  const prevPartial = revenueBetween(prevDayStart, prevDayStart + (NOW_MS - mskDayStart(0)));

  // today is only half over: leave it out of the line (it reads as a crash) — the
  // «Сегодня к 12:00» stat under the chart compares it fairly with prevPartial
  void prevPartial;
  const series = cur.map((d, i) => ({ date: d.date, cur: i === todayIdx ? null : d.revenue, prev: i === todayIdx ? null : (prev[i]?.revenue ?? null) }));
  const fullCur = cur.slice(0, -1);
  const best = fullCur.reduce((b, d) => (d.revenue > b.revenue ? d : b), fullCur[0]);

  const uniq = k.conversion ? Math.round(k.buyers / (k.conversion / 100)) : 0;

  const kpis: KpiTile[] = [
    {
      id: "revenue",
      label: "Выручка",
      caption: "оплачено игроками, без возвратов",
      value: formatMoney(k.revenue),
      prev: formatMoney(k.revenuePrev),
      delta: pct(k.revenue, k.revenuePrev),
      deltaUnit: "pct",
      spark: full.map((d) => d.revenue),
    },
    {
      id: "orders",
      label: "Заказы",
      caption: "оплаченные заказы",
      value: formatNumber(k.orders),
      prev: formatNumber(k.ordersPrev),
      delta: pct(k.orders, k.ordersPrev),
      deltaUnit: "pct",
      sub: `${formatNumber(k.orders / days, 1)} в день`,
      spark: full.map((d) => d.orders),
    },
    {
      id: "avgCheck",
      label: "Средний чек",
      caption: "выручка / заказы",
      value: formatMoney(k.avgCheck),
      prev: formatMoney(k.avgCheckPrev),
      delta: pct(k.avgCheck, k.avgCheckPrev),
      deltaUnit: "pct",
      spark: full.map((d) => (d.orders ? d.revenue / d.orders : 0)),
    },
    {
      id: "conversion",
      label: "Конверсия в покупателей",
      caption: "покупатели / активные игроки",
      value: formatPercent(k.conversion),
      prev: formatPercent(k.conversionPrev),
      delta: k.conversion - k.conversionPrev,
      deltaUnit: "pp",
      sub: `${formatNumber(k.buyers)} из ${formatNumber(uniq)} ${plural(uniq, ["игрока", "игроков", "игроков"])}`,
      spark: full.map((d) => (d.uniquePlayers ? (d.buyers / d.uniquePlayers) * 100 : 0)),
    },
  ];

  return {
    days,
    kpis,
    series,
    total: k.revenue,
    delta: pct(k.revenue, k.revenuePrev),
    best: { date: best.date, revenue: best.revenue },
    avgPerDay: Math.round(sumOf(full, (d) => d.revenue) / full.length),
  };
}

export function buildPulse(): OverviewPulseData {
  const today = DAILY[DAILY.length - 1];
  const weekAgoStart = mskDayStart(7);
  const novStart = ts(msk(2026, 11, 1));
  const decStart = ts(msk(2026, 12, 1));
  const novActual = sumOf(
    DAILY.filter((d) => ts(d.date) >= novStart),
    (d) => d.revenue,
  );
  const novRest = sumOf(
    FORECAST.filter((f) => ts(f.date) < decStart),
    (f) => f.mid,
  );
  return {
    periods: { "7": periodBundle(7), "30": periodBundle(30) },
    today: {
      gross: today.revenue,
      orders: today.orders,
      sameTimeLastWeek: revenueBetween(weekAgoStart, weekAgoStart + (NOW_MS - mskDayStart(0))),
      weekAgo: new Date(weekAgoStart).toISOString(),
    },
    novemberForecast: { actual: novActual, forecast: novActual + novRest },
  };
}

/* ───────────── Attention: issues grouped by root cause ───────────── */

const PLUGIN_BY_COMMAND: Record<string, string> = {
  points: "PlayerPoints",
  lp: "LuckPerms",
  excellentcrates: "ExcellentCrates",
  "essentials:kit": "EssentialsX",
  "litebans:unban": "LiteBans",
  "litebans:unmute": "LiteBans",
};

const SEVERITY = { fail: 0, offline: 1, degraded: 2, other: 3 } as const;

function toAttentionOrder(o: Order): AttentionOrder {
  return {
    id: o.id,
    playerName: o.playerName,
    item: o.items.map((it) => (it.qty > 1 ? `${it.name} ×${it.qty}` : it.name)).join(", "),
    amount: o.amount,
    status: o.status as AttentionOrder["status"],
    createdAt: o.createdAt,
  };
}

export function buildAttention(): AttentionData {
  const issues = getIssues();
  const latestAgent = [...SERVERS].map((s) => s.agentVersion).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
  const groups = new Map<string, AttentionGroup & { rank: number }>();

  // servers that are not healthy — a group even when no order is stuck on them yet
  for (const s of issues.servers) {
    const offline = s.status === "offline";
    groups.set(`srv:${s.id}`, {
      id: `srv:${s.id}`,
      rank: offline ? SEVERITY.offline : SEVERITY.degraded,
      tone: offline ? "bad" : "warn",
      pulse: offline,
      server: s.name,
      title: offline ? `нет связи ${formatDuration(NOW_MS - ts(s.lastSeenAt))}` : `TPS ${formatNumber(s.tps ?? 0, 1)} · ответ ${formatNumber(s.latencyMs)} мс`,
      detail: offline
        ? `${pluralize(s.queue, ["задание", "задания", "заданий"])} в очереди — выполним, как только сервер вернётся`
        : s.agentVersion !== latestAgent
          ? `Плагин PayMC ${s.agentVersion} → ${latestAgent}: обновление убирает задержку выдачи`
          : "Агент отвечает медленно — повторяем выдачу сами",
      href: "/dashboard/servers",
      cta: offline ? "Сервер" : "Обновить",
      orders: [],
    });
  }

  for (const o of issues.orders) {
    const server = getServer(o.serverId);
    const serverName = server?.name ?? "сервер";
    if (o.status === "failed") {
      const product = PRODUCTS.find((p) => p.id === o.items[0]?.productId);
      const template = product?.commands[0]?.template ?? "";
      const root = template.split(" ")[0];
      const plugin = PLUGIN_BY_COMMAND[root] ?? root;
      const key = `fail:${o.serverId}:${root}`;
      if (!groups.has(key)) {
        const command = template
          .replace("{player}", o.playerName)
          .replace("{amount}", String(o.items[0]?.qty ?? 1))
          .replace("{days}", String(product?.durationDays ?? 30));
        groups.set(key, {
          id: key,
          rank: SEVERITY.fail,
          tone: "bad",
          pulse: false,
          server: serverName,
          title: `нет плагина ${plugin}`,
          detail: `Автоповторы закончились. Установите ${plugin} или поменяйте команду в товаре${product ? ` «${product.name}»` : ""}`,
          href: product ? `/dashboard/products/${product.id}` : "/dashboard/products",
          cta: "Товар",
          console: { command, output: "Unknown or incomplete command, see below for error" },
          orders: [],
        });
      }
      groups.get(key)!.orders.push(toAttentionOrder(o));
      continue;
    }
    const key = `srv:${o.serverId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        rank: SEVERITY.other,
        tone: "warn",
        pulse: false,
        server: serverName,
        title: "не подтвердил выдачу",
        detail: "Повторяем с нарастающим интервалом",
        href: "/dashboard/servers",
        cta: "Сервер",
        orders: [],
      });
    }
    groups.get(key)!.orders.push(toAttentionOrder(o));
  }

  const list = [...groups.values()].sort((a, b) => a.rank - b.rank).map(({ rank, ...g }) => (void rank, g));
  return { groups: list, awaiting: issues.awaiting.length, orders: issues.orders.length };
}

/* ───────────── Lists ───────────── */

export function buildRecentOrders(n = 8): RecentOrderRow[] {
  return getRecentOrders(n).map((o) => ({
    id: o.id,
    playerName: o.playerName,
    items: o.items.map((it) => (it.qty > 1 ? `${it.name} ×${it.qty}` : it.name)).join(", "),
    amount: o.amount,
    method: PAYMENT_METHODS[o.method].short,
    status: o.status,
    statusLabel: orderStatusMeta[o.status].label,
    tone: orderStatusMeta[o.status].tone,
    createdAt: o.createdAt,
    serverName: getServer(o.serverId)?.name ?? "",
  }));
}

export function buildServers(): ServerRow[] {
  return SERVERS.filter((s) => s.projectId === CURRENT_PROJECT_ID).map((s) => ({
    id: s.id,
    name: s.name,
    platform: s.platform.split(" · ")[0],
    status: s.status,
    online: s.online,
    maxOnline: s.maxOnline,
    latencyMs: s.latencyMs,
    queue: s.queue,
    tps: s.tps,
    agentVersion: s.agentVersion,
    onlineHistory: s.onlineHistory,
    note: [
      s.status === "offline"
        ? `нет связи ${formatDuration(NOW_MS - ts(s.lastSeenAt))}`
        : s.status === "degraded"
          ? `TPS ${formatNumber(s.tps ?? 0, 1)}`
          : s.platform.split(" · ")[0],
      s.queue ? `${s.queue} в очереди` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }));
}

export function buildGoal(): GoalData | null {
  const project = PROJECTS.find((p) => p.id === CURRENT_PROJECT_ID);
  if (!project?.goal) return null;
  const { title, target, raised } = project.goal;
  const daysLeft = Math.max(1, (ts(msk(2026, 12, 1)) - NOW_MS) / DAY);
  return {
    title,
    shortTitle: "Аренда сервера",
    target,
    raised,
    daysLeft: Math.floor(daysLeft),
    perDay: Math.ceil((target - raised) / daysLeft / 10) * 10,
    servers: SERVERS.filter((s) => s.projectId === CURRENT_PROJECT_ID && s.status !== "offline").length,
    lastSupporter: getRecentOrders(30).find((o) => o.status === "delivered" || o.status === "delivering")?.playerName ?? "Steve_Pro",
  };
}

export function buildMethods(): MethodSlice[] {
  return METHOD_SPLIT.map((m) => ({
    key: m.key,
    label: m.label,
    amount: m.amount,
    count: m.count,
    share: m.share,
    settlement: PAYMENT_METHODS[m.key].settlement,
  }));
}

export function buildPayout(): PayoutPreview {
  const share = morningShare();
  const projected = share > 0 ? BALANCE.todayGross / share : BALANCE.todayGross;
  const estimate = Math.round((projected * (1 - 0.039)) / 10) * 10;
  const members = TEAM.filter((m) => m.splitPct > 0);
  return {
    at: BALANCE.nextPayoutAt,
    estimate,
    todayGross: BALANCE.todayGross,
    morningShare: share,
    available: BALANCE.available,
    pending: BALANCE.pending,
    splits: members.map((m) => ({
      id: m.id,
      name: m.name,
      role: memberRoleMeta[m.role].label,
      pct: m.splitPct,
      amount: Math.round((estimate * m.splitPct) / 100),
      destination: m.payoutDestination ?? "—",
    })),
  };
}

export const SETUP_STEPS: SetupStep[] = [
  { id: "project", title: "Создать проект и витрину", hint: "shop.arcticmc.ru", done: true },
  { id: "server", title: "Подключить сервер", hint: "Плагин PayMC на 4 серверах", done: true },
  { id: "products", title: "Добавить товары и команды выдачи", hint: "22 активных товара", done: true },
  { id: "payouts", title: "Указать реквизиты для выплат", hint: "СБП и карта Мир, резерв — Точка", done: true },
  { id: "receipts", title: "Включить чеки «Мой налог»", hint: "Партнёрский доступ ФНС", done: true },
  { id: "team", title: "Пригласить команду и настроить сплит", hint: "60 / 25 / 15", done: true },
  {
    id: "verify",
    title: "Пройти проверку проекта",
    hint: "Значок «Проверено PayMC» на витрине — игроки охотнее платят незнакомому серверу",
    done: false,
  },
];
