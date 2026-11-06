/**
 * In-game campaign scenarios for the Growth demo. Client-safe (no mock imports):
 * campaign numbers are passed in from the server section.
 * Timings are in ms from the start of the scene.
 */

export type ChatTone = "prefix" | "name" | "text" | "link" | "accent" | "ok" | "join" | "muted";
export type Seg = readonly [string, ChatTone?];

export interface ChatLine {
  at: number;
  segs: Seg[];
}

export type ScenarioId = "cart" | "expiring" | "winback" | "first";

export interface GrowthScenario {
  id: ScenarioId;
  tab: string;
  /** cursor shown before the scene plays (SSR frame) */
  poster: number;
  /** moment the player pays */
  purchaseAt: number;
  end: number;
  bossbar?: { at: number; text: string; value: number; done: { text: string; value: number } };
  title?: { at: number; title: string; sub: Seg[]; done: { title: string; sub: Seg[] } };
  push?: { at: number; until: number; from: string; text: string };
  board: { rows: [string, string][]; done: [string, string][] };
  chat: ChatLine[];
  conversion: { player: string; amount: number; product: string };
}

const P = "[ArcticMC]";

export const GROWTH_SCENARIOS: GrowthScenario[] = [
  {
    id: "cart",
    tab: "Брошенная корзина",
    poster: 1000,
    purchaseAt: 3400,
    end: 3700,
    title: {
      at: 700,
      title: "Frost ещё в корзине",
      sub: [["−10 % только сегодня · ", "text"], ["/donate", "link"]],
      done: { title: "Спасибо!", sub: [["Frost активна до 6 декабря", "ok"]] },
    },
    board: {
      rows: [
        ["Режим", "Выживание"],
        ["Привилегия", "нет"],
        ["Снежинки", "1 240"],
      ],
      done: [
        ["Режим", "Выживание"],
        ["Привилегия", "Frost · 30 дн"],
        ["Снежинки", "1 540"],
      ],
    },
    chat: [
      { at: 0, segs: [["<d1ma>", "name"], [" кто на шахту? беру кирку", "text"]] },
      { at: 0, segs: [["<Steve_Pro>", "name"], [" продам алмазы, 5 шт", "text"]] },
      { at: 1000, segs: [[P, "prefix"], [" kotik228, Frost всё ещё в корзине. Сегодня −10 %: ", "text"], ["/donate", "link"]] },
      { at: 3400, segs: [[P, "prefix"], [" kotik228 поддержал сервер и получил Frost — спасибо!", "text"]] },
      { at: 3700, segs: [["→ ", "muted"], ["Frost активна до 6 декабря. Скидка 10 % применена.", "accent"]] },
    ],
    conversion: { player: "kotik228", amount: 269, product: "Frost" },
  },
  {
    id: "expiring",
    tab: "Истекает привилегия",
    poster: 1600,
    purchaseAt: 3300,
    end: 3600,
    bossbar: {
      at: 600,
      text: "Frost закончится через 3 дня — продли со скидкой 15 %",
      value: 0.1,
      done: { text: "Frost продлена до 9 декабря", value: 1 },
    },
    push: {
      at: 1500,
      until: 3200,
      from: "Telegram · @arcticmc_paybot",
      text: "Frost закончится через 3 дня. Продлить со скидкой 15 % — 254 ₽",
    },
    board: {
      rows: [
        ["Режим", "Выживание"],
        ["Привилегия", "Frost · 3 дн"],
        ["Снежинки", "860"],
      ],
      done: [
        ["Режим", "Выживание"],
        ["Привилегия", "Frost · 33 дн"],
        ["Снежинки", "1 160"],
      ],
    },
    chat: [
      { at: 0, segs: [["<Lera_Snow>", "name"], [" кто со мной в энд?", "text"]] },
      { at: 0, segs: [["<d1ma>", "name"], [" го, только броню починю", "text"]] },
      { at: 1100, segs: [[P, "prefix"], [" Frost закончится через 3 дня. Продли со скидкой 15 %: ", "text"], ["/donate frost", "link"]] },
      { at: 3300, segs: [[P, "prefix"], [" kotik228 продлил Frost — спасибо, что остаёшься!", "text"]] },
      { at: 3600, segs: [["→ ", "muted"], ["Frost продлена до 9 декабря. Скидка 15 % применена.", "accent"]] },
    ],
    conversion: { player: "kotik228", amount: 254, product: "Frost · продление" },
  },
  {
    id: "winback",
    tab: "Возврат через 14 дней",
    poster: 1500,
    purchaseAt: 4000,
    end: 4300,
    push: {
      at: 300,
      until: 1900,
      from: "Telegram · @arcticmc_paybot",
      text: "На Выживании новый сезон. Возвращайся — Snow на 7 дней в подарок при входе",
    },
    title: {
      at: 2000,
      title: "С возвращением!",
      sub: [["Snow на 7 дней — уже твой", "text"]],
      done: { title: "Спасибо!", sub: [["Frost активна до 6 декабря", "ok"]] },
    },
    board: {
      rows: [
        ["Сезон", "Зима · день 1"],
        ["Привилегия", "Snow · 7 дн"],
        ["Снежинки", "0"],
      ],
      done: [
        ["Сезон", "Зима · день 1"],
        ["Привилегия", "Frost · 30 дн"],
        ["Снежинки", "300"],
      ],
    },
    chat: [
      { at: 0, segs: [["<Steve_Pro>", "name"], [" на спавне новый сезон, карту сбросили", "text"]] },
      { at: 0, segs: [["<Lera_Snow>", "name"], [" наконец-то", "text"]] },
      { at: 1700, segs: [["kotik228 зашёл на сервер", "join"]] },
      { at: 2300, segs: [[P, "prefix"], [" kotik228, Snow на 7 дней активирован. Новый сезон: ", "text"], ["/warp season", "link"]] },
      { at: 4000, segs: [[P, "prefix"], [" kotik228 поддержал сервер и получил Frost — спасибо!", "text"]] },
      { at: 4300, segs: [["→ ", "muted"], ["Frost активна до 6 декабря.", "accent"]] },
    ],
    conversion: { player: "kotik228", amount: 299, product: "Frost" },
  },
  {
    id: "first",
    tab: "Первая покупка",
    poster: 800,
    purchaseAt: 3000,
    end: 3300,
    board: {
      rows: [
        ["Режим", "Выживание"],
        ["Наиграно", "2 ч 04 мин"],
        ["Привилегия", "нет"],
      ],
      done: [
        ["Режим", "Выживание"],
        ["Наиграно", "2 ч 05 мин"],
        ["Набор", "Старт · получен"],
      ],
    },
    chat: [
      { at: 0, segs: [["<Steve_Pro>", "name"], [" новенький, держи кирку", "text"]] },
      { at: 0, segs: [["<vasyok_mc>", "name"], [" спасибо!!", "text"]] },
      {
        at: 800,
        segs: [[P, "prefix"], [" vasyok_mc, уже 2 часа с нами! Набор «Старт» за 59 ₽ вместо 79 ₽ — только сегодня: ", "text"], ["/donate start", "link"]],
      },
      { at: 3000, segs: [[P, "prefix"], [" vasyok_mc купил первый набор — добро пожаловать!", "text"]] },
      { at: 3300, segs: [["→ ", "muted"], ["Набор «Старт» уже в инвентаре. Скидка 25 % применена.", "accent"]] },
    ],
    conversion: { player: "vasyok_mc", amount: 59, product: "Набор «Старт»" },
  },
];

export const SCENARIO_CAMPAIGN: Record<ScenarioId, string> = {
  cart: "cmp-cart",
  expiring: "cmp-expiring",
  winback: "cmp-winback",
  first: "cmp-first",
};

/** Serializable campaign summary passed from the server section. */
export interface CampaignSummary {
  name: string;
  trigger: string;
  channels: string[];
  offer: string | null;
  reached: number;
  clicked: number;
  converted: number;
  revenue: number;
}
