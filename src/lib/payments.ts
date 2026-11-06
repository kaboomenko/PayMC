import type { CountryCode, PaymentMethod, Plan } from "@/lib/mock/types";

export interface PaymentMethodMeta {
  label: string;
  short: string;
  region: "RU" | "KZ" | "BY" | "INTL";
  /** live — available now; soon — phase 2 (CIS via partner PSP) */
  availability: "live" | "soon";
  settlement: string;
  note?: string;
}

/**
 * Only RU rails are live in the MVP. Crypto is not offered to RU players
 * (payments for goods in crypto are prohibited in Russia).
 */
export const PAYMENT_METHODS: Record<PaymentMethod, PaymentMethodMeta> = {
  sbp: { label: "СБП", short: "СБП", region: "RU", availability: "live", settlement: "без холда", note: "QR на компьютере, переход в банк на телефоне" },
  card: { label: "Банковская карта", short: "Карта", region: "RU", availability: "live", settlement: "холд 24 ч", note: "Мир и карты российских банков, 3-D Secure" },
  sberpay: { label: "SberPay", short: "SberPay", region: "RU", availability: "live", settlement: "холд 24 ч" },
  tpay: { label: "T-Pay", short: "T-Pay", region: "RU", availability: "live", settlement: "холд 24 ч" },
  yoomoney: { label: "ЮMoney", short: "ЮMoney", region: "RU", availability: "live", settlement: "холд 24 ч" },
  mobile: {
    label: "Баланс телефона",
    short: "Телефон",
    region: "RU",
    availability: "live",
    settlement: "до 3 дней",
    note: "МТС, Билайн, МегаФон, T2 — комиссия оператора + 2 п.п.",
  },
  mirpay: { label: "Mir Pay", short: "Mir Pay", region: "RU", availability: "soon", settlement: "—" },
  kaspi: { label: "Kaspi", short: "Kaspi", region: "KZ", availability: "soon", settlement: "—", note: "Казахстан, через партнёра" },
  erip: { label: "ЕРИП", short: "ЕРИП", region: "BY", availability: "soon", settlement: "—", note: "Беларусь, через партнёра" },
  intl_card: { label: "Зарубежная карта", short: "Visa/MC", region: "INTL", availability: "soon", settlement: "—" },
  crypto: { label: "Криптовалюта", short: "Крипто", region: "INTL", availability: "soon", settlement: "—", note: "Только для игроков вне РФ" },
};

export const LIVE_METHODS = (Object.keys(PAYMENT_METHODS) as PaymentMethod[]).filter((m) => PAYMENT_METHODS[m].availability === "live");

export const COUNTRIES: Record<CountryCode, { name: string; currency: "RUB" | "KZT" | "BYN" | "UZS" | "AMD" | "KGS" | "GEL" | "UAH" | "EUR" | "PLN" }> = {
  RU: { name: "Россия", currency: "RUB" },
  KZ: { name: "Казахстан", currency: "KZT" },
  BY: { name: "Беларусь", currency: "BYN" },
  UZ: { name: "Узбекистан", currency: "UZS" },
  AM: { name: "Армения", currency: "AMD" },
  KG: { name: "Кыргызстан", currency: "KGS" },
  GE: { name: "Грузия", currency: "GEL" },
  UA: { name: "Украина", currency: "UAH" },
  DE: { name: "Германия", currency: "EUR" },
  PL: { name: "Польша", currency: "PLN" },
};

/**
 * One all-inclusive rate (acquiring, receipts, payouts, delivery, anti-fraud).
 * The tier is picked automatically by monthly turnover. No subscription.
 */
export const PLAN_FEES: Record<Plan, number> = { start: 0.049, pro: 0.039, network: 0.029 };

export const PLAN_META: Record<Plan, { label: string; rate: string; threshold: string; monthly: number }> = {
  start: { label: "Старт", rate: "4,9 %", threshold: "оборот до 500 тыс ₽ в месяц", monthly: 0 },
  pro: { label: "Рост", rate: "3,9 %", threshold: "от 500 тыс ₽ в месяц", monthly: 0 },
  network: { label: "Сеть", rate: "2,9 %", threshold: "от 3 млн ₽ в месяц, условия индивидуально", monthly: 0 },
};

/** Mobile-balance payments cost the operator fee + 2 p.p. */
export const MOBILE_FEE = 0.079;

/** Monthly turnover thresholds for the automatic tiers */
export const TIER_THRESHOLDS = { pro: 500_000, network: 3_000_000 } as const;

export function feeRateFor(turnover: number) {
  if (turnover >= TIER_THRESHOLDS.network) return PLAN_FEES.network;
  if (turnover >= TIER_THRESHOLDS.pro) return PLAN_FEES.pro;
  return PLAN_FEES.start;
}

/** Typical competitor model used in landing comparisons (no names): commission range + paid withdrawals. */
export const TYPICAL_PLATFORM = { commissionMin: 0.07, commissionMax: 0.12, withdrawalFee: 0.02 } as const;
export const TYPICAL_WITHDRAWAL_FEE = TYPICAL_PLATFORM.withdrawalFee;
