import { plural } from "@/lib/format";
import type { Campaign, CampaignChannel, CampaignType, PlayerSegment } from "@/lib/mock/types";

export type SegmentKey = PlayerSegment | "all";

export interface CampaignDraft {
  id?: string;
  type: CampaignType;
  name: string;
  delay: string;
  segment: SegmentKey;
  servers: string[];
  freqDays: number;
  quietHours: boolean;
  channels: CampaignChannel[];
  message: string;
  title: string;
  subtitle: string;
  discountPct: number;
  /** "cart" — what the player left in the cart, "rank" — their current rank, or a product id */
  productId: string;
  ttlHours: number;
}

export interface CampaignTemplate {
  /** label of the trigger parameter in step 2 */
  delayLabel: string;
  delays: string[];
  delay: string;
  sentence: (delay: string) => string;
  segment: SegmentKey;
  channels: CampaignChannel[];
  message: string;
  title: string;
  subtitle: string;
  discountPct: number;
  productId: string;
  ttlHours: number;
  /** typical conversion to purchase, % — null when the campaign has no offer */
  conversion: number | null;
  conversionSource: "own" | "network";
  /** rough share of the segment reached in 30 days, for the estimate on the preview step */
  reach30: number;
}

export const TEMPLATES: Record<CampaignType, CampaignTemplate> = {
  abandoned_cart: {
    delayLabel: "Ждать после брошенной оплаты",
    delays: ["15 минут", "30 минут", "1 часа", "3 часов"],
    delay: "30 минут",
    sentence: (d) => `Игрок открыл оплату и не завершил её в течение ${d}`,
    segment: "all",
    channels: ["chat", "title"],
    message: "{player}, {product} всё ещё ждёт тебя в корзине. Сегодня −{discount}: {link}",
    title: "{product} −{discount}",
    subtitle: "Корзина сохранена — только сегодня",
    discountPct: 10,
    productId: "cart",
    ttlHours: 24,
    conversion: 18,
    conversionSource: "own",
    reach30: 0.9,
  },
  rank_expiring: {
    delayLabel: "До конца привилегии",
    delays: ["1 день", "3 дня", "7 дней"],
    delay: "3 дня",
    sentence: (d) => `До окончания привилегии осталось ${d}`,
    segment: "all",
    channels: ["bossbar", "telegram"],
    message: "Привилегия {product} закончится через 3 дня. Продли сейчас со скидкой {discount}: {link}",
    title: "{product} заканчивается",
    subtitle: "Продление −{discount} до конца недели",
    discountPct: 15,
    productId: "rank",
    ttlHours: 72,
    conversion: 23,
    conversionSource: "own",
    reach30: 0.55,
  },
  winback: {
    delayLabel: "Не заходил",
    delays: ["7 дней", "14 дней", "30 дней"],
    delay: "14 дней",
    sentence: (d) => `Покупал раньше и не заходил ${d}`,
    segment: "at_risk",
    channels: ["telegram", "vk"],
    message: "{player}, на Выживании новый сезон. Возвращайся — {product} на 7 дней в подарок при входе: {link}",
    title: "С возвращением, {player}",
    subtitle: "{product} на 7 дней уже ждёт",
    discountPct: 0,
    productId: "p-snow",
    ttlHours: 168,
    conversion: 8.5,
    conversionSource: "own",
    reach30: 0.8,
  },
  first_purchase: {
    delayLabel: "Наиграл за первые 3 дня",
    delays: ["1 час", "2 часа", "5 часов"],
    delay: "2 часа",
    sentence: (d) => `Новичок наиграл ${d} за первые 3 дня`,
    segment: "new",
    channels: ["chat"],
    message: "Нравится сервер? {product} со скидкой {discount} — только сегодня: {link}",
    title: "Добро пожаловать",
    subtitle: "{product} −{discount} для новичков",
    discountPct: 25,
    productId: "p-kit-start",
    ttlHours: 24,
    conversion: 8.1,
    conversionSource: "own",
    reach30: 0.7,
  },
  wipe_day: {
    delayLabel: "Окно после вайпа",
    delays: ["3 часа", "6 часов", "12 часов", "24 часа"],
    delay: "6 часов",
    sentence: (d) => `Вайп сервера — оффер действует первые ${d}`,
    segment: "all",
    channels: ["title", "chat", "telegram"],
    message: "Новый сезон! Все привилегии −{discount} первые 6 часов: {link}",
    title: "Новый сезон",
    subtitle: "Привилегии −{discount} первые 6 часов",
    discountPct: 20,
    productId: "cart",
    ttlHours: 6,
    // only players online in the first hours see it: ≈ 2 300 shows → ≈ 160 purchases on a 7 700-player base,
    // in line with the calendar's +210 % for a wipe day
    conversion: 7,
    conversionSource: "network",
    reach30: 0.3,
  },
  playtime_milestone: {
    delayLabel: "Наиграл за неделю",
    delays: ["5 часов", "10 часов", "20 часов"],
    delay: "10 часов",
    sentence: (d) => `Наиграл ${d} за неделю и ни разу не покупал`,
    segment: "loyal",
    channels: ["actionbar"],
    message: "10 часов на сервере! Держи −{discount} на первую покупку: {link}",
    title: "10 часов на ArcticMC",
    subtitle: "Скидка {discount} на первую покупку",
    discountPct: 10,
    productId: "cart",
    ttlHours: 48,
    conversion: 4.2,
    conversionSource: "own",
    reach30: 0.25,
  },
  purchase_broadcast: {
    delayLabel: "Покупка дороже",
    delays: ["100 ₽", "250 ₽", "500 ₽", "1 000 ₽"],
    delay: "250 ₽",
    sentence: (d) => `Любая покупка дороже ${d}`,
    segment: "all",
    channels: ["chat", "telegram"],
    message: "{player} поддержал сервер и получил {product} — спасибо!",
    title: "{player} поддержал сервер",
    subtitle: "Спасибо!",
    discountPct: 0,
    productId: "cart",
    ttlHours: 24,
    conversion: null,
    conversionSource: "own",
    reach30: 1,
  },
  goal_progress: {
    delayLabel: "Показывать каждые",
    delays: ["2 часа", "6 часов", "24 часа"],
    delay: "6 часов",
    sentence: (d) => `Пока идёт сбор цели месяца — раз в ${d}`,
    segment: "all",
    channels: ["bossbar", "chat"],
    message: "На аренду сервера собрано 73 %. Поддержать: {link}",
    title: "Цель месяца — 73 %",
    subtitle: "43 800 ₽ из 60 000 ₽",
    discountPct: 0,
    productId: "cart",
    ttlHours: 24,
    conversion: 3.1,
    conversionSource: "network",
    reach30: 1,
  },
};

export const TEMPLATE_ORDER: CampaignType[] = [
  "abandoned_cart",
  "rank_expiring",
  "winback",
  "first_purchase",
  "wipe_day",
  "playtime_milestone",
  "purchase_broadcast",
  "goal_progress",
];

export const IN_GAME: CampaignChannel[] = ["chat", "title", "bossbar", "actionbar"];
export const OFF_GAME: CampaignChannel[] = ["telegram", "vk", "discord"];

/** 1 in 3 days is the global cap across all campaigns, so a campaign can only be stricter. */
export const FREQ_OPTIONS = [3, 7, 14];
export const GLOBAL_CAP_DAYS = 3;
export const TTL_OPTIONS = [6, 24, 48, 72, 168];

export const CHAR_LIMITS: Partial<Record<CampaignChannel, number>> = { chat: 256, actionbar: 70 };
export const TITLE_LIMIT = 32;
export const SUBTITLE_LIMIT = 60;

export function defaultTypeForSegment(segment: SegmentKey | null): CampaignType {
  if (segment === "at_risk" || segment === "dormant") return "winback";
  if (segment === "new") return "first_purchase";
  if (segment === "whale") return "rank_expiring";
  return "abandoned_cart";
}

export function draftFromTemplate(type: CampaignType, servers: string[], segment?: SegmentKey | null): CampaignDraft {
  const t = TEMPLATES[type];
  return {
    type,
    name: "",
    delay: t.delay,
    segment: segment ?? t.segment,
    servers,
    freqDays: 3,
    quietHours: true,
    channels: [...t.channels],
    message: t.message,
    title: t.title,
    subtitle: t.subtitle,
    discountPct: t.discountPct,
    productId: t.productId,
    ttlHours: t.ttlHours,
  };
}

export function draftFromCampaign(c: Campaign, servers: string[]): CampaignDraft {
  const base = draftFromTemplate(c.type, servers);
  return {
    ...base,
    id: c.id,
    name: c.name,
    channels: [...c.channels],
    message: c.message,
    discountPct: c.offer?.discountPct ?? 0,
    productId: c.offer?.productId ?? base.productId,
    ttlHours: c.offer?.ttlHours ?? base.ttlHours,
  };
}

export function ttlLabel(hours: number) {
  if (hours >= 168 && hours % 24 === 0) return `${hours / 24} дней`;
  if (hours >= 48 && hours % 24 === 0) return `${hours / 24} суток`;
  if (hours === 24) return "24 часа";
  return `${hours} ч`;
}

export function freqLabel(days: number) {
  return days === 1 ? "раза в день" : `раза в ${days} ${plural(days, ["день", "дня", "дней"])}`;
}

/**
 * Keeps texts in step with the trigger: «закончится через 3 дня» becomes «через 7 дней»
 * when the delay changes. Only the exact old phrase is swapped, the rest of an edited text stays.
 */
export function swapDelay(text: string, from: string, to: string) {
  return from && text.includes(from) ? text.split(from).join(to) : text;
}
