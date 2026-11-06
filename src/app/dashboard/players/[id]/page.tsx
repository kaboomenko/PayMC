import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock3, Crown, Infinity as InfinityIcon, Minus, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { PixelAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tooltip } from "@/components/ui/tooltip";
import { CAMPAIGNS, DAY, NOW_MS, PRODUCTS, SERVERS, TEAM, getOrdersByPlayer, getPlayer } from "@/lib/mock";
import { channelMeta, playerFlagMeta, segmentMeta } from "@/lib/mock/meta";
import type { Player, PlayerFlag } from "@/lib/mock/types";
import { COUNTRIES, PAYMENT_METHODS } from "@/lib/payments";
import { MONTHS_NOM, MONTHS_SHORT, formatDate, formatMoney, formatNumber, formatPlaytime, formatRelative, plural, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatExact, riskLabel, riskTone, toneBg, toneText } from "@/components/dashboard/orders/format";
import { ORDER_LOG_START, daysLeft, vkFor } from "@/components/dashboard/players/data";
import { Stat, StatStrip } from "@/components/dashboard/overview/stat-strip";
import { BlockedBadge, MinorLimitBanner, PlayerActions, type GrantProduct } from "@/components/dashboard/players/player-actions";
import { PlayerProvider, type PlayerOrderRow } from "@/components/dashboard/players/player-context";
import { PlayerHistory } from "@/components/dashboard/players/player-history";
import { PlayerNotes, type PlayerNote } from "@/components/dashboard/players/player-notes";
import { PlayerSpendChart } from "@/components/dashboard/players/player-spend-chart";
import { LinkedAccounts } from "@/components/dashboard/players/linked-accounts";

export async function generateMetadata(props: PageProps<"/dashboard/players/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const p = getPlayer(id);
  return { title: p ? `${p.name} · Игроки` : "Игрок не найден" };
}

const SERVER_NAME = new Map(SERVERS.map((s) => [s.id, s.name]));
const FLAG_WEIGHT: Record<PlayerFlag, number> = { network_blacklist: 60, chargeback: 45, many_cards: 25, vpn: 15, minor_suspect: 10 };
const HISTORY_LIMIT = 25;

function grantProducts(p: Player): GrantProduct[] {
  return PRODUCTS.filter((x) => x.status === "active" && x.kind !== "pool").map((x) => ({
    id: x.id,
    name: x.name,
    price: x.price,
    kind: x.kind,
    commands: x.commands.map((c) =>
      c.template
        .replaceAll("{player}", p.name)
        .replaceAll("{amount}", "1")
        .replaceAll("{days}", String(x.durationDays ?? 30))
        .replace(" accumulate", ""),
    ),
    requireOnline: x.commands.some((c) => c.requireOnline),
    serverName: x.serverIds.length > 1 ? "все серверы сети" : (SERVER_NAME.get(x.serverIds[0]) ?? x.serverIds[0]),
  }));
}

interface Factor {
  sign: "+" | "−";
  tone: "ok" | "warn" | "bad";
  label: string;
  hint: string;
  weight?: number;
}

function riskFactors(p: Player, methods: Map<string, number>, chargebacks: number): Factor[] {
  const out: Factor[] = p.flags.map((f) => ({
    sign: "+",
    tone: playerFlagMeta[f].tone === "bad" ? "bad" : "warn",
    label: playerFlagMeta[f].label,
    hint: playerFlagMeta[f].hint,
    weight: FLAG_WEIGHT[f],
  }));
  const age = Math.floor((NOW_MS - new Date(p.firstSeenAt).getTime()) / DAY);
  if (age >= 60) out.push({ sign: "−", tone: "ok", label: `Аккаунту ${pluralize(age, ["день", "дня", "дней"])}`, hint: "Старые аккаунты почти не оспаривают платежи" });
  else out.push({ sign: "+", tone: "warn", label: `Новый аккаунт — ${pluralize(age, ["день", "дня", "дней"])}`, hint: "Первые недели — самые рискованные для чарджбэков" });
  if (p.orders > 0 && chargebacks === 0)
    out.push({ sign: "−", tone: "ok", label: `Ни одного спора за ${pluralize(p.orders, ["заказ", "заказа", "заказов"])}`, hint: "Возвратов через банк не было" });
  const main = [...methods.entries()].sort((a, b) => b[1] - a[1])[0];
  if (methods.size === 1 && main)
    out.push({ sign: "−", tone: "ok", label: `Платит одним способом — ${PAYMENT_METHODS[main[0] as keyof typeof PAYMENT_METHODS].label}`, hint: "Смена карт — частый признак кражи данных" });
  else if (methods.size >= 3) out.push({ sign: "+", tone: "warn", label: `${pluralize(methods.size, ["способ", "способа", "способов"])} оплаты`, hint: "Разные карты и кошельки — смотрим внимательнее" });
  if (p.playtimeMin > 50 * 60) out.push({ sign: "−", tone: "ok", label: `Наиграл ${formatPlaytime(p.playtimeMin)}`, hint: "Покупает для себя, а не перепродаёт аккаунты" });
  return out;
}

function buildNotes(p: Player, firstOrder?: { at: string; item: string; amount: number }, cbOrder?: string): PlayerNote[] {
  const mod = TEAM.find((m) => m.role === "moderator");
  const admin = TEAM.find((m) => m.role === "admin");
  const notes: PlayerNote[] = [];
  if (p.flags.includes("minor_suspect"))
    notes.push({
      id: "n-minor",
      author: mod?.name ?? "Модератор",
      role: "Модератор",
      text: "Написала мама: списания с её карты, просит ограничить. Предложил дневной лимит — ждём ответа.",
      at: new Date(NOW_MS - 2 * DAY - 5 * 3_600_000).toISOString(),
    });
  if (cbOrder)
    notes.push({
      id: "n-cb",
      author: null,
      text: `Банк оспорил ${cbOrder} (код 4837 «Не совершал операцию»). Выданное снято, пакет доказательств отправлен.`,
      at: new Date(NOW_MS - 9 * DAY).toISOString(),
    });
  if (p.segment === "whale")
    notes.push({
      id: "n-whale",
      author: admin?.name ?? "Администратор",
      role: "Администратор",
      text: "Один из самых активных покупателей. На новогоднем ивенте — выдать уникальный префикс в подарок.",
      at: new Date(NOW_MS - 12 * DAY - 3 * 3_600_000).toISOString(),
    });
  if (p.telegram) notes.push({ id: "n-tg", author: null, text: `Привязал Telegram ${p.telegram} — уведомления о выдаче уходят туда.`, at: new Date(new Date(p.firstSeenAt).getTime() + 2 * DAY).toISOString() });
  if (firstOrder)
    notes.push({
      id: "n-first",
      author: null,
      // the order log starts on 9 Aug — for older players this is the first purchase we have, not necessarily the first ever
      text: `${new Date(p.firstSeenAt).getTime() < new Date(ORDER_LOG_START).getTime() ? "Первая покупка в журнале заказов" : "Первая покупка"}: ${firstOrder.item} за ${formatMoney(firstOrder.amount)}.`,
      at: firstOrder.at,
    });
  notes.push({ id: "n-joined", author: null, text: "Впервые зашёл на сервер.", at: p.firstSeenAt });
  return notes.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export default async function PlayerPage(props: PageProps<"/dashboard/players/[id]">) {
  const { id } = await props.params;
  const p = getPlayer(id);
  if (!p) notFound();

  const orders = getOrdersByPlayer(p.id);
  const methods = new Map<string, number>();
  for (const o of orders) methods.set(o.method, (methods.get(o.method) ?? 0) + 1);
  const chargebacks = orders.filter((o) => o.status === "chargeback");
  const first = orders[orders.length - 1];
  const tone = riskTone(p.risk);
  const factors = riskFactors(p, methods, chargebacks.length);
  const serverName = p.serverId ? SERVER_NAME.get(p.serverId) : undefined;
  const expiring = CAMPAIGNS.find((c) => c.type === "rank_expiring" && c.status === "active");
  const minor = p.flags.includes("minor_suspect");

  const history: PlayerOrderRow[] = orders.slice(0, HISTORY_LIMIT).map((o) => ({
    id: o.id,
    items: o.items.map((it) => ({ name: it.name, qty: it.qty })),
    amount: o.amount,
    status: o.status,
    createdAt: o.createdAt,
    serverName: SERVER_NAME.get(o.serverId) ?? o.serverId,
  }));

  // spendHistory is Jun..Nov, but orders are logged only from 9 Aug: earlier months are not «zero», they are unknown
  const logStartMs = new Date(ORDER_LOG_START).getTime();
  const logMonth = new Date(logStartMs + 3 * 3_600_000).getUTCMonth();
  const logDay = formatDate(ORDER_LOG_START, { year: false });
  const nowMonth = new Date(NOW_MS + 3 * 3_600_000).getUTCMonth();
  const spend = p.spendHistory
    .map((v, i) => {
      const m = 5 + i;
      const note = m === logMonth ? `, с ${logDay.split(" ")[0]}-го` : m === nowMonth ? `, по ${formatDate(NOW_MS, { year: false }).split(" ")[0]}-е` : "";
      return { m, month: MONTHS_SHORT[m], full: `${MONTHS_NOM[m]} 2026${note}`, spend: v };
    })
    .filter((d) => d.m >= logMonth)
    .map(({ month, full, spend: v }) => ({ month, full, spend: v }));
  const spendTotal = spend.reduce((a, d) => a + d.spend, 0);
  const peak = spend.reduce((best, d) => (d.spend > best.spend ? d : best), spend[0]);
  const ltvSince = new Date(Math.max(logStartMs, new Date(p.firstSeenAt).getTime()));
  const vk = vkFor(p);
  const linked = [p.telegram, vk].filter(Boolean).length;
  const ranks = p.activeRanks.map((r) => {
    const product = PRODUCTS.find((x) => x.name === r.name);
    return { name: r.name, left: daysLeft(r.expiresAt), duration: product?.durationDays ?? null, expiresAt: r.expiresAt };
  });

  return (
    <PlayerProvider>
      {/* header */}
      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="relative shrink-0">
            <PixelAvatar name={p.name} size={64} className="rounded-md" />
            {p.online ? <span aria-hidden className="absolute -right-1 -bottom-1 size-3.5 rounded-full bg-ok ring-[3px] ring-canvas" /> : null}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[26px] leading-tight font-semibold tracking-[-0.03em] text-fg">{p.name}</h1>
              <Badge tone={segmentMeta[p.segment].tone} size="md">
                {segmentMeta[p.segment].label}
              </Badge>
              {p.flags.map((f) => (
                <Tooltip key={f} content={playerFlagMeta[f].hint}>
                  <span>
                    <Badge tone={playerFlagMeta[f].tone} size="md">
                      {playerFlagMeta[f].label}
                    </Badge>
                  </span>
                </Tooltip>
              ))}
              <BlockedBadge />
            </div>
            <p className="mt-1 text-[13px]">
              {p.online ? (
                <span className="text-ok">в игре · {serverName}</span>
              ) : (
                <Tooltip content={formatExact(p.lastSeenAt)}>
                  <span className="text-fg-3">был {formatRelative(p.lastSeenAt, NOW_MS)}</span>
                </Tooltip>
              )}
            </p>
            <dl className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-fg-3">
              <div className="flex min-w-0 items-center gap-1">
                <dt className="sr-only">UUID</dt>
                <dd className="truncate font-mono text-[11.5px] text-fg-2">{p.externalId}</dd>
                <CopyButton value={p.externalId} label="Скопировать UUID" className="size-6" />
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Страна</dt>
                <dd>
                  {COUNTRIES[p.country].name} <span className="font-mono text-[11px] text-fg-4">{p.country}</span>
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt>с нами с</dt>
                <dd className="text-fg-2">{formatDate(p.firstSeenAt)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt>наиграно</dt>
                <dd className="text-fg-2 nums">{formatPlaytime(p.playtimeMin)}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:max-w-[460px] lg:justify-end">
          <PlayerActions
            player={{ id: p.id, name: p.name, online: p.online, serverName, telegram: p.telegram, minorSuspect: minor }}
            products={grantProducts(p)}
          />
        </div>
      </div>

      {minor ? <MinorLimitBanner name={p.name} /> : null}

      {/* KPI strip — the same component as on the players list and in analytics */}
      <StatStrip cols="grid-cols-2 lg:grid-cols-4" className="mb-6">
        <Stat
          label="LTV"
          hint={`Сумма оплат игрока без возвратов. Журнал заказов ведётся с ${logDay}`}
          value={formatMoney(p.ltv)}
          sub={p.ltv ? `с ${formatDate(ltvSince, { year: false })}` : "ещё не платил"}
        />
        <Stat label="Заказов" value={formatNumber(p.orders)} sub={p.lastOrderAt ? `последний ${formatRelative(p.lastOrderAt, NOW_MS)}` : "—"} />
        <Stat label="Средний чек" value={p.avgCheck ? formatMoney(p.avgCheck) : "—"} sub={p.favoriteCategory ? `чаще всего — ${p.favoriteCategory.toLowerCase()}` : "—"} />
        <Stat label="Наиграно" value={formatPlaytime(p.playtimeMin)} sub={p.ltv ? `${formatMoney(p.ltv / Math.max(1, p.playtimeMin / 60))} за час игры` : "без покупок"} />
      </StatStrip>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Траты по месяцам</CardTitle>
                <CardDescription>
                  С {logDay} — с начала журнала заказов{spendTotal ? ` · пик — ${peak.full.split(" ")[0].toLowerCase()}, ${formatMoney(peak.spend)}` : ""}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {spendTotal ? (
                <PlayerSpendChart data={spend} />
              ) : (
                <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-line text-[13px] text-fg-3">
                  С {logDay} ни одной покупки
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-line-soft pb-3">
              <div>
                <CardTitle>Покупки</CardTitle>
                <CardDescription>Клик по номеру откроет заказ с трассой выдачи</CardDescription>
              </div>
            </CardHeader>
            <PlayerHistory rows={history} total={orders.length} allHref={`/dashboard/orders?q=${encodeURIComponent(p.name)}&days=90`} />
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-line-soft pb-3">
              <div>
                <CardTitle>Заметки</CardTitle>
                <CardDescription>История общения и решений по игроку</CardDescription>
              </div>
            </CardHeader>
            <PlayerNotes
              me={TEAM.find((m) => m.role === "owner")?.name ?? "Владелец"}
              initial={buildNotes(p, first ? { at: first.createdAt, item: first.items[0]?.name ?? "товар", amount: first.amount } : undefined, chargebacks[0]?.id)}
            />
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Активные привилегии</CardTitle>
                <CardDescription>{ranks.length ? pluralize(ranks.length, ["привилегия", "привилегии", "привилегий"]) : "Нет активных"}</CardDescription>
              </div>
              <Crown className="size-4 text-fg-4" />
            </CardHeader>
            <CardContent className="space-y-4">
              {ranks.length ? (
                ranks.map((r) => {
                  const soon = r.left !== null && r.left <= 3;
                  return (
                    <div key={r.name}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="font-medium text-fg">{r.name}</span>
                        {r.left === null ? (
                          <span className="inline-flex items-center gap-1 text-[12px] text-fg-3">
                            <InfinityIcon className="size-3.5" /> навсегда
                          </span>
                        ) : (
                          <Tooltip content={r.expiresAt ? `до ${formatExact(r.expiresAt)}` : ""}>
                            <span className={cn("text-[12px] nums", soon ? "text-warn" : "text-fg-3")}>
                              осталось {pluralize(r.left, ["день", "дня", "дней"])}
                            </span>
                          </Tooltip>
                        )}
                      </div>
                      <Progress value={r.left === null ? 100 : r.left} max={r.left === null ? 100 : (r.duration ?? 30)} tone={r.left === null ? "ice" : soon ? "warn" : "azure"} size="sm" />
                    </div>
                  );
                })
              ) : (
                <p className="text-[13px] text-fg-3">Игрок без привилегий. Самая популярная у похожих игроков — Frost за 299 ₽.</p>
              )}
              {expiring && ranks.some((r) => r.left !== null) ? (
                <p className="flex items-start gap-2 border-t border-line-soft pt-3 text-[12px] leading-relaxed text-fg-3">
                  <Clock3 className="mt-0.5 size-3.5 shrink-0 text-ice-300" />
                  <span>
                    За 3 дня до конца сработает кампания «{expiring.name}» — {expiring.channels.map((c) => (/^[А-ЯЁ]/.test(channelMeta[c].label) ? channelMeta[c].label.toLowerCase() : channelMeta[c].label)).join(" и ")}
                    {expiring.offer ? `, скидка ${expiring.offer.discountPct} %` : ""}.
                  </span>
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Риск</CardTitle>
                <CardDescription>Пересчитывается при каждом платеже</CardDescription>
              </div>
              <div className="text-right">
                <p className="font-mono leading-none nums">
                  <span className={cn("text-[22px] font-semibold", toneText[tone])}>{p.risk}</span>
                  <span className="text-[12px] text-fg-4">/100</span>
                </p>
                <p className="mt-1 text-[11px] text-fg-3">{riskLabel[tone]} риск</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4 h-1.5 rounded-full bg-[linear-gradient(90deg,var(--color-ok)_0%,var(--color-ok)_30%,var(--color-warn)_30%,var(--color-warn)_60%,var(--color-bad)_60%)] opacity-30" aria-hidden />
              <div className="relative -mt-[22px] mb-4 h-1.5" aria-hidden>
                <span className={cn("absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface", toneBg[tone])} style={{ left: `${Math.min(98, Math.max(2, p.risk))}%` }} />
              </div>
              <ul className="space-y-2.5">
                {factors.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-xs",
                        f.sign === "+" ? (f.tone === "bad" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn") : "bg-ok-soft text-ok",
                      )}
                      aria-label={f.sign === "+" ? "повышает риск" : "снижает риск"}
                    >
                      {f.sign === "+" ? <Plus className="size-3" strokeWidth={3} /> : <Minus className="size-3" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline justify-between gap-2 text-[13px] text-fg">
                        {f.label}
                        {f.weight ? <span className={cn("font-mono text-[11px] nums", toneText[f.tone])}>+{f.weight}</span> : null}
                      </p>
                      <p className="text-[12px] text-fg-3">{f.hint}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-line-soft pt-3 text-[11.5px] leading-relaxed text-fg-4">
                От 60 — платёж проходит только с 3-D Secure, от 80 — отклоняется. Сигналы общие для всех проектов PayMC.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-line-soft pb-3">
              <div>
                <CardTitle>Привязанные аккаунты</CardTitle>
                <CardDescription>
                  {linked} из 2 · {plural(linked, ["канал", "канала", "каналов"])} связи
                </CardDescription>
              </div>
            </CardHeader>
            <LinkedAccounts name={p.name} telegram={p.telegram} vk={vk} discord={p.discord} />
          </Card>
        </div>
      </div>
    </PlayerProvider>
  );
}
