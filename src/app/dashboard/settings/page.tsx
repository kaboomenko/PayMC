import type { Metadata } from "next";
import { GAME_LIST } from "@/lib/games";
import { unknownVariables } from "@/lib/command-library";
import { CURRENT_PROJECT_ID, DAY, HOUR, MINUTE, NOW_MS, PRODUCTS, PROJECTS, TEAM, getPlayers } from "@/lib/mock";
import { SettingsView } from "@/components/dashboard/system/settings-view";
import { SETTINGS_TABS, type AuditEntry, type ImportData, type SettingsData, type SettingsTab } from "@/components/dashboard/system/settings-types";

export const metadata: Metadata = { title: "Настройки" };

const at = (msAgo: number) => new Date(NOW_MS - msAgo).toISOString();

function buildImport(): ImportData {
  const commands = [
    { product: "VIP [30 дней]", original: "lp user {user} parent addtemp vip 30d", converted: "lp user {player} parent addtemp vip {days}d" },
    { product: "Кейс донатный ×5", original: "excellentcrates key give {user} donate {count}", converted: "excellentcrates key give {player} donate {amount}" },
    { product: "Разбан", original: "unban {user}", converted: "litebans:unban {player} --sender=PayMC" },
    { product: "500 рублей на сервер", original: "eco give {user} {sum}", converted: "eco give {player} {sum}" },
    { product: "Префикс на выбор", original: 'lp user {user} meta setprefix 100 "&b[{prefix}]&r "', converted: 'lp user {player} meta setprefix 100 "&b[{prefix}]&r "' },
  ].map((c) => ({ ...c, unknown: unknownVariables(c.converted, "minecraft") }));

  const buyers = getPlayers({ sort: "ltv" })
    .filter((p) => p.activeRanks.length > 0)
    .slice(0, 5)
    .map((p) => {
      const r = p.activeRanks[0];
      return { name: p.name, rank: r.name, daysLeft: r.expiresAt ? Math.max(1, Math.round((new Date(r.expiresAt).getTime() - NOW_MS) / DAY)) : null };
    });

  return {
    products: [
      { theirs: "VIP [30 дней]", theirPrice: 149, match: "p-snow" },
      { theirs: "Premium [30 дней]", theirPrice: 299, match: "p-frost" },
      { theirs: "Deluxe [30 дней]", theirPrice: 549, match: "p-blizzard" },
      { theirs: "Legend [навсегда]", theirPrice: 1790, match: "p-arctic" },
      { theirs: "Кейс донатный ×5", theirPrice: 279, match: "new" },
      { theirs: "Разбан", theirPrice: 299, match: "p-unban" },
      { theirs: "500 рублей на сервер", theirPrice: 99, match: "new" },
    ],
    paymcProducts: PRODUCTS.filter((p) => p.status === "active").map((p) => ({ id: p.id, name: p.name, price: p.price })),
    commands,
    promos: [
      { code: "VK10", discount: "−10 %", uses: 411, status: "ok" },
      { code: "START50", discount: "−50 ₽", uses: 96, status: "ok" },
      { code: "FRIEND15", discount: "−15 %", uses: 38, status: "ok" },
      { code: "SUMMER20", discount: "−20 %", uses: 143, status: "expired" },
    ],
    buyers,
    totals: { products: 18, commands: 31, promos: 7, buyers: 1126, activeRanks: 214 },
  };
}

function buildAudit(): AuditEntry[] {
  return [
    { id: "au1", actor: "Никита Лебедев", action: "изменил команду выдачи", target: "Frost", diff: { before: "points give {player} 250", after: "points give {player} 300" }, at: at(2 * HOUR + 14 * MINUTE), ip: "95.165.•.• · Москва", area: "catalog" },
    { id: "au2", actor: "Ольга Смирнова", action: "поставила на паузу промокод", target: "BLACKFRIDAY", at: at(5 * HOUR + 40 * MINUTE), ip: "178.176.•.• · Санкт-Петербург", area: "catalog" },
    { id: "au3", actor: "Артём Ковалёв", action: "пригласил в команду", target: "Денис Орлов · модератор", at: at(27 * HOUR), ip: "95.165.•.• · Москва", area: "access" },
    { id: "au4", actor: "Никита Лебедев", action: "обновил плагин PayMC на сервере", target: "Выживание", diff: { before: "agent 2.4.0", after: "agent 2.4.1" }, at: at(2 * DAY + 3 * HOUR), ip: "95.165.•.• · Москва", area: "servers" },
    { id: "au5", actor: "Марина Ефимова", action: "скачала отчёт агента", target: "октябрь 2026 · PDF", at: at(3 * DAY + 2 * HOUR), ip: "91.79.•.• · Казань", area: "finance" },
    { id: "au7", actor: "Ольга Смирнова", action: "изменила цену товара", target: "Набор ключей ×10", diff: { before: "590 ₽", after: "490 ₽ (старая цена зачёркнута)" }, at: at(11 * DAY + 1 * HOUR), ip: "178.176.•.• · Санкт-Петербург", area: "catalog" },
    { id: "au8", actor: "Артём Ковалёв", action: "включил «Общий чёрный список PayMC»", at: at(34 * DAY), ip: "95.165.•.• · Москва", area: "access" },
    // older than the 31-day payout history, which is split 60/25/15 throughout
    { id: "au6", actor: "Артём Ковалёв", action: "изменил распределение выплат", diff: { before: "Артём 65 % · Никита 25 % · Ольга 10 %", after: "Артём 60 % · Никита 25 % · Ольга 15 %" }, at: at(40 * DAY + 5 * HOUR), ip: "95.165.•.• · Москва", area: "finance" },
  ];
}

function buildSettingsData(): SettingsData {
  const project = PROJECTS.find((p) => p.id === CURRENT_PROJECT_ID)!;
  const flagged = getPlayers({ flagged: true, sort: "risk" });
  const name = (i: number) => flagged[i % Math.max(1, flagged.length)]?.name ?? "player";
  return {
    project: {
      name: project.name,
      slug: project.slug,
      domain: project.domain,
      game: project.game,
      createdAt: project.createdAt,
      games: GAME_LIST.map((g) => ({ id: g.id, name: g.name })),
    },
    team: TEAM.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      splitPct: m.splitPct,
      lastActiveAt: m.lastActiveAt,
      twoFactor: m.role === "owner" || m.role === "developer" || m.role === "admin",
    })),
    audit: buildAudit(),
    blocked: [
      { id: "b1", player: name(0), amount: 990, reason: "Карта в общем чёрном списке PayMC", at: at(2 * HOUR + 12 * MINUTE) },
      { id: "b2", player: name(1), amount: 1790, reason: "5-я карта за 7 дней", at: at(1 * DAY + 4 * HOUR) },
      { id: "b3", player: name(2), amount: 549, reason: "3 неудачные оплаты за 10 минут", at: at(3 * DAY + 7 * HOUR) },
      { id: "b4", player: name(3), amount: 1190, reason: "Родитель не подтвердил покупку дороже 1 000 ₽", at: at(4 * DAY + 2 * HOUR) },
    ],
    importData: buildImport(),
    now: NOW_MS,
  };
}

export default async function SettingsPage({ searchParams }: PageProps<"/dashboard/settings">) {
  const sp = await searchParams;
  const raw = typeof sp.tab === "string" ? sp.tab : "project";
  const tab: SettingsTab = (SETTINGS_TABS as readonly string[]).includes(raw) ? (raw as SettingsTab) : "project";
  return <SettingsView data={buildSettingsData()} initialTab={tab} />;
}
