import * as React from "react";
import Link from "next/link";
import { Check, ChevronDown, Clock3, Gift, MessageCircle, Send, Server, Users } from "lucide-react";
import { cn, createRng } from "@/lib/utils";
import { formatDateTime, formatMoney, formatNumber, formatRelative, pluralize, typo } from "@/lib/format";
import { PixelAvatar } from "@/components/ui/avatar";
import { StatusDot } from "@/components/ui/status-dot";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LogoMark } from "@/components/brand/logo";
import { ProductArt } from "./art";
import { CaseOddsButton } from "./odds";
import { NICK_RE } from "./nickname";
import type { StoreData, StoreDensity, StoreProduct, StorePurchase, StoreServer, StoreTheme } from "./types";

/* ───────────── Background ───────────── */

export function StoreBackdrop({ theme }: { theme: StoreTheme }) {
  if (theme.background === "solid") return null;
  if (theme.background === "grid") {
    return <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-grid mask-fade-b" />;
  }
  const rng = createRng(1106);
  const cells = Array.from({ length: 70 }, () => ({
    x: Math.floor(rng() * 75),
    y: Math.floor(rng() * 28),
    o: 0.08 + rng() * 0.3,
  }));
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[560px] w-full mask-fade-b"
      viewBox="0 0 75 28"
      preserveAspectRatio="xMidYMin slice"
      shapeRendering="crispEdges"
    >
      {cells.map((c, i) => (
        <rect key={i} x={c.x + 0.12} y={c.y + 0.12} width={0.76} height={0.76} fill="var(--st-accent)" opacity={c.o} />
      ))}
    </svg>
  );
}

/* ───────────── Top section ───────────── */

export function NicknameCard({
  nick,
  onNick,
  storeName,
  platformHint = "Java и Bedrock",
}: {
  nick: string;
  onNick: (v: string) => void;
  storeName: string;
  platformHint?: string;
}) {
  const invalid = nick.length > 0 && !NICK_RE.test(nick);
  return (
    <div className="rounded-(--st-r-card) border border-white/[0.08] bg-surface/80 p-4 shadow-raise @lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="store-nick" className="text-[13px] font-medium text-fg">
          Ваш ник в игре
        </label>
        <span className="label-mono text-[10px] text-fg-4">{platformHint}</span>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <PixelAvatar name={nick || storeName} size={40} className="rounded-(--st-r-ctl)" />
        <input
          id="store-nick"
          value={nick}
          onChange={(e) => onNick(e.target.value.replace(/\s+/g, "").slice(0, 16))}
          placeholder="например, kotik228"
          autoComplete="nickname"
          spellCheck={false}
          aria-invalid={invalid}
          aria-describedby="store-nick-hint"
          className="h-10 min-w-0 flex-1 rounded-(--st-r-ctl) border border-white/[0.1] bg-[#070a12] px-3 font-mono text-[14px] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-fg-4 hover:border-white/[0.16] focus:border-(--st-accent) focus:shadow-[0_0_0_3px_var(--st-accent-soft)] aria-[invalid=true]:border-bad/60"
        />
      </div>
      <p id="store-nick-hint" className={cn("mt-2 flex items-center gap-1.5 text-xs", invalid ? "text-bad" : nick ? "text-ok" : "text-fg-3")}>
        {invalid ? (
          "3–16 символов: латиница, цифры и _"
        ) : nick ? (
          <>
            <Check className="size-3.5" /> Покупки придут игроку <span className="font-mono">{nick}</span> — ник запомнили
          </>
        ) : (
          "Покупки придут этому игроку. Ник запомним на этом устройстве."
        )}
      </p>
    </div>
  );
}

export function GoalWidget({ goal }: { goal: NonNullable<StoreData["goal"]> }) {
  const pct = Math.round((goal.raised / goal.target) * 100);
  const segments = 24;
  const lit = Math.round((goal.raised / goal.target) * segments);
  return (
    <div className="rounded-(--st-r-card) border border-white/[0.08] bg-surface/80 p-4 shadow-raise @lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="label-mono text-[10.5px] text-(--st-accent-text)">Цель месяца</p>
        <p className="font-mono text-[11px] text-fg-3 nums">
          ещё {pluralize(goal.daysLeft, ["день", "дня", "дней"])}
        </p>
      </div>
      <p className="mt-2 text-[15px] font-medium tracking-[-0.01em] text-fg">{goal.title}</p>
      <p className="mt-3 flex items-baseline gap-1.5 font-mono nums">
        <span className="text-[26px] leading-none font-semibold tracking-[-0.03em] text-fg">{formatNumber(goal.raised)}</span>
        <span className="text-[13px] text-fg-3">из {formatMoney(goal.target)}</span>
      </p>
      <div className="mt-3 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[3px]" role="progressbar" aria-valuenow={goal.raised} aria-valuemax={goal.target} aria-label="Прогресс цели">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn("h-2.5 rounded-[2px]", i < lit ? "bg-(--st-accent)" : "bg-white/[0.07]", i === lit - 1 && "shadow-[0_0_10px_var(--st-accent-ring)]")}
          />
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between text-xs text-fg-3">
        <span>
          <span className="font-mono text-fg-2 nums">{pct} %</span> · осталось {formatMoney(goal.target - goal.raised)}
        </span>
        <span className="hidden @sm:inline">каждая покупка идёт в цель</span>
      </div>
    </div>
  );
}

export function ServersCard({ servers }: { servers: StoreServer[] }) {
  if (servers.length === 0) return null;
  return (
    <div className="rounded-(--st-r-card) border border-white/[0.08] bg-surface/60 px-4 py-3">
      <p className="label-mono flex items-center gap-1.5 text-[10px] text-fg-4">
        <Server className="size-3" /> Серверы сети
      </p>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {servers.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-2 text-[12.5px]">
            <span className="flex min-w-0 items-center gap-1.5 text-fg-2">
              <StatusDot tone={s.status === "online" ? "ok" : s.status === "degraded" ? "warn" : "idle"} className="size-1.5" />
              <span className="truncate">{s.name}</span>
            </span>
            <span className="font-mono text-[11.5px] text-fg-3 nums">{s.status === "offline" ? "техработы" : formatNumber(s.online)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RecentTicker({ items, now }: { items: StorePurchase[]; now: number }) {
  if (items.length === 0) return null;
  const row = (dup: boolean) =>
    items.map((p) => (
      <li key={`${dup ? "d" : "o"}-${p.id}`} aria-hidden={dup || undefined} className="flex shrink-0 items-center gap-2 pr-7 text-[12.5px]">
        <PixelAvatar name={p.player} size={18} />
        <span className="font-mono text-fg">{p.player}</span>
        {p.gift ? <Gift className="size-3 text-(--st-accent-text)" aria-label="подарок" /> : null}
        <span className="text-fg-3">купил</span>
        <span className="text-fg-2">{p.product}</span>
        <span className="font-mono text-[11px] text-fg-4">{formatRelative(p.at, now)}</span>
      </li>
    ));
  return (
    <div className="flex items-center overflow-hidden rounded-(--st-r-card) border border-white/[0.08] bg-surface/60">
      <p className="label-mono flex h-11 shrink-0 items-center gap-2 border-r border-white/[0.06] px-3.5 text-[10.5px] text-fg-2">
        <StatusDot tone="ok" pulse className="size-1.5" />
        <span className="hidden @md:inline">Только что купили</span>
        <span className="@md:hidden">Купили</span>
      </p>
      <div className="group/ticker min-w-0 flex-1 overflow-hidden mask-fade-x">
        <ul className="flex w-max animate-marquee items-center py-3 pl-4 group-hover/ticker:[animation-play-state:paused]">
          {row(false)}
          {row(true)}
        </ul>
      </div>
    </div>
  );
}

/* ───────────── Products ───────────── */

export function durationLabel(p: Pick<StoreProduct, "durationDays" | "kind">) {
  if (p.durationDays === null) return "навсегда";
  if (typeof p.durationDays === "number") {
    const base = pluralize(p.durationDays, ["день", "дня", "дней"]);
    return p.kind === "subscription" ? "каждый месяц" : base;
  }
  return null;
}

const BADGE: Record<NonNullable<StoreProduct["badge"]>, { label: string; cls: string }> = {
  hit: { label: "Хит", cls: "bg-white text-canvas" },
  new: { label: "Новинка", cls: "bg-ice-300 text-canvas" },
  sale: { label: "Скидка", cls: "bg-azure-500 text-white" },
  limited: { label: "Лимит", cls: "bg-warn text-canvas" },
};

function BadgeTag({ p }: { p: StoreProduct }) {
  if (!p.badge) return null;
  const b = BADGE[p.badge];
  const off = p.badge === "sale" && p.oldPrice ? ` −${Math.round((1 - p.price / p.oldPrice) * 100)} %` : "";
  return <span className={cn("shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10.5px] leading-none font-semibold whitespace-nowrap", b.cls)}>{b.label + off}</span>;
}

export function BuyButton({ onClick, children, className, disabled }: { onClick?: () => void; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-(--st-r-ctl) bg-(--st-accent) px-3.5 text-[13px] font-semibold text-(--st-on-accent) shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.4)] transition-[background-color,transform] duration-150 hover:bg-(--st-accent-hover) active:translate-y-px disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ProductCard({ p, density, onBuy }: { p: StoreProduct; density: StoreDensity; onBuy: (p: StoreProduct) => void }) {
  const dur = durationLabel(p);
  if (density === "compact") return <CompactCard p={p} dur={dur} onBuy={onBuy} />;
  return (
    <>
      {/* narrow containers: list row instead of a tall card — perks stay one tap away */}
      <CompactCard p={p} dur={dur} onBuy={onBuy} withPerks className="@md:hidden" />
      <TallCard p={p} dur={dur} onBuy={onBuy} className="hidden @md:flex" />
    </>
  );
}

function CompactCard({
  p,
  dur,
  onBuy,
  withPerks = false,
  className,
}: {
  p: StoreProduct;
  dur: string | null;
  onBuy: (p: StoreProduct) => void;
  withPerks?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const perksId = React.useId();
  const canExpand = withPerks && p.perks.length > 0;
  return (
    <article className={cn("group rounded-(--st-r-card) border border-white/[0.08] bg-surface/80 p-2.5 transition-colors hover:border-white/[0.16]", className)}>
      <div className="flex items-center gap-3">
        <ProductArt p={p} size="md" className="size-14 self-start" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <h4 className="line-clamp-2 text-[14px] leading-tight font-semibold tracking-[-0.01em] text-fg">{p.name}</h4>
            <BadgeTag p={p} />
          </div>
          <p className="mt-0.5 truncate text-xs text-fg-3">
            {withPerks && p.perks.length ? [dur, ...p.perks.slice(0, 2)].filter(Boolean).join(" · ") : (dur ?? p.description)}
          </p>
          <p className="mt-1 flex items-baseline gap-1.5 font-mono nums">
            <span className="text-[14px] font-semibold text-fg">{formatMoney(p.price)}</span>
            {p.oldPrice ? <s className="text-[11.5px] text-fg-4">{formatMoney(p.oldPrice)}</s> : null}
          </p>
        </div>
        <BuyButton onClick={() => onBuy(p)} className="h-8 px-3">
          Купить
        </BuyButton>
      </div>
      {canExpand || (withPerks && p.kind === "case") ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[68px]">
          {canExpand ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={perksId}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-7 items-center gap-1 rounded-(--st-r-ctl) border border-white/[0.1] px-2 text-[12px] font-medium text-fg-2 transition-colors hover:border-white/[0.2] hover:text-fg"
            >
              Что входит
              <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
            </button>
          ) : null}
          {withPerks && p.kind === "case" ? <CaseOddsButton productId={p.id} name={p.name} /> : null}
        </div>
      ) : null}
      {canExpand && open ? (
        <div id={perksId} className="mt-2 border-t border-white/[0.06] pt-2 pl-[68px]">
          <p className="text-[12.5px] leading-snug text-fg-3">{p.description}</p>
          <PerkList perks={p.perks} className="mt-2" />
        </div>
      ) : null}
    </article>
  );
}

function PerkList({ perks, className }: { perks: string[]; className?: string }) {
  return (
    <ul className={cn("grid gap-1", className)}>
      {perks.map((perk) => (
        <li key={perk} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-fg-2">
          <Check className="mt-[3px] size-3 shrink-0 text-(--st-accent-text)" strokeWidth={2.5} />
          {perk}
        </li>
      ))}
    </ul>
  );
}

function TallCard({ p, dur, onBuy, className }: { p: StoreProduct; dur: string | null; onBuy: (p: StoreProduct) => void; className?: string }) {
  return (
    <article className={cn("group flex flex-col rounded-(--st-r-card) border border-white/[0.08] bg-surface/80 p-2 shadow-raise transition-[border-color,transform] duration-200 hover:border-white/[0.16]", className)}>
      <div className="relative">
        <ProductArt p={p} />
        <span className="absolute right-2.5 bottom-2.5">
          <BadgeTag p={p} />
        </span>
      </div>
      <div className="flex flex-1 flex-col px-2 pt-3 pb-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="truncate text-[15px] font-semibold tracking-[-0.015em] text-fg">{p.name}</h4>
          {dur ? <span className="shrink-0 font-mono text-[11px] text-fg-3">{dur}</span> : null}
        </div>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-fg-3">{p.description}</p>
        {p.perks.length ? <PerkList perks={p.perks} className="mt-2.5" /> : null}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <p className="flex flex-col font-mono leading-tight nums">
            {p.oldPrice ? <s className="text-[11.5px] text-fg-4">{formatMoney(p.oldPrice)}</s> : null}
            <span className="text-[18px] font-semibold tracking-[-0.02em] text-fg">{formatMoney(p.price)}</span>
          </p>
          <span className="flex items-center gap-1.5">
            {p.kind === "case" ? <CaseOddsButton productId={p.id} name={p.name} className="h-9" /> : null}
            <BuyButton onClick={() => onBuy(p)}>Купить</BuyButton>
          </span>
        </div>
      </div>
    </article>
  );
}

export function PoolCard({ p, now, onBuy }: { p: StoreProduct; now: number; onBuy: (p: StoreProduct) => void }) {
  const pool = p.pool;
  if (!pool) return null;
  const pct = Math.round((pool.raised / pool.target) * 100);
  const rest = pool.contributors - pool.names.length;
  return (
    <article className="flex flex-col gap-4 rounded-(--st-r-card) border border-white/[0.08] bg-surface/80 p-4 shadow-raise @lg:flex-row @lg:items-stretch @lg:p-5">
      <ProductArt p={p} size="md" className="size-16 @lg:size-20" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-mono text-[10px] text-(--st-accent-text)">Складчина</span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-fg-3">
            <Clock3 className="size-3" /> до {formatDateTime(pool.endsAt)} · {formatRelative(pool.endsAt, now)}
          </span>
        </div>
        <h4 className="mt-1.5 text-[15px] font-semibold tracking-[-0.015em] text-fg">{p.name}</h4>
        <p className="mt-1 text-[12.5px] leading-snug text-fg-3">{p.description}</p>
        <div className="mt-3.5 flex items-baseline justify-between gap-3 font-mono nums">
          <span className="text-[13px] text-fg-2">
            <span className="text-[17px] font-semibold text-fg">{formatNumber(pool.raised)}</span> из {formatMoney(pool.target)}
          </span>
          <span className="text-[12px] text-fg-3">{pct} %</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-(--st-accent)" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex -space-x-1.5">
              {pool.names.map((n) => (
                <PixelAvatar key={n} name={n} size={22} className="ring-2 ring-surface" />
              ))}
            </span>
            <span className="text-xs text-fg-3">
              {rest > 0 ? `+${rest} · ` : ""}
              <Users className="mb-px inline size-3" /> {pluralize(pool.contributors, ["участник", "участника", "участников"])}
            </span>
          </div>
          <BuyButton onClick={() => onBuy(p)}>Внести от {formatMoney(pool.minContribution)}</BuyButton>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, density, onBuy }: { products: StoreProduct[]; density: StoreDensity; onBuy: (p: StoreProduct) => void }) {
  return (
    <div
      className={cn(
        "grid gap-3",
        density === "comfortable" ? "grid-cols-1 @md:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4" : "grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-3",
      )}
    >
      {products.map((p) => (
        <ProductCard key={p.id} p={p} density={density} onBuy={onBuy} />
      ))}
    </div>
  );
}

/* ───────────── Info blocks ───────────── */

const RULES = [
  { t: "Проверьте ник перед оплатой", d: "Покупка привязывается к нику. Регистр не важен, но Kotik228 и kotik_228 — разные игроки." },
  { t: "Если вы не в игре — подождём", d: "Выдадим при следующем входе на любой сервер сети. Заказ никуда не денется." },
  { t: "Сроки суммируются", d: "Повторная покупка привилегии продлевает текущий срок, а не сбрасывает его." },
  { t: "Разбан не действует на читы", d: "Бан за читы и обход блокировок не снимается. Деньги за такой разбан вернём." },
  { t: "Шансы кейсов открыты", d: "Вероятность каждой награды — по кнопке «Шансы» на карточке кейса. Меняем только с объявлением." },
  { t: "Не пришло за 15 минут", d: "Напишите в поддержку номер заказа из письма — проверим трассу выдачи и решим вопрос." },
].map((r) => ({ t: typo(r.t), d: typo(r.d) }));

export function RulesBlock() {
  return (
    <section id="rules" className="scroll-mt-24">
      <BlockHeading eyebrow="Правила" title="Коротко о покупках" sub="Шесть пунктов, которые экономят время и вам, и поддержке." />
      <ol className="grid gap-px overflow-hidden rounded-(--st-r-card) border border-white/[0.08] bg-white/[0.06] @2xl:grid-cols-2 @5xl:grid-cols-3">
        {RULES.map((r, i) => (
          <li key={r.t} className="bg-[#080b14] p-4 @lg:p-5">
            <p className="font-mono text-[11px] text-fg-4 nums">{String(i + 1).padStart(2, "0")}</p>
            <p className="mt-2 text-[14px] font-medium text-fg">{r.t}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-3">{r.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const FAQ = [
  { q: "Оплатил, но в игре ничего не появилось", a: "Обычно выдача занимает меньше секунды. Если вы были офлайн — зайдите на сервер, покупка придёт при входе. Если прошло больше 15 минут, напишите в поддержку номер заказа из письма." },
  { q: "Можно оплатить с баланса телефона?", a: "Да: МТС, Билайн, МегаФон и T2. Оператор добавляет свою комиссию — сумму с ней он пришлёт в SMS до списания. Без комиссии — через СБП." },
  { q: "Как подарить привилегию другу?", a: "При оформлении включите «Подарить другу» и укажите его ник. Покупка придёт другу, а в чате сервера напишем, от кого подарок." },
  { q: "Как отменить подписку?", a: "Ссылка на отмену — в каждом письме о списании. После отмены привилегия работает до конца оплаченного месяца." },
  { q: "Нужен ли чек?", a: "Чек формируется автоматически. Укажите email при оплате — пришлём копию туда." },
  { q: "Можно вернуть деньги?", a: "Если покупку не выдали — вернём полностью. Если выдали и вы ей пользовались, возврат решает администрация сервера по правилам магазина." },
].map((f) => ({ q: f.q, a: typo(f.a) }));

export const RULES_COUNT = RULES.length;
export const FAQ_COUNT = FAQ.length;

export function FaqBlock() {
  return (
    <section id="faq" className="scroll-mt-24">
      <BlockHeading eyebrow="FAQ" title="Частые вопросы" />
      <Accordion type="single" collapsible className="rounded-(--st-r-card) border border-white/[0.08] bg-surface/60 px-4 @lg:px-5">
        {FAQ.map((f, i) => (
          <AccordionItem key={f.q} value={`q${i}`} className={cn("border-white/[0.06]", i === FAQ.length - 1 && "border-b-0")}>
            <AccordionTrigger className="py-4 text-[14px] sm:text-[14px]">{f.q}</AccordionTrigger>
            <AccordionContent className="pb-4 text-[13px] text-fg-3">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function BlockHeading({ eyebrow, title, sub, aside }: { eyebrow: string; title: string; sub?: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="label-mono text-[10.5px] text-(--st-accent-text)">{eyebrow}</p>
        <h2 className="mt-1.5 font-display text-[22px] leading-tight font-semibold tracking-[-0.03em] text-fg @3xl:text-[26px]">{title}</h2>
        {sub ? <p className="mt-1 text-[13px] text-fg-3">{sub}</p> : null}
      </div>
      {aside}
    </div>
  );
}

/* ───────────── Footer ───────────── */

export function StoreFooter({ data }: { data: StoreData }) {
  return (
    <footer className="mt-16 border-t border-white/[0.06] bg-[#04060a]">
      <div id="support" className="mx-auto grid max-w-[1200px] scroll-mt-24 gap-8 px-4 py-10 @3xl:grid-cols-[1.2fr_1fr_1fr] @3xl:px-8">
        <div>
          <p className="label-mono text-[10.5px] text-fg-4">Поддержка</p>
          <p className="mt-2 text-[15px] font-medium text-fg">Что-то не пришло? Ответим в среднем за 12&nbsp;минут.</p>
          <p className="mt-1 text-[12.5px] text-fg-3">Укажите номер заказа PMC-… из письма — по нему видно каждый шаг выдачи.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="https://t.me/arcticmc_help"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-(--st-r-ctl) border border-white/[0.1] px-3 text-[12.5px] text-fg-2 transition-colors hover:border-white/[0.2] hover:text-fg"
            >
              <Send className="size-3.5" /> Telegram · @arcticmc_help
            </a>
            <a
              href="https://vk.me/arcticmc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-(--st-r-ctl) border border-white/[0.1] px-3 text-[12.5px] text-fg-2 transition-colors hover:border-white/[0.2] hover:text-fg"
            >
              <MessageCircle className="size-3.5" /> VK · vk.me/arcticmc
            </a>
          </div>
        </div>
        <div className="text-[12.5px]">
          <p className="label-mono text-[10.5px] text-fg-4">Документы</p>
          <ul className="mt-2 grid gap-1.5 text-fg-3">
            {[
              { href: "/legal#players", label: "Оферта для игроков" },
              { href: "/legal#refunds", label: "Возвраты и отмена покупки" },
              { href: "/legal#privacy", label: "Политика конфиденциальности" },
            ].map((d) => (
              <li key={d.href}>
                <Link href={d.href} target="_blank" rel="noopener" className="transition-colors hover:text-fg">
                  {d.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-[12px] leading-relaxed text-fg-4">
          <p className="label-mono text-[10.5px] text-fg-4">Оператор платежей</p>
          <p className="mt-2 text-fg-3">ООО «ПэйЭмСи Процессинг»</p>
          <p>ИНН 7700000000 · ОГРН 1267700000000</p>
          <p>Москва, ул. Примерная, д. 1 — демо-реквизиты</p>
          <p className="mt-1">Продавец — владелец проекта {data.name}, самозанятый, чеки НПД</p>
        </div>
      </div>
      <div className="border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-[12px] text-fg-4 @3xl:px-8">
          <span>
            © {new Date(data.now).getUTCFullYear()} {data.name}.{data.game === "minecraft" ? " Проект не связан с Mojang и Microsoft." : ""}
          </span>
          <Link href="/" className="inline-flex items-center gap-1.5 text-fg-3 transition-colors hover:text-fg">
            <LogoMark size={14} /> Магазин работает на PayMC
          </Link>
        </div>
      </div>
    </footer>
  );
}
