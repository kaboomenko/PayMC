import "server-only";
import {
  CALENDAR,
  CAMPAIGNS,
  CURRENT_PROJECT_ID,
  DAILY,
  DAY,
  FORECAST,
  FUNNEL,
  HOUR,
  NOW_MS,
  ORDERS,
  PRODUCTS,
  SERVERS,
  getKpis,
  isPaid,
  mskDayStart,
  pct,
  windowStart,
} from "@/lib/mock";
import { COUNTRIES, PAYMENT_METHODS } from "@/lib/payments";
import type { CountryCode, DailyPoint, Order, PaymentMethod } from "@/lib/mock/types";
import { morningShare } from "@/components/dashboard/overview/data";
import { formatMoney, formatNumber, formatPercent, pluralize } from "@/lib/format";

export type AnalyticsPeriod = 7 | 30 | 90;

export function parsePeriod(v: string | string[] | undefined): AnalyticsPeriod {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "7" ? 7 : s === "90" ? 90 : 30;
}

const ts = (iso: string) => new Date(iso).getTime();
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** MSK wall-clock parts of an instant */
const mskParts = (t: number) => {
  const d = new Date(t + 3 * HOUR);
  return { dow: (d.getUTCDay() + 6) % 7, hour: d.getUTCHours(), month: d.getUTCMonth() };
};

/* ───────────── KPI strip ───────────── */

export interface StripKpi {
  id: string;
  label: string;
  value: number;
  format: "money" | "percent";
  delta: number;
  unit: "pct" | "pp";
  invert?: boolean;
  hint: string;
  sub: string;
}

/**
 * Online is a daily peak: today's half day (peak so far) would drag any average
 * down, so online and ₽ per online player are compared over full days only —
 * the last `period` finished days against the `period` days before them.
 */
function onlineWindows(period: AnalyticsPeriod) {
  const full = DAILY.slice(-(period + 1), -1);
  const fullPrev = DAILY.slice(-(2 * period + 1), -(period + 1));
  const online = avg(full.map((d) => d.peakOnline));
  const onlinePrev = avg(fullPrev.map((d) => d.peakOnline));
  const rpo = online ? sum(full.map((d) => d.revenue)) / online : 0;
  const rpoPrev = onlinePrev ? sum(fullPrev.map((d) => d.revenue)) / onlinePrev : 0;
  return { online, onlinePrev, rpo, rpoPrev };
}

function kpiStrip(period: AnalyticsPeriod, days: DailyPoint[], prev: DailyPoint[]) {
  const k = getKpis(period);
  const refunds = sum(days.map((d) => d.refunds));
  const refundsPrev = sum(prev.map((d) => d.refunds));
  const ordersPrev = sum(prev.map((d) => d.orders));
  const refundsRatePrev = ordersPrev ? (refundsPrev / (ordersPrev + refundsPrev)) * 100 : 0;
  const on = onlineWindows(period);
  const items: StripKpi[] = [
    {
      id: "revenue",
      label: "Выручка",
      value: k.revenue,
      format: "money",
      delta: pct(k.revenue, k.revenuePrev),
      unit: "pct",
      hint: "Оплачено игроками, без возвратов. Сегодня — по 12:00",
      sub: pluralize(k.orders, ["заказ", "заказа", "заказов"]),
    },
    {
      id: "rpo",
      label: "₽ на игрока онлайн",
      value: Math.round(on.rpo),
      format: "money",
      delta: pct(on.rpo, on.rpoPrev),
      unit: "pct",
      hint: `Выручка / средний пиковый онлайн за ${pluralize(period, ["полный день", "полных дня", "полных дней"])}, без сегодняшнего`,
      sub: `${formatNumber(on.online)} — средний пик`,
    },
    {
      id: "conversion",
      label: "Конверсия игроков",
      value: k.conversion,
      format: "percent",
      delta: k.conversion - k.conversionPrev,
      unit: "pp",
      hint: "Покупатели / активные игроки",
      sub: pluralize(k.buyers, ["покупатель", "покупателя", "покупателей"]),
    },
    { id: "avg", label: "Средний чек", value: k.avgCheck, format: "money", delta: pct(k.avgCheck, k.avgCheckPrev), unit: "pct", hint: "Выручка / заказы", sub: `было ${formatMoney(k.avgCheckPrev)}` },
    {
      id: "refunds",
      label: "Доля возвратов",
      value: k.refundsRate,
      format: "percent",
      delta: k.refundsRate - refundsRatePrev,
      unit: "pp",
      invert: true,
      hint: "Возвраты и чарджбэки / все заказы",
      sub: `${pluralize(refunds, ["возврат", "возврата", "возвратов"])} за период`,
    },
  ];
  return { items, k, ...on };
}

/* ───────────── Revenue × online ───────────── */

export interface ChartEvent {
  id: string;
  title: string;
  from: number; // index in series
  to: number;
  uplift: number | null;
  range: string;
}

const ANNOTATED = new Set(["sale", "holiday", "wipe"]);

function eventsFor(days: DailyPoint[]): ChartEvent[] {
  const first = ts(days[0].date);
  const todayStart = mskDayStart(0);
  const evs = CALENDAR.filter((e) => ANNOTATED.has(e.kind) && ts(e.end) >= first && ts(e.start) <= NOW_MS);
  const inAnyEvent = (dayStart: number) => evs.some((e) => dayStart + DAY > ts(e.start) && dayStart <= ts(e.end));
  return evs.map((e) => {
    const idx = days.map((d, i) => ({ i, t: ts(d.date) })).filter(({ t }) => t + DAY > ts(e.start) && t <= ts(e.end));
    const eventFull = DAILY.filter((d) => ts(d.date) + DAY > ts(e.start) && ts(d.date) <= ts(e.end) && ts(d.date) < todayStart);
    const firstDay = Math.min(...eventFull.map((d) => ts(d.date)));
    const baseline = DAILY.filter((d) => ts(d.date) < firstDay && !inAnyEvent(ts(d.date))).slice(-14);
    const uplift = eventFull.length && baseline.length ? pct(avg(eventFull.map((d) => d.revenue)), avg(baseline.map((d) => d.revenue))) : null;
    const short = e.title.split(":")[0].replace("День народного единства", "4 ноября");
    return {
      id: e.id,
      title: short,
      from: idx[0]?.i ?? 0,
      to: idx[idx.length - 1]?.i ?? 0,
      uplift,
      range: e.title,
    };
  });
}

/** Both changes are over full days (see onlineWindows), so together they make up the revenue change. */
function onlineInsight(rpo: number, online: number) {
  const f = (v: number) => `${v >= 0 ? "+" : "−"}${formatPercent(Math.abs(v))}`;
  if (rpo > 1 && online > 1)
    return { tone: "ok" as const, text: `По полным дням онлайн ${f(online)}, а выручка на игрока онлайн ${f(rpo)}: растёт не только онлайн — игроки платят чаще.` };
  if (rpo > 1)
    return { tone: "ok" as const, text: `Онлайн ${f(online)}, но выручка на игрока онлайн ${f(rpo)}: игроки платят чаще, рост не держится на притоке новых.` };
  if (online > 1)
    return { tone: "warn" as const, text: `Онлайн ${f(online)}, а выручка на игрока ${f(rpo)}: новые игроки пока не покупают — проверьте кампанию «Первая покупка».` };
  return { tone: "warn" as const, text: `Онлайн ${f(online)} и выручка на игрока ${f(rpo)} — посмотрите, не было ли простоев серверов и сбоев выдачи.` };
}

/* ───────────── Heatmap ───────────── */

const DOW_NOM = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
const DOW_ACC = ["понедельник", "вторник", "среду", "четверг", "пятницу", "субботу", "воскресенье"];
const pad = (n: number) => String(n).padStart(2, "0");

function heatmapFor(period: AnalyticsPeriod) {
  const span = Math.max(30, period);
  const from = windowStart(span);
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const o of ORDERS) {
    const t = ts(o.createdAt);
    if (t < from || !isPaid(o)) continue;
    const p = mskParts(t);
    grid[p.dow][p.hour] += o.amount;
  }
  const total = sum(grid.flat()) || 1;
  let best = { d: 0, h: 0, v: 0 };
  for (let d = 0; d < 7; d++)
    for (let h = 0; h < 23; h++) {
      const v = grid[d][h] + grid[d][h + 1];
      if (v > best.v) best = { d, h, v };
    }
  const evening = sum(grid.map((row) => sum(row.slice(18, 24))));
  const byDay = grid.map((row) => sum(row));
  const bestDay = byDay.indexOf(Math.max(...byDay));
  const startMin = best.h * 60 - 30;
  return {
    grid,
    span,
    peak: `${DOW_NOM[best.d]}, ${pad(best.h)}:00–${pad(best.h + 2)}:00`,
    peakShare: (best.v / total) * 100,
    eveningShare: (evening / total) * 100,
    bestDay: DOW_NOM[bestDay],
    launchAt: `в ${DOW_ACC[best.d]} в ${pad(Math.floor(startMin / 60))}:${pad(startMin % 60)}`,
  };
}

/* ───────────── Funnel ───────────── */

const FUNNEL_TIPS: Record<string, { text: (lost: number, conv: number) => string; href: string; cta: string }> = {
  views: {
    text: (_l, c) => `Только ${formatPercent(c)} визитов доходят до карточки товара. Поставьте хиты в первый экран витрины.`,
    href: "/dashboard/storefront",
    cta: "Открыть конструктор витрины",
  },
  checkout: {
    text: (_l, c) =>
      `Больше всего теряем между карточкой и оплатой: начинают оплату ${formatPercent(c)} открывших товар. Покажите на карточке, что игрок получит в игре, и проверьте цену A/B-тестом.`,
    href: "/dashboard/experiments",
    cta: "Запустить A/B-тест",
  },
  paid: {
    text: (l) => `${pluralize(l, ["игрок бросил", "игрока бросили", "игроков бросили"])} оплату. Напоминание «Вернуть в корзину» в чате возвращает часть из них.`,
    href: "/dashboard/campaigns",
    cta: "Настроить кампанию",
  },
  delivered: {
    text: (l) => `${formatNumber(l)} оплаченных заказов не выданы — проверьте серверы и команды.`,
    href: "/dashboard/orders?view=issues",
    cta: "Открыть сбои",
  },
};

/**
 * Storefront funnel for the period: «Оплатили» and «Получили в игре» are the
 * paid orders of the same calendar window as the KPI strip; the upper steps
 * keep the storefront ratios of the 30-day FUNNEL (visits per paid order etc.).
 */
function funnelSteps(paid: Order[]) {
  const base = FUNNEL.find((f) => f.id === "paid")?.value || 1;
  return FUNNEL.map((s) => ({
    ...s,
    value:
      s.id === "paid"
        ? paid.length
        : s.id === "delivered"
          ? paid.filter((o) => o.status === "delivered").length
          : Math.round((s.value / base) * paid.length),
  }));
}

function funnel(paid: Order[]) {
  const raw = funnelSteps(paid);
  const steps = raw.map((s, i) => {
    const prev = raw[i - 1];
    return {
      ...s,
      conv: prev?.value ? (s.value / prev.value) * 100 : 100,
      ofTotal: raw[0].value ? (s.value / raw[0].value) * 100 : 0,
      lost: prev ? prev.value - s.value : 0,
    };
  });
  const worst = steps.slice(1).reduce((w, s) => (s.conv < w.conv ? s : w), steps[1]);
  const tip = FUNNEL_TIPS[worst.id];
  return { steps, worstId: worst.id, tip: tip ? { text: tip.text(worst.lost, worst.conv), href: tip.href, cta: tip.cta } : null };
}

/* ───────────── Forecast ───────────── */

export interface ForecastDatum {
  date: string;
  actual: number | null;
  mid: number | null;
  band: [number, number] | null;
  [key: string]: string | number | null | [number, number];
}

function forecast() {
  const history = DAILY.slice(-15, -1);
  const share = morningShare();
  const todayStart = mskDayStart(0);
  const todayGross = DAILY[DAILY.length - 1].revenue;
  const todayProjected = Math.round(share ? todayGross / share : todayGross);
  const data: ForecastDatum[] = [
    ...history.map((d, i) => ({
      date: d.date,
      actual: d.revenue,
      mid: i === history.length - 1 ? d.revenue : null,
      band: null,
    })),
    { date: new Date(todayStart).toISOString(), actual: null, mid: todayProjected, band: [Math.round(todayProjected * 0.93), Math.round(todayProjected * 1.07)] },
    ...FORECAST.map((f) => ({ date: f.date, actual: null, mid: f.mid, band: [f.low, f.high] as [number, number] })),
  ];
  const mid = sum(FORECAST.map((f) => f.mid));
  const low = sum(FORECAST.map((f) => f.low));
  const high = sum(FORECAST.map((f) => f.high));
  const md = (iso: string) => {
    const d = new Date(ts(iso) + 3 * HOUR);
    return (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  };
  const bf = FORECAST.filter((f) => md(f.date) >= 1127 && md(f.date) <= 1130);
  const wipe = FORECAST.find((f) => md(f.date) === 1201);
  const usual = avg(FORECAST.filter((f) => md(f.date) < 1127).map((f) => f.mid));
  return {
    data,
    total: { mid, low, high, spread: ((high - low) / 2 / mid) * 100 },
    markers: {
      bf: bf.length ? { from: bf[0].date, to: bf[bf.length - 1].date, sum: sum(bf.map((f) => f.mid)) } : null,
      wipe: wipe ? { at: wipe.date, value: wipe.mid, vsUsual: pct(wipe.mid, usual) } : null,
    },
    usualDay: usual,
  };
}

/* ───────────── Splits ───────────── */

/** Paid orders of the calendar window (same days as the KPI strip: DAILY.slice(-days)). */
const paidIn = (days: number) => {
  const from = windowStart(days);
  return ORDERS.filter((o) => isPaid(o) && ts(o.createdAt) >= from);
};

function group<K extends string>(orders: Order[], key: (o: Order) => K) {
  const map = new Map<K, { amount: number; count: number }>();
  for (const o of orders) {
    const k = key(o);
    const v = map.get(k) ?? { amount: 0, count: 0 };
    v.amount += o.amount;
    v.count += 1;
    map.set(k, v);
  }
  const total = sum(orders.map((o) => o.amount)) || 1;
  return [...map.entries()].map(([k, v]) => ({ key: k, ...v, share: v.amount / total })).sort((a, b) => b.amount - a.amount);
}

const PRODUCT_CATEGORY = new Map(PRODUCTS.map((p) => [p.id, p.category]));

function splits(period: AnalyticsPeriod) {
  const orders = paidIn(period);
  const methods = group<PaymentMethod>(orders, (o) => o.method).map((m) => ({
    ...m,
    label: PAYMENT_METHODS[m.key].label,
    settlement: PAYMENT_METHODS[m.key].settlement,
  }));
  const countries = group<CountryCode>(orders, (o) => o.country).map((c) => ({
    ...c,
    label: COUNTRIES[c.key].name,
    rails: c.key === "RU" ? "все способы РФ" : c.key === "KZ" ? "Kaspi — скоро" : c.key === "BY" ? "ЕРИП — скоро" : "Visa/MC — скоро",
  }));
  const serverMap = group<string>(orders, (o) => o.serverId);
  const servers = SERVERS.filter((s) => s.projectId === CURRENT_PROJECT_ID).map((s) => {
    const row = serverMap.find((x) => x.key === s.id);
    return { id: s.id, label: s.name, status: s.status, amount: row?.amount ?? 0, count: row?.count ?? 0, share: row?.share ?? 0 };
  });
  // categories — split each order's paid amount across its lines
  const cat = new Map<string, { amount: number; lines: number }>();
  let lines = 0;
  for (const o of orders) {
    const gross = o.items.reduce((a, it) => a + it.price * it.qty, 0) || 1;
    for (const it of o.items) {
      const c = PRODUCT_CATEGORY.get(it.productId) ?? "Другое";
      const v = cat.get(c) ?? { amount: 0, lines: 0 };
      v.amount += Math.round((it.price * it.qty * o.amount) / gross);
      v.lines += 1;
      lines += 1;
      cat.set(c, v);
    }
  }
  const catTotal = sum([...cat.values()].map((v) => v.amount)) || 1;
  const categories = [...cat.entries()]
    .map(([label, v]) => ({ label, amount: v.amount, share: v.amount / catTotal, lineShare: v.lines / (lines || 1) }))
    .sort((a, b) => b.amount - a.amount);
  return { methods, countries, servers, categories, orders: orders.length, paid: orders };
}

/* ───────────── Cohorts ───────────── */

const MONTH_LABEL = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const MONTH_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export interface CohortRow {
  month: string;
  size: number;
  cells: ({ pct: number; count: number; partial: boolean } | null)[];
}

function cohorts() {
  const current = mskParts(NOW_MS).month;
  const byPlayer = new Map<string, Map<number, number>>();
  for (const o of ORDERS) {
    if (!isPaid(o)) continue;
    const m = mskParts(ts(o.createdAt)).month;
    const pm = byPlayer.get(o.playerId) ?? new Map<number, number>();
    pm.set(m, (pm.get(m) ?? 0) + 1);
    byPlayer.set(o.playerId, pm);
  }
  const months = [current - 3, current - 2, current - 1, current];
  const rows: CohortRow[] = months.map((m0) => {
    const members = [...byPlayer.values()].filter((pm) => Math.min(...pm.keys()) === m0);
    const size = members.length;
    const cells = [0, 1, 2, 3].map((k) => {
      const m = m0 + k;
      if (m > current) return null;
      const count = members.filter((pm) => (k === 0 ? (pm.get(m0) ?? 0) >= 2 : (pm.get(m) ?? 0) >= 1)).length;
      return { pct: size ? (count / size) * 100 : 0, count, partial: m === current };
    });
    return { month: MONTH_LABEL[m0], size, cells };
  });
  const players = [...byPlayer.values()];
  const repeat = players.filter((pm) => sum([...pm.values()]) >= 2).length;
  const next = rows.map((r) => r.cells[1]).filter((c): c is NonNullable<typeof c> => !!c && !c.partial);
  const guide = rows.find((r) => r.cells[1] && !r.cells[1].partial);
  return {
    rows,
    logStart: ORDERS[0].createdAt,
    repeatShare: players.length ? (repeat / players.length) * 100 : 0,
    nextMonthAvg: next.length ? avg(next.map((c) => c.pct)) : 0,
    guide: guide ? { monthGen: MONTH_GEN[MONTH_LABEL.indexOf(guide.month)], size: guide.size, pct: guide.cells[1]!.pct } : null,
  };
}

/* ───────────── Insights ───────────── */

function insights(s: Omit<ReturnType<typeof splits>, "paid">, f: ReturnType<typeof funnel>) {
  const cases = s.categories.find((c) => c.label === "Кейсы");
  const nonRu = s.countries.filter((c) => c.key !== "RU");
  const kz = s.countries.find((c) => c.key === "KZ");
  const anarchy = s.servers.find((x) => x.id === "srv-anarchy");
  const anarchyFailed = ORDERS.filter((o) => o.serverId === "srv-anarchy" && (o.status === "failed" || o.status === "retrying")).length;
  const checkout = f.steps.find((x) => x.id === "checkout")?.value ?? 0;
  const paid = f.steps.find((x) => x.id === "paid")?.value ?? 0;
  const cart = CAMPAIGNS.find((c) => c.type === "abandoned_cart");
  return {
    cases: cases ? { lineShare: cases.lineShare * 100, revenueShare: cases.share * 100 } : null,
    abroad: { share: sum(nonRu.map((c) => c.share)) * 100, kzShare: (kz?.share ?? 0) * 100, kzOrders: kz?.count ?? 0 },
    anarchy: anarchy ? { share: anarchy.share * 100, issues: anarchyFailed } : null,
    cart: { abandoned: checkout - paid, rate: checkout ? ((checkout - paid) / checkout) * 100 : 0, recovered: cart?.stats.converted ?? 0, revenue: cart?.stats.revenue ?? 0 },
  };
}

/* ───────────── Entry ───────────── */

export function buildAnalytics(period: AnalyticsPeriod) {
  const days = DAILY.slice(-period);
  const prev = DAILY.slice(-2 * period, -period);
  const strip = kpiStrip(period, days, prev);
  const { paid, ...sp } = splits(period);
  const fun = funnel(paid);
  const last = days.length - 1;
  return {
    period,
    range: { from: days[0].date, to: days[last].date, prevFrom: prev[0]?.date ?? days[0].date, prevTo: prev[prev.length - 1]?.date ?? days[0].date },
    strip: strip.items,
    combo: {
      // today's peak online is only «so far»: no point on the line, the value stays in the tooltip
      data: days.map((d, i) => ({ date: d.date, revenue: d.revenue, online: i === last ? null : d.peakOnline, onlineSoFar: i === last ? d.peakOnline : null })),
      events: eventsFor(days),
      insight: onlineInsight(pct(strip.rpo, strip.rpoPrev), pct(strip.online, strip.onlinePrev)),
    },
    heatmap: heatmapFor(period),
    funnel: fun,
    forecast: forecast(),
    splits: sp,
    cohorts: cohorts(),
    insights: insights(sp, fun),
    csv: days.map((d) => ({ date: d.date, revenue: d.revenue, orders: d.orders, buyers: d.buyers, newBuyers: d.newBuyers, peakOnline: d.peakOnline, uniquePlayers: d.uniquePlayers, refunds: d.refunds })),
  };
}

export type AnalyticsData = ReturnType<typeof buildAnalytics>;
