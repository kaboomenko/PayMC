"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RadioGroup } from "radix-ui";
import { ArrowLeft, Check, ChevronDown, CreditCard, Gift, Loader2, Lock, MessageSquareText, QrCode, Smartphone, TicketPercent, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney, formatNumber, pluralize } from "@/lib/format";
import { DAY } from "@/lib/mock/now";
import { PAYMENT_METHODS } from "@/lib/payments";
import type { PaymentMethod } from "@/lib/mock/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/ui/copy-button";
import { Kbd } from "@/components/ui/kbd";
import { ProductArt } from "./art";
import { SbpQr } from "./sbp-qr";
import { caseOdds } from "./case-odds";
import { CaseOddsList } from "./odds";
import { NICK_RE, nickError } from "./nickname";
import { durationLabel } from "./store-sections";
import type { StoreData, StoreProduct, StorePromo } from "./types";

/** SBP is the default and the only commission-free rail, so it gets the full row. */
const TILES: PaymentMethod[] = ["card", "sberpay", "tpay", "yoomoney", "mobile"];

const TILE_LABEL: Partial<Record<PaymentMethod, string>> = {
  card: "Карта",
  sberpay: "SberPay",
  tpay: "T-Pay",
  yoomoney: "ЮMoney",
  mobile: "Баланс телефона",
};

/** Player-facing hints (the owner-facing notes in PAYMENT_METHODS talk about fees). */
const HINT: Partial<Record<PaymentMethod, string>> = {
  sbp: "QR-код или переход в приложение банка",
  card: "Мир и карты российских банков · 3-D Secure",
  sberpay: "Подтверждение в СберБанк Онлайн",
  tpay: "Подтверждение в приложении Т-Банка",
  yoomoney: "Кошелёк или привязанная карта",
  mobile: "МТС, Билайн, МегаФон, T2 · оператор добавит свою комиссию",
};

/** Redirect-style methods: what the player sees while we hand over to the bank app. */
const REDIRECT: Partial<Record<PaymentMethod, { title: string; text: (sum: string) => string }>> = {
  sberpay: { title: "Переходим в СберБанк Онлайн", text: (s) => `Подтвердите оплату ${s} в приложении — сюда вернём автоматически.` },
  tpay: { title: "Переходим в приложение Т-Банка", text: (s) => `Подтвердите оплату ${s} в приложении — сюда вернём автоматически.` },
  yoomoney: { title: "Переходим в ЮMoney", text: (s) => `Оплатите ${s} из кошелька или привязанной картой — окно откроется само.` },
};

/** These rails can't charge a saved payment method every month. */
const NO_RECURRING: PaymentMethod[] = ["yoomoney", "mobile"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Nicks that completed a purchase in this browser session (first-purchase promo codes). */
const sessionBuyers = new Set<string>();

/** 400 → "0,4 с" — delivery time reads better in seconds for players */
export function formatSeconds(ms: number) {
  return `${formatNumber(ms / 1000, 1)} с`;
}

type Step = "details" | "pay" | "done";

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

function formatPhone(d: string) {
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean);
  if (parts.length <= 1) return parts.join("");
  return `${parts[0]} ${parts[1]}${parts[2] ? `-${parts[2]}` : ""}${parts[3] ? `-${parts[3]}` : ""}`;
}

function formatElapsed(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function CheckoutDialog({
  product,
  onClose,
  nick,
  onNick,
  data,
}: {
  product: StoreProduct | null;
  onClose: () => void;
  nick: string;
  onNick: (v: string) => void;
  data: StoreData;
}) {
  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[520px] overflow-x-hidden overflow-y-auto overscroll-contain">
        {product ? <CheckoutFlow key={product.id} product={product} nick={nick} onNick={onNick} data={data} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CheckoutFlow({
  product,
  nick,
  onNick,
  data,
  onClose,
}: {
  product: StoreProduct;
  nick: string;
  onNick: (v: string) => void;
  data: StoreData;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const isPool = product.kind === "pool" && product.pool;
  const isSub = product.kind === "subscription";
  const odds = product.kind === "case" ? caseOdds(product.id) : null;
  const poolRest = product.pool ? product.pool.target - product.pool.raised : 0;
  const minAmount = product.pool?.minContribution ?? 50;

  const [step, setStep] = React.useState<Step>("details");
  const [cardStage, setCardStage] = React.useState<"form" | "confirm">("form");
  const [included, setIncluded] = React.useState(false);
  const [gift, setGift] = React.useState(false);
  const [friend, setFriend] = React.useState("");
  const [promoInput, setPromoInput] = React.useState("");
  const [promo, setPromo] = React.useState<StorePromo | null>(null);
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [method, setMethod] = React.useState<PaymentMethod>("sbp");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [amount, setAmount] = React.useState(Math.min(Math.max(minAmount, 100), poolRest || 100));
  const [touched, setTouched] = React.useState(false);
  const [delivered, setDelivered] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);
  const [autoConfirm, setAutoConfirm] = React.useState(true);
  const timers = React.useRef<number[]>([]);
  const ticker = React.useRef<number | null>(null);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (ticker.current !== null) window.clearInterval(ticker.current);
    ticker.current = null;
  };
  React.useEffect(() => clearTimers, []);

  const base = isPool ? amount : product.price;
  const isBuyer = (n: string) => data.knownBuyers.includes(n.toLowerCase()) || sessionBuyers.has(n.toLowerCase());

  function promoIssue(p: StorePromo): string | null {
    if (p.scope !== "all" && !p.scope.includes(product.id)) return `${p.code} действует только ${p.scopeLabel ?? "на отдельные товары"}`;
    if (p.minAmount && base < p.minAmount) return `${p.code} действует на заказ от ${formatMoney(p.minAmount)}`;
    if (p.firstPurchaseOnly && nick && isBuyer(nick)) return `${p.code} — только для первой покупки, а у ${nick} уже есть заказы`;
    return null;
  }

  const appliedIssue = promo ? promoIssue(promo) : null;
  const discount = promo && !appliedIssue ? (promo.kind === "percent" ? Math.round((base * promo.value) / 100) : Math.min(base, promo.value)) : 0;
  const total = Math.max(0, base - discount);

  const phoneDigits = phone.replace(/\D/g, "");
  const nickErr = nickError(nick);
  const friendErr = gift ? (friend ? (NICK_RE.test(friend) ? null : "3–16 символов: латиница, цифры и _") : "Укажите ник друга") : null;
  const emailErr = email && !EMAIL_RE.test(email) ? "Проверьте адрес — в нём опечатка" : null;
  const amountErr = isPool && (amount < minAmount || amount > poolRest) ? `От ${formatMoney(minAmount)} до ${formatMoney(poolRest)}` : null;
  const phoneErr = method === "mobile" && phoneDigits.length !== 10 ? "Номер из 10 цифр после +7" : null;
  const consentErr = isSub && !consent ? "Без согласия на автосписание подписку не оформить" : null;
  const valid = !nickErr && !friendErr && !emailErr && !amountErr && !phoneErr && !consentErr;
  const recipient = gift ? friend : nick;
  const orderNo = `PMC-${105_000 + (hashStr(product.id + recipient) % 900)}`;
  const nextCharge = formatDate(data.now + 30 * DAY, { year: false });

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const found = data.promos.find((p) => p.code === code);
    if (!found) {
      setPromo(null);
      setPromoError("Такого промокода нет или он закончился");
      return;
    }
    const issue = promoIssue(found);
    if (issue) {
      setPromo(null);
      setPromoError(issue);
      return;
    }
    setPromo(found);
    setPromoError(null);
  }

  /** Waiting for the bank/operator: a live seconds counter, then (optionally) the confirmation. */
  function startWaiting(confirmAfter: number | null) {
    clearTimers();
    setElapsed(0);
    ticker.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    if (confirmAfter !== null) timers.current.push(window.setTimeout(startDelivery, reduce ? 300 : confirmAfter));
  }

  function pay(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setStep("pay");
    if (method === "card") {
      clearTimers();
      setCardStage("form");
      return;
    }
    if (method === "sbp") {
      // On a phone the player can't scan a QR on the same screen: wait for «Открыть банк».
      const phoneLayout = window.matchMedia("(max-width: 639px)").matches;
      setAutoConfirm(!phoneLayout);
      startWaiting(phoneLayout ? null : 3600);
      return;
    }
    setAutoConfirm(true);
    startWaiting(method === "mobile" ? 3600 : 2600);
  }

  function startDelivery() {
    clearTimers();
    setStep("done");
    setDelivered(0);
    sessionBuyers.add(nick.toLowerCase());
    if (reduce) {
      setDelivered(3);
      return;
    }
    [250, 650, 1050].forEach((t, i) => timers.current.push(window.setTimeout(() => setDelivered(i + 1), t)));
  }

  function openBank() {
    clearTimers();
    setAutoConfirm(true);
    timers.current.push(window.setTimeout(startDelivery, reduce ? 200 : 1100));
  }

  function back() {
    clearTimers();
    setStep("details");
  }

  const methodLabel = PAYMENT_METHODS[method].label;
  const waitingWho = method === "mobile" ? "оператора" : "банка";
  const hasIncluded = !isPool && (odds !== null || product.perks.length > 0);

  return (
    <div>
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-4 pr-12">
        <ProductArt p={product} size="sm" />
        <div className="min-w-0">
          <DialogTitle className="truncate pr-0 text-[15px]">{product.name}</DialogTitle>
          <DialogDescription className="mt-0.5 truncate text-xs">
            {isPool ? "Складчина · взнос" : isSub ? "подписка · списание раз в 30 дней" : (durationLabel(product) ?? "мгновенная выдача")} · {data.name}
          </DialogDescription>
        </div>
        <StepDots step={step} />
      </div>

      {step === "details" && hasIncluded ? (
        <div className="border-b border-line">
          <button
            type="button"
            aria-expanded={included}
            onClick={() => setIncluded((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left text-[12.5px] text-fg-2 transition-colors hover:bg-white/[0.02] hover:text-fg"
          >
            <span>
              {odds ? "Шансы выпадения" : "Что входит"}{" "}
              <span className="text-fg-4">
                · {odds ? pluralize(odds.rewards.length, ["награда", "награды", "наград"]) : pluralize(product.perks.length, ["пункт", "пункта", "пунктов"])}
              </span>
            </span>
            <ChevronDown className={cn("size-3.5 text-fg-3 transition-transform duration-200", included && "rotate-180")} />
          </button>
          {included ? (
            <div className="px-5 pb-3.5">
              {odds ? (
                <CaseOddsList odds={odds} />
              ) : (
                <>
                  <p className="text-[12.5px] leading-snug text-fg-3">{product.description}</p>
                  <ul className="mt-2 grid gap-1">
                    {product.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-fg-2">
                        <Check className="mt-[3px] size-3 shrink-0 text-azure-300" strokeWidth={2.5} />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {step === "details" ? (
          <motion.form
            key="details"
            onSubmit={pay}
            noValidate
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="grid min-w-0 grid-cols-1 gap-5 px-5 py-5">
              {isPool ? (
                <fieldset className="min-w-0">
                  <legend className="mb-2 text-[13px] font-medium text-fg-2">Сумма взноса</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set([minAmount, 100, 250, 500, poolRest])]
                      .filter((v) => v >= minAmount && v <= poolRest)
                      .sort((a, b) => a - b)
                      .map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAmount(v)}
                          className={cn(
                            "h-8 rounded-md border px-3 font-mono text-[12.5px] transition-colors nums",
                            amount === v ? "border-azure-400/60 bg-azure-500/12 text-azure-100" : "border-line text-fg-2 hover:border-line-strong",
                          )}
                        >
                          {v === poolRest ? `${formatMoney(v)} · закрыть сбор` : formatMoney(v)}
                        </button>
                      ))}
                  </div>
                  {amountErr ? <p className="mt-1.5 text-xs text-bad">{amountErr}</p> : null}
                </fieldset>
              ) : null}

              {/* nick + gift */}
              <div className="grid min-w-0 gap-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                  <label htmlFor="co-nick" className="text-[13px] font-medium text-fg-2">
                    {gift ? "Ваш ник — от кого подарок" : "Ник в игре"}
                  </label>
                  {isSub ? (
                    <span className="text-xs text-fg-4">подписку нельзя подарить</span>
                  ) : (
                    <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-fg-2 select-none">
                      <Gift className="size-3.5 text-fg-3" />
                      Подарить другу
                      <Switch size="sm" checked={gift} onCheckedChange={setGift} aria-label="Подарить другу" />
                    </label>
                  )}
                </div>
                <input
                  id="co-nick"
                  value={nick}
                  onChange={(e) => onNick(e.target.value.replace(/\s+/g, "").slice(0, 16))}
                  spellCheck={false}
                  autoComplete="nickname"
                  aria-invalid={touched && !!nickErr}
                  className={inputCls}
                  placeholder="kotik228"
                />
                {touched && nickErr ? <p className="text-xs text-bad">{nickErr}</p> : null}
                <AnimatePresence initial={false}>
                  {gift ? (
                    <motion.div
                      key="friend"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <label htmlFor="co-friend" className="mt-1 mb-2 block text-[13px] font-medium text-fg-2">
                        Ник друга
                      </label>
                      <input
                        id="co-friend"
                        value={friend}
                        onChange={(e) => setFriend(e.target.value.replace(/\s+/g, "").slice(0, 16))}
                        spellCheck={false}
                        aria-invalid={touched && !!friendErr}
                        className={inputCls}
                        placeholder="Steve_Pro"
                      />
                      <p className={cn("mt-1.5 text-xs", touched && friendErr ? "text-bad" : "text-fg-3")}>
                        {touched && friendErr ? friendErr : "Покупка придёт другу, а в чате напишем, что она от вас."}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* promo */}
              {!isPool ? (
                <div className="grid min-w-0 gap-2">
                  <label htmlFor="co-promo" className="text-[13px] font-medium text-fg-2">
                    Промокод
                  </label>
                  {promo ? (
                    <div
                      className={cn(
                        "flex h-9 min-w-0 items-center justify-between rounded-md border px-3",
                        appliedIssue ? "border-line bg-surface-2" : "border-ok/25 bg-ok-soft",
                      )}
                    >
                      <span className={cn("flex min-w-0 items-center gap-2 text-[13px]", appliedIssue ? "text-fg-3" : "text-ok")}>
                        <TicketPercent className="size-4 shrink-0" />
                        <span className={cn("font-mono", appliedIssue && "line-through")}>{promo.code}</span>
                        <span className={cn("truncate", appliedIssue ? "text-fg-4" : "text-ok/80")}>
                          {promo.kind === "percent" ? `−${promo.value} %` : `−${formatMoney(promo.value)}`}
                          {promo.firstPurchaseOnly ? " · первая покупка" : ""}
                        </span>
                      </span>
                      <button
                        type="button"
                        aria-label="Убрать промокод"
                        onClick={() => {
                          setPromo(null);
                          setPromoInput("");
                        }}
                        className="shrink-0 rounded-sm p-1 text-fg-3 transition-colors hover:bg-white/5 hover:text-fg"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex min-w-0 gap-2">
                      <input
                        id="co-promo"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          setPromoError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyPromo();
                          }
                        }}
                        spellCheck={false}
                        aria-invalid={!!promoError}
                        aria-describedby={promoError ? "co-promo-err" : undefined}
                        className={cn(inputCls, "min-w-0 uppercase")}
                        placeholder="WINTER25"
                      />
                      <button
                        type="button"
                        onClick={applyPromo}
                        disabled={!promoInput.trim()}
                        className="h-9 shrink-0 rounded-md border border-line bg-surface-2 px-3 text-[13px] font-medium text-fg transition-colors hover:border-line-strong hover:bg-surface-3 disabled:opacity-45"
                      >
                        Применить
                      </button>
                    </div>
                  )}
                  {promoError || appliedIssue ? (
                    <p id="co-promo-err" className="text-xs text-bad">
                      {promoError ?? appliedIssue}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* methods */}
              <fieldset className="grid min-w-0 grid-cols-1 gap-2">
                <legend className="mb-2 text-[13px] font-medium text-fg-2">Способ оплаты</legend>
                <RadioGroup.Root
                  value={method}
                  onValueChange={(v) => setMethod(v as PaymentMethod)}
                  className="grid min-w-0 grid-cols-1 gap-1.5"
                  aria-label="Способ оплаты"
                >
                  <SbpOption active={method === "sbp"} />
                  <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {TILES.map((m) => (
                      <MethodTile
                        key={m}
                        m={m}
                        active={method === m}
                        disabled={isSub && NO_RECURRING.includes(m)}
                        className={m === "mobile" ? "col-span-2" : undefined}
                      />
                    ))}
                  </div>
                </RadioGroup.Root>
                {method !== "sbp" ? (
                  <p className="text-[11.5px] leading-snug text-fg-3" aria-live="polite">
                    {HINT[method]}
                  </p>
                ) : null}
                {isSub ? <p className="text-[11.5px] leading-snug text-fg-4">ЮMoney и баланс телефона не поддерживают автосписание.</p> : null}
                {method === "mobile" ? (
                  <div className="mt-1 grid gap-1.5">
                    <label htmlFor="co-phone" className="text-[13px] font-medium text-fg-2">
                      Номер телефона
                    </label>
                    <div
                      className={cn(
                        inputCls,
                        "flex items-center gap-0 p-0 focus-within:border-azure-500/70 focus-within:shadow-[0_0_0_3px_rgb(51_119_255/0.18)]",
                        touched && phoneErr && "border-bad/60",
                      )}
                    >
                      <span className="pl-3 text-fg-3">+7</span>
                      <input
                        id="co-phone"
                        value={formatPhone(phoneDigits)}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="900 000-00-00"
                        aria-invalid={touched && !!phoneErr}
                        className="h-full min-w-0 flex-1 bg-transparent px-2 text-fg outline-none placeholder:text-fg-4"
                      />
                    </div>
                    <p className={cn("text-xs", touched && phoneErr ? "text-bad" : "text-fg-3")}>
                      {touched && phoneErr ? phoneErr : "Оператор пришлёт SMS с суммой и комиссией — оплата после вашего ответа."}
                    </p>
                  </div>
                ) : null}
                <p className="text-[11.5px] text-fg-4">Скоро: Kaspi, ЕРИП, зарубежные карты</p>
              </fieldset>

              {/* email */}
              <div className="grid min-w-0 gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="co-email" className="text-[13px] font-medium text-fg-2">
                    Email для чека
                  </label>
                  <span className="text-xs text-fg-4">необязательно</span>
                </div>
                <input
                  id="co-email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  aria-invalid={!!emailErr}
                  className={inputCls}
                  placeholder="you@mail.ru"
                  autoComplete="email"
                />
                <p className={cn("text-xs", emailErr ? "text-bad" : "text-fg-3")}>{emailErr ?? "Чек придёт сюда. Без email он всё равно сформируется."}</p>
              </div>
            </div>

            {/* total — sticky, so the price and the button are always on screen */}
            <div className="sticky bottom-0 z-10 border-t border-line bg-surface-2 px-5 pt-3.5 pb-4 shadow-[0_-8px_16px_-12px_rgb(0_0_0/0.7)]">
              <dl className="grid gap-1 text-[13px]">
                {discount || method === "mobile" ? (
                  <div className="flex justify-between gap-3 text-fg-3">
                    <dt className="min-w-0 truncate">{isPool ? "Взнос" : product.name}</dt>
                    <dd className="font-mono nums">{formatMoney(base)}</dd>
                  </div>
                ) : null}
                {discount ? (
                  <div className="flex justify-between gap-3 text-ok">
                    <dt>Промокод {promo?.code}</dt>
                    <dd className="font-mono nums">−{formatMoney(discount)}</dd>
                  </div>
                ) : null}
                {method === "mobile" ? (
                  <div className="flex justify-between gap-3 text-fg-3">
                    <dt>Комиссия оператора</dt>
                    <dd>по тарифу, сумма придёт в SMS</dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-fg">{method === "mobile" ? "Итого без комиссии" : "Итого"}</dt>
                  <dd className="font-mono text-[20px] font-semibold tracking-[-0.02em] text-fg nums">
                    {formatMoney(total)}
                    {isSub && !discount ? <span className="text-[13px] font-normal text-fg-3">/мес</span> : null}
                  </dd>
                </div>
              </dl>
              {isSub ? (
                <p className="mt-0.5 text-[12px] text-fg-3">
                  Следующее списание {nextCharge} · отмена в один клик
                  {discount ? ` · скидка только на первый месяц, дальше ${formatMoney(base)}/мес` : ""}
                </p>
              ) : null}
              <button
                type="submit"
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white text-[15px] font-semibold text-canvas shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)] transition-[background-color,transform] hover:bg-azure-50 active:translate-y-px"
              >
                <Lock className="size-4" />
                {isSub
                  ? discount
                    ? `Оформить подписку · ${formatMoney(total)} за первый месяц`
                    : `Оформить подписку · ${formatMoney(total)}/мес`
                  : `Оплатить ${formatMoney(total)}`}
              </button>
              {isSub ? (
                <div className="mt-2.5">
                  <label className="flex cursor-pointer items-start gap-2 text-[12px] leading-snug text-fg-3">
                    <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} aria-invalid={touched && !!consentErr} className="mt-px" />
                    <span>
                      Согласен на автосписание {formatMoney(base)} раз в 30 дней по{" "}
                      <Link href="/legal#players" target="_blank" rel="noopener" className="text-fg-2 underline underline-offset-2 hover:text-fg">
                        оферте для игроков
                      </Link>
                    </span>
                  </label>
                  {touched && consentErr ? <p className="mt-1 pl-6 text-xs text-bad">{consentErr}</p> : null}
                </div>
              ) : (
                <p className="mt-2 flex items-center justify-between gap-2 text-[11.5px] text-fg-4">
                  <span>
                    Нажимая «Оплатить», вы принимаете{" "}
                    <Link href="/legal#players" target="_blank" rel="noopener" className="text-fg-3 underline underline-offset-2 transition-colors hover:text-fg">
                      оферту для игроков
                    </Link>
                  </span>
                  <span className="hidden items-center gap-1 sm:flex">
                    <Kbd>Enter</Kbd>
                  </span>
                </p>
              )}
            </div>
          </motion.form>
        ) : step === "pay" ? (
          <motion.div
            key="pay"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="px-5 py-5"
          >
            {method === "sbp" ? (
              <SbpStep seed={hashStr(orderNo)} total={total} onOpenBank={openBank} onOtherDevice={() => !autoConfirm && startWaiting(3600)} />
            ) : method === "card" && cardStage === "form" ? (
              <CardForm
                total={total}
                now={data.now}
                onSubmit={() => {
                  setCardStage("confirm");
                  setAutoConfirm(true);
                  startWaiting(2600);
                }}
              />
            ) : method === "card" ? (
              <PendingNote
                title={
                  <>
                    Открываем страницу банка для <span className="whitespace-nowrap">3-D Secure</span>
                  </>
                }
                text={`Подтвердите оплату ${formatMoney(total)} кодом из SMS или в приложении банка.`}
              />
            ) : method === "mobile" ? (
              <PendingNote
                icon={<MessageSquareText className="size-6 text-azure-300" />}
                title={`Отправили SMS на +7 ${formatPhone(phoneDigits)}`}
                text={`Ответьте на него, чтобы оператор списал ${formatMoney(total)} и свою комиссию.`}
              />
            ) : (
              <PendingNote title={REDIRECT[method]?.title ?? "Переходим к оплате"} text={(REDIRECT[method]?.text ?? ((s: string) => `Подтвердите оплату ${s}.`))(formatMoney(total))} />
            )}
            {method !== "card" || cardStage === "confirm" ? (
              <div className="mt-5 flex items-center justify-between rounded-md border border-line bg-surface-2/60 px-3 py-2.5">
                <span className="flex items-center gap-2 text-[13px] text-fg-2">
                  <Loader2 className="size-3.5 animate-spin text-ice-300" />
                  Ждём подтверждения {waitingWho}
                </span>
                <span className="font-mono text-[12px] text-fg-3 nums">{formatElapsed(elapsed)}</span>
              </div>
            ) : null}
            <div className="mt-4 flex items-center justify-between">
              <button type="button" onClick={back} className="inline-flex items-center gap-1.5 text-[13px] text-fg-3 transition-colors hover:text-fg">
                <ArrowLeft className="size-3.5" /> Изменить способ
              </button>
              <span className="font-mono text-[11.5px] text-fg-4">{orderNo}</span>
            </div>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }} className="px-5 py-5">
            <div className="flex items-center justify-between">
              <p className="label-mono text-[10.5px] text-fg-4">
                Заказ <span className="text-fg-2">{orderNo}</span>
              </p>
              {delivered >= 3 ? (
                <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-ok">
                  <Zap className="size-3.5" /> {formatSeconds(data.avgDeliveryMs)}
                </span>
              ) : (
                <span className="font-mono text-[11.5px] text-ice-300">выдаём…</span>
              )}
            </div>
            <ol className="mt-3 grid gap-0" aria-live="polite">
              <DeliveryRow done={delivered >= 1} active={delivered === 0} title="Оплачено" detail={`${methodLabel} · ${formatMoney(total)}`} meta="0 мс" />
              <DeliveryRow
                done={delivered >= 2}
                active={delivered === 1}
                title="Отправлено на сервер"
                detail={isPool ? "Выживание · сбор складчины" : "Выживание · агент PayMC 2.4.1"}
                meta="+38 мс"
              />
              <DeliveryRow
                done={delivered >= 3}
                active={delivered === 2}
                title={`Выдано за ${formatSeconds(data.avgDeliveryMs)}`}
                detail={isPool ? "Взнос учтён, участники видят его в чате" : `Сервер подтвердил выдачу игроку ${recipient}`}
                meta="+362 мс"
                last
              />
            </ol>

            <AnimatePresence>
              {delivered >= 3 ? (
                <motion.div key="ok" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <GamePreview product={product} recipient={recipient} buyer={nick} gift={gift} storeName={data.name} amount={total} />
                  <p className="mt-4 text-[15px] font-semibold text-fg">{successLine(product, gift, recipient)}</p>
                  <p className="mt-1 text-[13px] text-fg-3">
                    {isSub ? `Следующее списание ${nextCharge}. Ссылка на отмену — в письме и в чеке. ` : null}
                    {email ? (
                      <>
                        Чек отправили на <span className="text-fg-2">{email}</span>.
                      </>
                    ) : (
                      "Чек сформирован — его можно запросить в поддержке по номеру заказа."
                    )}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="flex h-9 min-w-0 flex-1 items-center justify-between gap-1 rounded-md border border-line bg-surface-2 pr-1 pl-3">
                      <span className="truncate font-mono text-[13px] text-fg">{data.address}</span>
                      <CopyButton value={data.address} label="Скопировать адрес сервера" />
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="h-9 rounded-md bg-white px-4 text-[13px] font-semibold text-canvas transition-colors hover:bg-azure-50"
                    >
                      Готово
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-line bg-surface-2 px-3 font-mono text-[13px] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-fg-4 hover:border-line-strong focus:border-azure-500/70 focus:shadow-[0_0_0_3px_rgb(51_119_255/0.18)] aria-[invalid=true]:border-bad/60";

function Radio({ active }: { active: boolean }) {
  return (
    <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", active ? "border-azure-400 bg-azure-500" : "border-line-strong")}>
      <RadioGroup.Indicator className="size-1.5 rounded-full bg-white" />
    </span>
  );
}

function SbpOption({ active }: { active: boolean }) {
  return (
    <RadioGroup.Item
      value="sbp"
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-azure-400",
        active ? "border-azure-400/55 bg-azure-500/[0.08]" : "border-line hover:border-line-strong",
      )}
    >
      <Radio active={active} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[13px] font-medium text-fg">
          {PAYMENT_METHODS.sbp.label}
          <span className="rounded-[3px] bg-ok-soft px-1 py-px text-[10px] font-semibold whitespace-nowrap text-ok">без комиссии</span>
        </span>
        <span className="block truncate text-[11.5px] text-fg-3">{HINT.sbp}</span>
      </span>
    </RadioGroup.Item>
  );
}

function MethodTile({ m, active, disabled, className }: { m: PaymentMethod; active: boolean; disabled?: boolean; className?: string }) {
  return (
    <RadioGroup.Item
      value={m}
      disabled={disabled}
      title={disabled ? "Не поддерживает автосписание" : HINT[m]}
      className={cn(
        "flex h-9 min-w-0 items-center gap-2 rounded-md border px-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-azure-400",
        active ? "border-azure-400/55 bg-azure-500/[0.08]" : "border-line hover:border-line-strong",
        disabled && "cursor-not-allowed border-dashed opacity-45 hover:border-line",
        className,
      )}
    >
      <Radio active={active} />
      <span className="truncate text-[13px] font-medium text-fg">{TILE_LABEL[m] ?? PAYMENT_METHODS[m].label}</span>
    </RadioGroup.Item>
  );
}

function PendingNote({ title, text, icon }: { title: React.ReactNode; text: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center py-5 text-center">
      {icon ?? <Loader2 className="size-6 animate-spin text-azure-300" />}
      <p className="mt-3 text-[15px] font-semibold text-balance text-fg">{title}</p>
      <p className="mt-1 max-w-[340px] text-[13px] text-balance text-fg-3">{text}</p>
    </div>
  );
}

/** SBP: QR on wide screens; on phones the bank button comes first and the QR hides under a disclosure. */
function SbpStep({ seed, total, onOpenBank, onOtherDevice }: { seed: number; total: number; onOpenBank: () => void; onOtherDevice: () => void }) {
  const steps = (
    <ol className="mt-2 grid gap-1.5 text-[13px] text-fg-2">
      <li className="flex gap-2">
        <span className="font-mono text-fg-4">1</span> Наведите камеру телефона на QR-код
      </li>
      <li className="flex gap-2">
        <span className="font-mono text-fg-4">2</span> Проверьте сумму — <span className="font-mono text-fg nums">{formatMoney(total)}</span>
      </li>
      <li className="flex gap-2">
        <span className="font-mono text-fg-4">3</span> Подтвердите платёж
      </li>
    </ol>
  );
  return (
    <>
      <div className="hidden items-center gap-5 sm:grid sm:grid-cols-[auto_1fr]">
        <SbpQr seed={seed} size={176} />
        <div>
          <p className="text-[15px] font-semibold text-fg">Откройте приложение банка</p>
          {steps}
        </div>
      </div>
      <div className="sm:hidden">
        <p className="text-[15px] font-semibold text-fg">Оплата через приложение банка</p>
        <p className="mt-1 text-[13px] text-fg-3">
          Откроем ваш банк с суммой <span className="font-mono text-fg nums">{formatMoney(total)}</span> — останется подтвердить.
        </p>
        <button
          type="button"
          onClick={onOpenBank}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white text-[15px] font-semibold text-canvas transition-colors hover:bg-azure-50 active:translate-y-px"
        >
          <Smartphone className="size-4" /> Открыть банк
        </button>
        <details className="group mt-3 rounded-md border border-line" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && onOtherDevice()}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[13px] text-fg-2 marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <QrCode className="size-4 text-fg-3" /> Оплатить с другого устройства
            </span>
            <ChevronDown className="size-3.5 text-fg-3 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid justify-items-center gap-3 border-t border-line-soft px-3 py-4">
            <SbpQr seed={seed} size={168} />
            {steps}
          </div>
        </details>
      </div>
    </>
  );
}

/** Card details live on the payment operator's page — then the bank's 3-D Secure. */
function CardForm({ total, now, onSubmit }: { total: number; now: number; onSubmit: () => void }) {
  const [number, setNumber] = React.useState("");
  const [exp, setExp] = React.useState("");
  const [cvc, setCvc] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  const digits = number.replace(/\D/g, "");
  const expDigits = exp.replace(/\D/g, "");
  const msk = new Date(now + 3 * 60 * 60 * 1000);
  const curYear = msk.getUTCFullYear() % 100;
  const curMonth = msk.getUTCMonth() + 1;
  const mm = Number(expDigits.slice(0, 2));
  const yy = Number(expDigits.slice(2, 4));
  const numErr = digits.length === 16 ? null : "Номер карты — 16 цифр";
  const expErr =
    expDigits.length !== 4 || mm < 1 || mm > 12 ? "Срок в формате ММ/ГГ" : yy < curYear || (yy === curYear && mm < curMonth) ? "Срок действия карты истёк" : null;
  const cvcErr = cvc.length === 3 ? null : "3 цифры с обратной стороны";
  const err = numErr ?? expErr ?? cvcErr;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!err) onSubmit();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
          <CreditCard className="size-4 text-fg-3" /> Данные карты
        </p>
        <span className="flex items-center gap-1 text-[11.5px] text-fg-4">
          <Lock className="size-3" /> PayMC Процессинг
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_88px_72px] gap-2">
        <label className="sr-only" htmlFor="cc-number">
          Номер карты
        </label>
        <input
          id="cc-number"
          value={digits.replace(/(\d{4})(?=\d)/g, "$1 ")}
          onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="2200 0000 0000 0000"
          aria-invalid={touched && !!numErr}
          className={cn(inputCls, "col-span-3 sm:col-span-1")}
        />
        <label className="sr-only" htmlFor="cc-exp">
          Срок действия
        </label>
        <input
          id="cc-exp"
          value={expDigits.length > 2 ? `${expDigits.slice(0, 2)}/${expDigits.slice(2)}` : expDigits}
          onChange={(e) => setExp(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="ММ/ГГ"
          aria-invalid={touched && !!expErr}
          className={cn(inputCls, "col-span-2 sm:col-span-1")}
        />
        <label className="sr-only" htmlFor="cc-cvc">
          CVC
        </label>
        <input
          id="cc-cvc"
          type="password"
          value={cvc}
          onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="CVC"
          aria-invalid={touched && !!cvcErr}
          className={inputCls}
        />
      </div>
      <p className={cn("mt-1.5 text-xs", touched && err ? "text-bad" : "text-fg-3")}>
        {touched && err ? (
          err
        ) : (
          <>
            Магазин не видит данные карты. Дальше банк попросит подтвердить платёж — <span className="whitespace-nowrap">3-D Secure</span>.
          </>
        )}
      </p>
      <button
        type="submit"
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white text-[15px] font-semibold text-canvas transition-colors hover:bg-azure-50 active:translate-y-px"
      >
        <Lock className="size-4" /> Оплатить {formatMoney(total)}
      </button>
    </form>
  );
}

function StepDots({ step }: { step: Step }) {
  const idx = step === "details" ? 0 : step === "pay" ? 1 : 2;
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1" aria-label={`Шаг ${idx + 1} из 3`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("h-1 rounded-full transition-all duration-200", i === idx ? "w-4 bg-azure-400" : i < idx ? "w-1.5 bg-azure-400/60" : "w-1.5 bg-white/15")} />
      ))}
    </div>
  );
}

function DeliveryRow({ done, active, title, detail, meta, last }: { done: boolean; active: boolean; title: string; detail: string; meta: string; last?: boolean }) {
  return (
    <li className="relative grid grid-cols-[20px_1fr_auto] gap-x-3 pb-3">
      {!last ? <span aria-hidden className={cn("absolute top-5 bottom-0 left-[9.5px] w-px", done ? "bg-ok/40" : "bg-line")} /> : null}
      <span
        className={cn(
          "relative z-10 mt-0.5 flex size-5 items-center justify-center rounded-full border transition-colors duration-200",
          done ? "border-ok/40 bg-ok-soft text-ok" : active ? "border-azure-400/50 bg-azure-500/15 text-azure-300" : "border-line bg-surface-2 text-fg-4",
        )}
      >
        {done ? <Check className="size-3" strokeWidth={3} /> : active ? <Loader2 className="size-3 animate-spin" /> : <span className="size-1 rounded-full bg-current" />}
      </span>
      <div className="min-w-0">
        <p className={cn("text-[13.5px] leading-6", done || active ? "text-fg" : "text-fg-3")}>{title}</p>
        <p className="truncate text-[12px] text-fg-3">{detail}</p>
      </div>
      <span className={cn("pt-0.5 font-mono text-[11px] nums", done ? "text-fg-3" : "text-fg-4")}>{done ? meta : "—"}</span>
    </li>
  );
}

/** "Frost+ подписка" → "Frost+" */
function subscriptionName(p: StoreProduct) {
  return p.name.replace(/\s*подписка$/i, "");
}

function successLine(p: StoreProduct, gift: boolean, recipient: string) {
  if (gift) return `Подарок у ${recipient} — он увидит его при входе на сервер`;
  switch (p.kind) {
    case "rank":
      return `Зайдите на сервер — привилегия ${p.name} уже действует`;
    case "subscription": {
      const name = subscriptionName(p);
      return `Подписка ${name} оформлена — ${name.replace(/\+$/, "")} уже действует`;
    }
    case "currency":
      return `Зайдите на сервер — ${p.name} уже на балансе`;
    case "case":
      return "Зайдите на сервер — ключи ждут в /cases";
    case "kit":
      return "Зайдите на сервер — набор уже в инвентаре";
    case "unban":
      return "Ограничение снято — можно заходить";
    case "pool":
      return "Взнос учтён — бустер включится, когда соберём сумму";
    default:
      return `Зайдите на сервер — «${p.name}» уже можно включить`;
  }
}

/** Big title of the in-game toast: «Кейс «Ледяной»» → ЛЕДЯНОЙ, «1 000 снежинок» → +1 000. */
function gameTitle(p: StoreProduct): { title: string; sub: string | null } {
  if (p.kind === "pool") return { title: "Спасибо", sub: null };
  if (p.kind === "currency") {
    const m = p.name.match(/^([\d\s  ]+)\s*(.*)$/);
    if (m) return { title: `+${m[1].trim()}`, sub: m[2] ? `${m[2]} на балансе` : "на балансе" };
  }
  if (p.kind === "subscription") return { title: subscriptionName(p), sub: "подписка · каждый месяц" };
  const quoted = p.name.match(/«([^»]+)»/);
  if (quoted) return { title: quoted[1], sub: null };
  const keys = p.name.match(/^Набор ключей\s+(.+)$/);
  if (keys) return { title: `Ключи ${keys[1]}`, sub: null };
  return { title: p.name.replace(/\s+на выбор$/i, ""), sub: null };
}

/** What the player will see in game: title + chat lines, in the store's palette. */
function GamePreview({
  product,
  recipient,
  buyer,
  gift,
  storeName,
  amount,
}: {
  product: StoreProduct;
  recipient: string;
  buyer: string;
  gift: boolean;
  storeName: string;
  amount: number;
}) {
  const isPool = product.kind === "pool";
  const { title, sub } = gameTitle(product);
  const size = title.length <= 9 ? "text-[28px]" : title.length <= 14 ? "text-[22px]" : "text-[18px]";
  return (
    <div className="relative mt-4 overflow-hidden rounded-lg border border-line bg-[linear-gradient(180deg,#0d1a3d_0%,#0a1328_55%,#070a10_100%)]">
      <div className="absolute inset-0 bg-grid-sm opacity-40" aria-hidden />
      <div className="relative px-4 pt-5 pb-3 text-center">
        <p className={cn("font-display leading-none font-bold tracking-[0.04em] text-ice-200 uppercase drop-shadow-[0_2px_0_rgb(0_0_0/0.6)]", size)}>{title}</p>
        <p className="mt-1.5 font-mono text-[12px] text-fg-2 drop-shadow-[0_1px_0_rgb(0_0_0/0.6)]">
          {isPool ? `взнос ${formatMoney(amount)} учтён` : (sub ?? durationLabel(product) ?? "выдано")}
        </p>
      </div>
      <div className="relative space-y-0.5 bg-black/35 px-3 py-2 font-mono text-[11.5px] leading-[1.55]">
        <p className="truncate">
          <span className="text-ice-300">[{storeName}]</span>{" "}
          <span className="text-fg-2">
            {gift ? `${buyer} подарил ${recipient}: ${product.name}` : `${recipient} поддержал сервер: ${product.name}`}
          </span>
        </p>
        <p className="truncate text-azure-200">
          <span className="text-fg-4">→ </span>
          {isPool ? "Собрали ещё немного — следите за прогрессом в /pool" : "Спасибо! Покупка уже у вас"}
        </p>
      </div>
    </div>
  );
}
