import "server-only";
import { GAMES } from "@/lib/games";
import { PLAN_META } from "@/lib/payments";
import { formatMoney, pluralize } from "@/lib/format";
import {
  ACTIVITY,
  CURRENT_PROJECT_ID,
  NOW_MS,
  ORDERS,
  PLAYERS,
  PRODUCTS,
  PROJECTS,
  TEAM,
  getIssues,
  HOUR,
} from "@/lib/mock";
import type { ShellData } from "./shell-types";

/** Builds the small, serializable payload the client shell needs. */
export function buildShellData(): ShellData {
  const issues = getIssues();
  const owner = TEAM.find((m) => m.role === "owner")!;
  const current = PROJECTS.find((p) => p.id === CURRENT_PROJECT_ID)!;
  const recentOrders = ORDERS.slice(-40).reverse();
  const topPlayers = [...PLAYERS].sort((a, b) => b.ltv - a.ltv).slice(0, 60);

  return {
    projects: PROJECTS.map((p) => ({
      id: p.id,
      name: p.name,
      game: p.game,
      gameName: GAMES[p.game].name,
      plan: p.plan,
      planLabel: `${PLAN_META[p.plan].label} · ${PLAN_META[p.plan].rate}`,
      storefrontUrl: `/s/${p.slug}`,
    })),
    currentProjectId: current.id,
    issues: issues.count,
    offlineServers: issues.servers.filter((s) => s.status === "offline").length,
    notifications: ACTIVITY.slice(0, 12),
    goal: current.goal,
    salesLastHour: ORDERS.filter((o) => NOW_MS - new Date(o.createdAt).getTime() < HOUR).length,
    user: { name: owner.name, email: owner.email },
    search: [
      ...recentOrders.map((o) => ({
        id: o.id,
        label: o.id,
        sub: `${o.playerName} · ${o.items.map((i) => i.name).join(", ")}`,
        href: `/dashboard/orders?id=${o.id}`,
        kind: "order" as const,
      })),
      ...topPlayers.map((p) => ({
        id: p.id,
        label: p.name,
        sub: `LTV ${formatMoney(p.ltv)} · ${pluralize(p.orders, ["заказ", "заказа", "заказов"])}`,
        href: `/dashboard/players/${p.id}`,
        kind: "player" as const,
      })),
      ...PRODUCTS.map((p) => ({
        id: p.id,
        label: p.name,
        sub: `${p.category} · ${formatMoney(p.price)}`,
        href: `/dashboard/products/${p.id}`,
        kind: "product" as const,
      })),
    ],
  };
}
