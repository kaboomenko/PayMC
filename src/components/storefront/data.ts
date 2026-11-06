import "server-only";
import { NOW_MS, ONLINE_NOW, PRODUCTS, PROJECTS, PROMO_CODES, SERVERS, getRecentOrders, isPaid } from "@/lib/mock";
import type { StoreData, StoreProduct } from "./types";

export const STORE_SLUGS = PROJECTS.map((p) => p.slug);

function minContribution(perks: string[] | undefined) {
  const m = perks?.join(" ").match(/Взнос от (\d+)/);
  return m ? Number(m[1]) : 50;
}

/** Days left in the current MSK month (goal deadline). */
function daysLeftInMonth(now: number) {
  const msk = new Date(now + 3 * 60 * 60 * 1000);
  const last = new Date(Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth() + 1, 0)).getUTCDate();
  return last - msk.getUTCDate();
}

/**
 * Builds the public storefront slice for a project slug. Only the demo
 * project has a catalog; the other projects render an honest empty store.
 */
export function getStoreData(slug: string): StoreData | null {
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) return null;
  const servers = SERVERS.filter((s) => s.projectId === project.id);
  const isDemo = project.id === "arctic";

  const recentOrders = isDemo ? getRecentOrders(80).filter(isPaid) : [];
  const recent = recentOrders.slice(0, 14).map((o) => {
    const item = o.items[0];
    return {
      id: o.id,
      player: o.giftTo ?? o.playerName,
      product: item.qty > 1 ? `${item.name} ×${item.qty}` : item.name,
      at: o.createdAt,
      gift: Boolean(o.giftTo),
    };
  });
  const contributorPool = [...new Set(recentOrders.map((o) => o.playerName))];

  const products: StoreProduct[] = isDemo
    ? PRODUCTS.filter((p) => p.status === "active")
        .sort((a, b) => a.sort - b.sort)
        .map((p, i) => ({
          id: p.id,
          name: p.name,
          kind: p.kind,
          category: p.category,
          description: p.description,
          perks: p.kind === "pool" ? [] : (p.perks ?? []),
          price: p.price,
          oldPrice: p.oldPrice,
          durationDays: p.durationDays,
          badge: p.badge,
          tint: p.tint,
          glyph: p.glyph,
          pool: p.pool
            ? {
                ...p.pool,
                minContribution: minContribution(p.perks),
                names: contributorPool.slice(i * 3, i * 3 + Math.min(5, p.pool.contributors)),
              }
            : undefined,
        }))
    : [];

  const online = isDemo ? ONLINE_NOW : servers.reduce((a, s) => a + s.online, 0);
  const address = isDemo ? "play.arcticmc.ru" : (servers[0]?.address ?? `${project.slug}.paymc.ru`);

  return {
    slug: project.slug,
    name: project.name,
    game: project.game,
    online,
    address,
    host: project.domain ?? `${project.slug}.paymc.ru`,
    goal: project.goal ? { ...project.goal, daysLeft: daysLeftInMonth(NOW_MS) } : undefined,
    recent,
    products,
    promos: isDemo
      ? PROMO_CODES.filter((p) => p.status === "active").map((p) => ({ code: p.code, kind: p.kind, value: p.value, minAmount: p.minAmount }))
      : [],
    servers: servers.map((s) => ({ name: s.name, online: s.online, status: s.status })),
    avgDeliveryMs: 400,
    now: NOW_MS,
  };
}

