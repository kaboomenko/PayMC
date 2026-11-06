import type { CSSProperties } from "react";
import type { StoreAccent, StoreBlock, StoreBlockId, StoreTheme } from "./types";

export const DEFAULT_THEME: StoreTheme = {
  accent: "azure",
  background: "grid",
  density: "comfortable",
  corners: "soft",
};

export const ACCENTS: Record<
  StoreAccent,
  { label: string; hint: string; accent: string; hover: string; text: string; soft: string; ring: string; on: string }
> = {
  azure: {
    label: "Arctic azure",
    hint: "Фирменный синий, высокий контраст кнопок",
    accent: "#3377ff",
    hover: "#5c98ff",
    text: "#8cb9ff",
    soft: "rgb(51 119 255 / 0.12)",
    ring: "rgb(51 119 255 / 0.38)",
    on: "#ffffff",
  },
  ice: {
    label: "Ice",
    hint: "Светло-голубой, холоднее и мягче",
    accent: "#55cfff",
    hover: "#86e0ff",
    text: "#86e0ff",
    soft: "rgb(85 207 255 / 0.11)",
    ring: "rgb(85 207 255 / 0.36)",
    on: "#05070b",
  },
  mono: {
    label: "Mono white",
    hint: "Белые кнопки, минимум цвета",
    accent: "#edf1f8",
    hover: "#ffffff",
    text: "#edf1f8",
    soft: "rgb(255 255 255 / 0.07)",
    ring: "rgb(255 255 255 / 0.3)",
    on: "#05070b",
  },
};

/** CSS variables consumed by storefront components via `bg-(--st-accent)` etc. */
export function themeVars(theme: StoreTheme): CSSProperties {
  const a = ACCENTS[theme.accent];
  return {
    "--st-accent": a.accent,
    "--st-accent-hover": a.hover,
    "--st-accent-text": a.text,
    "--st-accent-soft": a.soft,
    "--st-accent-ring": a.ring,
    "--st-on-accent": a.on,
    "--st-r-card": theme.corners === "soft" ? "14px" : "4px",
    "--st-r-ctl": theme.corners === "soft" ? "8px" : "3px",
    "--st-r-art": theme.corners === "soft" ? "10px" : "2px",
  } as CSSProperties;
}

export const BLOCK_META: Record<StoreBlockId, { label: string; description: string; categories?: string[] }> = {
  goal: { label: "Цель месяца", description: "Прогресс сбора на хостинг или ивент" },
  recent: { label: "Только что купили", description: "Лента последних покупок" },
  pools: { label: "Складчины", description: "Игроки скидываются на общий бонус", categories: ["Складчина"] },
  ranks: { label: "Привилегии", description: "Ранги и подписка", categories: ["Привилегии", "Подписка"] },
  cases: { label: "Кейсы", description: "Ключи и наборы ключей", categories: ["Кейсы"] },
  currency: { label: "Валюта", description: "Снежинки для /shop", categories: ["Валюта"] },
  kits: { label: "Наборы", description: "Предметы на старт", categories: ["Наборы"] },
  unban: { label: "Разбан", description: "Разбан и размут", categories: ["Разбан"] },
  cosmetics: { label: "Косметика", description: "Питомцы, частицы, плащи", categories: ["Косметика"] },
  rules: { label: "Правила", description: "Что важно знать до оплаты" },
  faq: { label: "FAQ", description: "Ответы на частые вопросы" },
};

export const DEFAULT_BLOCKS: StoreBlock[] = [
  { id: "goal", visible: true },
  { id: "recent", visible: true },
  { id: "pools", visible: true },
  { id: "ranks", visible: true },
  { id: "cases", visible: true },
  { id: "currency", visible: true },
  { id: "cosmetics", visible: true },
  { id: "kits", visible: false },
  { id: "unban", visible: true },
  { id: "rules", visible: true },
  { id: "faq", visible: true },
];

/** Catalog block ids — rendered as category tabs, in block order. */
export const CATALOG_BLOCKS: StoreBlockId[] = ["ranks", "cases", "currency", "kits", "unban", "cosmetics"];

/** Art tile gradients by product tint (0..5) — all within the brand palette. */
export const ART_TINTS = [
  "from-azure-500 via-azure-700 to-azure-950",
  "from-ice-500 via-azure-700 to-azure-950",
  "from-azure-400 via-azure-800 to-[#070b18]",
  "from-ice-600 via-azure-900 to-[#060912]",
  "from-azure-100 via-azure-400 to-azure-800",
  "from-ice-300 via-ice-600 to-ice-900",
];
