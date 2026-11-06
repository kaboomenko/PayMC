"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RadioGroup } from "radix-ui";
import { ArrowLeft, Check, Gift, Loader2, Lock, Smartphone, TicketPercent, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/payments";
import type { PaymentMethod } from "@/lib/mock/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/ui/copy-button";
import { Kbd } from "@/components/ui/kbd";
import { ProductArt } from "./art";
import { SbpQr } from "./sbp-qr";
import { NICK_RE, nickError } from "./nickname";
import { durationLabel } from "./store-sections";
import type { StoreData, StoreProduct, StorePromo } from "./types";

const LIVE: PaymentMethod[] = ["sbp", "card", "sberpay", "tpay", "yoomoney", "mobile"];
const SOON: PaymentMethod[] = ["kaspi", "erip", "intl_card"];

const HINT: Partial<Record<PaymentMethod, string>> = {
  sbp: "QR-код или переход в банк · без комиссии",
  card: "Мир и карты российских банков, 3-D Secure",
  sberpay: "Подтверждение в СберБанк Онлайн",
  tpay: "Подтверждение в приложении Т-Банка",
  yoomoney: "Кошелёк или привязанная карта",
  mobile: PAYMENT_METHODS.mobile.note,
  kaspi: "KZ",
  erip: "BY",
  intl_card: "Visa/MC",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 400 → "0,4 с" — delivery time reads better in seconds for players */
export function formatSeconds(ms: number) {
  return `${formatNumber(ms / 1000, 1)} с`;
}

type Step = "details" | "pay" | "done";

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[520px] overflow-y-auto">
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
  const poolRest = product.pool ? product.pool.target - product.pool.raised : 0;
  const minAmount = product.pool?.minContribution ?? 50;

  const [step, setStep] = React.useState<Step>("details");
  const [gift, setGift] = React.useState(false);
  const [friend, setFriend] = React.useState("");
  const [promoInput, setPromoInput] = React.useState("");
  const [promo, setPromo] = React.useState<StorePromo | null>(null);
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [method, setMethod] = React.useState<PaymentMethod>("sbp");
  const [email, setEmail] = React.useState("");
  const [amount, setAmount] = React.useState(Math.min(Math.max(minAmount, 100), poolRest || 100));
  const [touched, setTouched] = React.useState(false);
  const [delivered, setDelivered] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);
  const timers = React.useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  React.useEffect(() => clearTimers, []);

  const base = isPool ? amount : product.price;
  const discount = promo ? (promo.kind === "percent" ? Math.round((base * promo.value) / 100) : Math.min(base, promo.value)) : 0;
  const total = Math.max(0, base - discount);

  const nickErr = nickError(nick);
  const friendErr = gift ? (friend ? (NICK_RE.test(friend) ? null : "3–16 символов: латиница, цифры и _") : "Укажите ник друга") : null;
  const emailErr = email && !EMAIL_RE.test(email) ? "Проверьте адрес — в нём опечатка" : null;
  const amountErr = isPool && (amount < minAmount || amount > poolRest) ? `От ${formatMoney(minAmount)} до ${formatMoney(poolRest)}` : null;
  const valid = !nickErr && !friendErr && !emailErr && !amountErr;
  const recipient = gift ? friend : nick;
  const orderNo = `PMC-${105_000 + (hashStr(product.id + recipient) % 900)}`;

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const found = data.promos.find((p) => p.code === code);
    if (!found) {
      setPromo(null);
      setPromoError("Такого промокода нет или он закончился");
      return;
    }
    if (found.minAmount && base < found.minAmount) {
      setPromo(null);
      setPromoError(`Действует на заказ от ${formatMoney(found.minAmount)}`);
      return;
    }
    setPromo(found);
    setPromoError(null);
  }

  function pay(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    clearTimers();
    setStep("pay");
    setElapsed(0);
    const wait = method === "sbp" ? 3600 : 2400;
    if (method === "sbp") {
      for (let s = 1; s <= 3; s++) timers.current.push(window.setTimeout(() => setElapsed(s), s * 1000));
    }
    timers.current.push(window.setTimeout(startDelivery, reduce ? 300 : wait));
  }

  function startDelivery() {
    setStep("done");
    setDelivered(0);
    if (reduce) {
      setDelivered(3);
      return;
    }
    [250, 650, 1050].forEach((t, i) => timers.current.push(window.setTimeout(() => setDelivered(i + 1), t)));
  }

  function back() {
    clearTimers();
    setStep("details");
  }

  const methodLabel = PAYMENT_METHODS[method].label;

  return (
    <div>
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-4 pr-12">
        <ProductArt id={product.id} glyph={product.glyph} tint={product.tint} size="sm" />
        <div className="min-w-0">
          <DialogTitle className="truncate pr-0 text-[15px]">{product.name}</DialogTitle>
          <DialogDescription className="mt-0.5 truncate text-xs">
            {isPool ? "Складчина · взнос" : (durationLabel(product) ?? "мгновенная выдача")} · {data.name}
          </DialogDescription>
        </div>
        <StepDots step={step} />
      </div>

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
            <div className="grid gap-5 px-5 py-5">
              {isPool ? (
                <fieldset>
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
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="co-nick" className="text-[13px] font-medium text-fg-2">
                    {gift ? "Ваш ник — от кого подарок" : "Ник в игре"}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-fg-2 select-none">
                    <Gift className="size-3.5 text-fg-3" />
                    Подарить другу
                    <Switch size="sm" checked={gift} onCheckedChange={setGift} aria-label="Подарить другу" />
                  </label>
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
                <div className="grid gap-2">
                  <label htmlFor="co-promo" className="text-[13px] font-medium text-fg-2">
                    Промокод
                  </label>
                  {promo ? (
                    <div className="flex h-9 items-center justify-between rounded-md border border-ok/25 bg-ok-soft px-3">
                      <span className="flex items-center gap-2 text-[13px] text-ok">
                        <TicketPercent className="size-4" />
                        <span className="font-mono">{promo.code}</span>
                        <span className="text-ok/80">
                          {promo.kind === "percent" ? `−${promo.value} %` : `−${formatMoney(promo.value)}`}
                        </span>
                      </span>
                      <button
                        type="button"
                        aria-label="Убрать промокод"
                        onClick={() => {
                          setPromo(null);
                          setPromoInput("");
                        }}
                        className="rounded-sm p-1 text-ok/80 transition-colors hover:bg-white/5 hover:text-ok"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
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
                        className={cn(inputCls, "uppercase")}
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
                  {promoError ? (
                    <p id="co-promo-err" className="text-xs text-bad">
                      {promoError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* methods */}
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-[13px] font-medium text-fg-2">Способ оплаты</legend>
                <RadioGroup.Root value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="grid gap-1.5" aria-label="Способ оплаты">
                  {LIVE.map((m) => (
                    <MethodOption key={m} m={m} active={method === m} />
                  ))}
                  <div className="mt-1 grid grid-cols-3 gap-1.5">
                    {SOON.map((m) => (
                      <RadioGroup.Item
                        key={m}
                        value={m}
                        disabled
                        className="flex cursor-not-allowed flex-col items-start rounded-md border border-dashed border-line px-2.5 py-1.5 text-left opacity-60"
                      >
                        <span className="text-[12.5px] font-medium text-fg-2">{PAYMENT_METHODS[m].label}</span>
                        <span className="label-mono text-[9.5px] text-fg-4">скоро · {HINT[m]}</span>
                      </RadioGroup.Item>
                    ))}
                  </div>
                </RadioGroup.Root>
              </fieldset>

              {/* email */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
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

            {/* total */}
            <div className="border-t border-line bg-surface-2/60 px-5 py-4">
              <dl className="grid gap-1 text-[13px]">
                <div className="flex justify-between text-fg-3">
                  <dt>{isPool ? "Взнос" : product.name}</dt>
                  <dd className="font-mono nums">{formatMoney(base)}</dd>
                </div>
                {discount ? (
                  <div className="flex justify-between text-ok">
                    <dt>Промокод {promo?.code}</dt>
                    <dd className="font-mono nums">−{formatMoney(discount)}</dd>
                  </div>
                ) : null}
                <div className="mt-1 flex items-baseline justify-between">
                  <dt className="text-fg">Итого</dt>
                  <dd className="font-mono text-[20px] font-semibold tracking-[-0.02em] text-fg nums">{formatMoney(total)}</dd>
                </div>
              </dl>
              <button
                type="submit"
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white text-[15px] font-semibold text-canvas shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)] transition-[background-color,transform] hover:bg-azure-50 active:translate-y-px"
              >
                <Lock className="size-4" /> Оплатить {formatMoney(total)}
              </button>
              <p className="mt-2 flex items-center justify-between gap-2 text-[11.5px] text-fg-4">
                <span>Нажимая «Оплатить», вы принимаете оферту для игроков</span>
                <span className="hidden items-center gap-1 sm:flex">
                  <Kbd>Enter</Kbd>
                </span>
              </p>
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
              <div className="grid items-center gap-5 sm:grid-cols-[auto_1fr]">
                <div className="mx-auto">
                  <SbpQr seed={hashStr(orderNo)} size={176} />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-fg">Откройте приложение банка</p>
                  <ol className="mt-2 grid gap-1.5 text-[13px] text-fg-2">
                    <li className="flex gap-2">
                      <span className="font-mono text-fg-4">1</span> Наведите камеру на QR-код
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-fg-4">2</span> Проверьте сумму — <span className="font-mono text-fg nums">{formatMoney(total)}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-fg-4">3</span> Подтвердите платёж
                    </li>
                  </ol>
                  <button
                    type="button"
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface-2 px-3 text-[13px] text-fg transition-colors hover:border-line-strong sm:hidden"
                  >
                    <Smartphone className="size-4" /> Открыть банк на этом телефоне
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <Loader2 className="size-6 animate-spin text-azure-300" />
                <p className="mt-3 text-[15px] font-semibold text-fg">Переходим в {methodLabel}</p>
                <p className="mt-1 text-[13px] text-fg-3">Подтвердите оплату {formatMoney(total)} — окно откроется автоматически.</p>
              </div>
            )}
            <div className="mt-5 flex items-center justify-between rounded-md border border-line bg-surface-2/60 px-3 py-2.5">
              <span className="flex items-center gap-2 text-[13px] text-fg-2">
                <Loader2 className="size-3.5 animate-spin text-ice-300" />
                Ждём подтверждение от банка
              </span>
              <span className="font-mono text-[12px] text-fg-3 nums">0:{String(elapsed).padStart(2, "0")}</span>
            </div>
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
                    {email ? (
                      <>
                        Чек отправили на <span className="text-fg-2">{email}</span>.
                      </>
                    ) : (
                      "Чек сформирован — его можно запросить в поддержке по номеру заказа."
                    )}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="flex h-9 flex-1 items-center justify-between gap-1 rounded-md border border-line bg-surface-2 pr-1 pl-3">
                      <span className="font-mono text-[13px] text-fg">{data.address}</span>
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

function MethodOption({ m, active, disabled }: { m: PaymentMethod; active: boolean; disabled?: boolean }) {
  const meta = PAYMENT_METHODS[m];
  return (
    <RadioGroup.Item
      value={m}
      disabled={disabled}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-azure-400",
        active ? "border-azure-400/55 bg-azure-500/[0.08]" : "border-line hover:border-line-strong",
        disabled && "cursor-not-allowed border-line-soft opacity-55 hover:border-line-soft",
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border",
          active ? "border-azure-400 bg-azure-500" : "border-line-strong",
        )}
      >
        <RadioGroup.Indicator className="size-1.5 rounded-full bg-white" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[13px] font-medium text-fg">
          {meta.label}
          {m === "sbp" ? <span className="rounded-[3px] bg-ok-soft px-1 py-px text-[10px] font-semibold text-ok">без комиссии</span> : null}
        </span>
        <span className="block truncate text-[11.5px] text-fg-3">{HINT[m]}</span>
      </span>
      {disabled ? <span className="label-mono text-[9.5px] text-fg-4">скоро</span> : null}
    </RadioGroup.Item>
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

function successLine(p: StoreProduct, gift: boolean, recipient: string) {
  if (gift) return `Подарок у ${recipient} — он увидит его при входе на сервер`;
  switch (p.kind) {
    case "rank":
    case "subscription":
      return `Зайдите на сервер — ${p.name} уже активен`;
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
  const title = isPool ? "СПАСИБО" : product.name.split(" ")[0].toUpperCase();
  return (
    <div className="relative mt-4 overflow-hidden rounded-lg border border-line bg-[linear-gradient(180deg,#0d1a3d_0%,#0a1328_55%,#070a10_100%)]">
      <div className="absolute inset-0 bg-grid-sm opacity-40" aria-hidden />
      <div className="relative px-4 pt-5 pb-3 text-center">
        <p className="font-display text-[28px] leading-none font-bold tracking-[0.04em] text-ice-200 drop-shadow-[0_2px_0_rgb(0_0_0/0.6)]">{title}</p>
        <p className="mt-1.5 font-mono text-[12px] text-fg-2 drop-shadow-[0_1px_0_rgb(0_0_0/0.6)]">
          {isPool ? `взнос ${formatNumber(amount)} ₽ учтён` : (durationLabel(product) ?? "выдано")}
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
