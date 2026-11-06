/**
 * Russian-locale formatting helpers. All UI numbers/dates go through here.
 * Thin spaces (U+202F) between thousands, comma decimals, "₽" after the amount.
 */

const nf0 = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export type Currency = "RUB" | "KZT" | "BYN" | "USD" | "EUR" | "UAH" | "UZS";

const currencySymbol: Record<Currency, string> = {
  RUB: "₽",
  KZT: "₸",
  BYN: "Br",
  USD: "$",
  EUR: "€",
  UAH: "₴",
  UZS: "сум",
};

export function formatNumber(value: number, fractionDigits: 0 | 1 | 2 = 0) {
  if (fractionDigits === 2) return nf2.format(value);
  if (fractionDigits === 1) return nf1.format(value);
  return nf0.format(value);
}

/** 12 480 ₽ · with `fraction` → 12 480,00 ₽ */
export function formatMoney(value: number, opts: { currency?: Currency; fraction?: boolean } = {}) {
  const { currency = "RUB", fraction = false } = opts;
  const num = fraction ? nf2.format(value) : nf0.format(Math.round(value));
  const sym = currencySymbol[currency];
  return currency === "USD" || currency === "EUR" ? `${sym}${num}` : `${num} ${sym}`;
}

/** 1,2 млн ₽ / 840 тыс ₽ — for big KPI numbers */
export function formatMoneyCompact(value: number, currency: Currency = "RUB") {
  const sym = currencySymbol[currency];
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${nf1.format(value / 1_000_000_000)} млрд ${sym}`;
  if (abs >= 1_000_000) return `${nf1.format(value / 1_000_000)} млн ${sym}`;
  if (abs >= 10_000) return `${nf1.format(value / 1_000)} тыс ${sym}`;
  return formatMoney(value, { currency });
}

export function formatCompact(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${nf1.format(value / 1_000_000)} млн`;
  if (abs >= 10_000) return `${nf1.format(value / 1_000)} тыс`;
  return nf0.format(value);
}

/** 4,9 % → pass 4.9 ; signed adds + for positives */
export function formatPercent(value: number, opts: { digits?: 0 | 1 | 2; signed?: boolean; fixed?: boolean } = {}) {
  const { digits = 1, signed = false, fixed = false } = opts;
  const f = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: fixed ? digits : 0 });
  const s = f.format(value);
  return `${signed && value > 0 ? "+" : ""}${s} %`;
}

/**
 * Russian plural: plural(5, ["заказ", "заказа", "заказов"]) → "заказов"
 */
export function plural(n: number, forms: [string, string, string]) {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

/** "12 заказов" */
export function pluralize(n: number, forms: [string, string, string]) {
  return `${formatNumber(n)} ${plural(n, forms)}`;
}

const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

export { MONTHS_NOM, MONTHS_SHORT, WEEKDAYS_SHORT };

/**
 * All dates are rendered in Moscow time (UTC+3, no DST) regardless of the
 * server/browser timezone — this keeps SSR and hydration output identical.
 */
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

function toDate(d: Date | string | number) {
  const date = d instanceof Date ? d : new Date(d);
  return new Date(date.getTime() + MSK_OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 6 ноября 2026 */
export function formatDate(d: Date | string | number, opts: { year?: boolean } = {}) {
  const date = toDate(d);
  const { year = true } = opts;
  return `${date.getUTCDate()} ${MONTHS_GEN[date.getUTCMonth()]}${year ? ` ${date.getUTCFullYear()}` : ""}`;
}

/** 6 ноя */
export function formatDateShort(d: Date | string | number) {
  const date = toDate(d);
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`;
}

/** 14:05 */
export function formatTime(d: Date | string | number, withSeconds = false) {
  const date = toDate(d);
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}${withSeconds ? `:${pad(date.getUTCSeconds())}` : ""}`;
}

/** 6 ноя, 14:05 */
export function formatDateTime(d: Date | string | number) {
  return `${formatDateShort(d)}, ${formatTime(d)}`;
}

/** 06.11.2026 */
export function formatDateNumeric(d: Date | string | number) {
  const date = toDate(d);
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
}

/**
 * "только что", "5 мин назад", "3 ч назад", "вчера", "4 дня назад", then date.
 * Pass `now` explicitly (use NOW from mock data) to stay hydration-safe.
 */
export function formatRelative(d: Date | string | number, now: Date | number) {
  const date = (d instanceof Date ? d : new Date(d)).getTime();
  const ref = typeof now === "number" ? now : now.getTime();
  const diff = Math.round((ref - date) / 1000);
  if (diff < 0) {
    const ahead = -diff;
    if (ahead < 3600) return `через ${Math.max(1, Math.round(ahead / 60))} мин`;
    if (ahead < 86400) return `через ${Math.round(ahead / 3600)} ч`;
    const days = Math.round(ahead / 86400);
    return `через ${days} ${plural(days, ["день", "дня", "дней"])}`;
  }
  if (diff < 45) return "только что";
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))} мин назад`;
  if (diff < 86400) return `${Math.round(diff / 3600)} ч назад`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return "вчера";
  if (days < 7) return `${days} ${plural(days, ["день", "дня", "дней"])} назад`;
  return formatDate(date, { year: false });
}

/** Weekday short name in MSK: "пн" */
export function formatWeekday(d: Date | string | number) {
  return WEEKDAYS_SHORT[toDate(d).getUTCDay()];
}

/** Hour of day in MSK (0–23) */
export function mskHour(d: Date | string | number) {
  return toDate(d).getUTCHours();
}

/** 0,6 с · 840 мс */
export function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} мс`;
  if (ms < 60_000) return `${nf1.format(ms / 1000)} с`;
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  return `${h} ч ${min % 60} мин`;
}

/** 2 ч 15 мин for playtime in minutes */
export function formatPlaytime(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  if (h < 100) return `${h} ч${minutes % 60 ? ` ${minutes % 60} мин` : ""}`;
  return `${formatNumber(h)} ч`;
}

/**
 * Russian typography for display strings: a dash never starts a line, one-letter
 * prepositions stick to the next word, units stick to their numbers.
 */
export function typo(text: string) {
  return text
    .replace(/ — /g, " — ")
    .replace(/(^|[\s(«])([вскоуиаВСКОУИА]) /g, "$1$2 ")
    .replace(/(\d) (₽|%|мин|сек|с|ч|дн|тыс|млн)(?=[\s.,;:!?)»]|$)/g, "$1 $2");
}
