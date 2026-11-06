import type { Product, ProductKind } from "@/lib/mock/types";
import { pluralize } from "@/lib/format";

export type ProductBadge = NonNullable<Product["badge"]>;
export type ProductStatus = Product["status"];

/** Storefront badges. Semantic colors stay reserved for statuses, so badges use brand tones only. */
export const BADGE_META: Record<ProductBadge, { label: string; tone: "azure" | "ice" | "white" | "outline" }> = {
  hit: { label: "Хит", tone: "azure" },
  new: { label: "Новинка", tone: "ice" },
  sale: { label: "Скидка", tone: "white" },
  limited: { label: "Лимит", tone: "outline" },
};

export const STATUS_META: Record<ProductStatus, { label: string; short: string; tone: "ok" | "neutral" | "outline" }> = {
  active: { label: "Активен", short: "Активные", tone: "ok" },
  draft: { label: "Черновик", short: "Черновики", tone: "neutral" },
  hidden: { label: "Скрыт", short: "Скрытые", tone: "outline" },
};

export const KIND_ORDER: ProductKind[] = ["rank", "subscription", "case", "currency", "kit", "unban", "cosmetic", "pool"];

/** "30 дней" · "навсегда" · "" for one-off goods (currency, keys) */
export function durationLabel(days: number | null | undefined) {
  if (days === null) return "навсегда";
  if (days === undefined) return "";
  return pluralize(days, ["день", "дня", "дней"]);
}

/** Up to 3 chars for the generated art tile: "Frost" → "F", "Кейс «Ледяной»" → "КЛ" */
export function glyphFromName(name: string) {
  const words = name
    .replace(/[«»"']/g, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  if (!words.length) return "?";
  const num = name.match(/\d[\d\s]*/)?.[0].replace(/\s/g, "");
  if (num) {
    const n = Number(num);
    if (n >= 1000) return `${Math.round(n / 100) / 10}K`.replace(".0K", "K");
    return num.slice(0, 3);
  }
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Conversion = sales / views. Returns a percentage or null when there were no views. */
export function conversionOf(p: Pick<Product, "sales30d" | "views30d">) {
  if (!p.views30d) return null;
  return (p.sales30d / p.views30d) * 100;
}
