import "server-only";
import { NOW_MS, ONLINE_NOW, PRODUCTS, PROJECTS, PROMO_CODES, SERVERS, getRecentOrders, isPaid } from "@/lib/mock";
import { typo } from "@/lib/format";
import type { StoreData, StoreProduct, StorePromo } from "./types";

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
 * Owner-written copy comes with plain spaces: "1 000 снежинок", "за 15 минут".
 * Glue thousands groups and units so numbers never break across lines.
 */
function glue(text: string) {
  return typo(
    text
      .replace(/(\d) (?=\d{3}(?!\d))/g, "$1 ")
      .replace(/(\d) (?=(?:минут|секунд|дн|час))/g, "$1 ")
      .replace(/ ×(?=\d)/g, " ×"),
  );
}

/** "на кейсы" — how a product-limited promo code is described to players */
const SCOPE_WORDS: Record<string, string> = {
  Привилегии: "на привилегии",
  Подписка: "на подписку",
  Кейсы: "на кейсы",
  Валюта: "на валюту",
  Наборы: "на наборы",
  Разбан: "на разбан и размут",
  Косметика: "на косметику",
  Складчина: "на складчины",
};

function scopeLabel(scope: StorePromo["scope"]) {
  if (scope === "all") return undefined;
  const items = scope.map((id) => PRODUCTS.find((p) => p.id === id)).filter((p) => p !== undefined);
  const cats = [...new Set(items.map((p) => p.category))];
  if (cats.length === 1 && SCOPE_WORDS[cats[0]]) return SCOPE_WORDS[cats[0]];
  return `на ${items.map((p) => `«${p.name}»`).join(", ")}`;
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

  const recentOrders = isDemo ? getRecentOrders(120).filter(isPaid) : [];
  // The storefront filters these down to products in visible blocks, so take extra.
  const recent = recentOrders.slice(0, 40).map((o) => {
    const item = o.items[0];
    const name = glue(item.name);
    return {
      id: o.id,
      productId: item.productId,
      player: o.giftTo ?? o.playerName,
      product: item.qty > 1 ? `${name} ×${item.qty}` : name,
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
          name: glue(p.name),
          kind: p.kind,
          category: p.category,
          // the odds are shown right on the case card (see ./case-odds.ts)
          description: glue(p.description.replace("на странице кейса", "в карточке кейса")),
          perks: p.kind === "pool" ? [] : (p.perks ?? []).map(glue),
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
      ? PROMO_CODES.filter((p) => p.status === "active").map((p) => ({
          code: p.code,
          kind: p.kind,
          value: p.value,
          minAmount: p.minAmount,
          scope: p.scope,
          scopeLabel: scopeLabel(p.scope),
          firstPurchaseOnly: p.firstPurchaseOnly,
        }))
      : [],
    // only nicks from the recent feed — enough for the demo check, no player list in the browser
    knownBuyers: contributorPool.map((n) => n.toLowerCase()),
    servers: servers.map((s) => ({ name: s.name, online: s.online, status: s.status })),
    avgDeliveryMs: 400,
    now: NOW_MS,
  };
}
