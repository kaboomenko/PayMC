"use client";

import * as React from "react";
import { Check, CircleCheck, Info, ShieldAlert, ShieldCheck, ShieldQuestion, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAY } from "@/lib/mock/now";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ProductArt } from "./product-art";
import { BADGE_META, durationLabel, type ProductBadge } from "./product-meta";
import { uniqueTerms, type RuleHit, type RulesVerdict } from "./rules-check";

export function PreviewCard({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface shadow-raise", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
        <h2 className="label-mono text-[10.5px] text-fg-3">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function StorefrontPreview({
  name,
  category,
  description,
  perks,
  price,
  oldPrice,
  durationDays,
  badge,
  tint,
  glyph,
  domain,
  pool,
}: {
  name: string;
  category: string;
  description: string;
  perks: string[];
  price: number;
  oldPrice?: number;
  durationDays: number | null | undefined;
  badge?: ProductBadge;
  tint: number;
  glyph: string;
  domain: string;
  pool?: { target: number; raised: number; contributors: number; min: number };
}) {
  const discount = oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
  const duration = durationLabel(durationDays);
  const visiblePerks = perks.filter((p) => p.trim()).slice(0, 6);
  return (
    <PreviewCard title="Карточка в магазине" aside={<span className="font-mono text-[10.5px] text-fg-4">{domain}</span>}>
      <div className="bg-canvas/60 p-4">
        <article className="rounded-lg border border-line bg-surface-2/70 p-4">
          <div className="flex items-start gap-3.5">
            <ProductArt tint={tint} glyph={glyph} size={60} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className={cn("text-[15px] leading-snug font-semibold tracking-[-0.01em] break-words", name.trim() ? "text-fg" : "text-fg-4")}>
                  {name.trim() || "Название товара"}
                </p>
                {badge ? (
                  <Badge tone={BADGE_META[badge].tone} className="mt-0.5 shrink-0">
                    {BADGE_META[badge].label}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-fg-3">
                {category}
                {duration ? ` · ${duration}` : ""}
              </p>
            </div>
          </div>
          {description.trim() ? <p className="mt-3 line-clamp-3 text-[12.5px] leading-relaxed text-fg-3">{description}</p> : null}
          {visiblePerks.length ? (
            <ul className="mt-3 space-y-1.5">
              {visiblePerks.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] text-fg-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-azure-300" strokeWidth={2.5} />
                  <span className="min-w-0 break-words">{p}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {pool ? (
            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="text-fg-3">
                  Собрано <span className="font-mono text-fg nums">{formatMoney(pool.raised)}</span> из {formatMoney(pool.target)}
                </span>
                <span className="font-mono text-ice-300 nums">{Math.min(100, Math.round((pool.raised / Math.max(1, pool.target)) * 100))}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-ice-400" style={{ width: `${Math.min(100, (pool.raised / Math.max(1, pool.target)) * 100)}%` }} />
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-3.5">
            <div className="flex items-baseline gap-2">
              {pool ? (
                <span className="text-xs text-fg-3">
                  взнос от <span className="font-mono text-[17px] font-semibold text-fg nums">{formatMoney(pool.min)}</span>
                </span>
              ) : (
                <>
                  <span className={cn("font-mono text-[18px] font-semibold nums", price > 0 ? "text-fg" : "text-fg-4")}>
                    {price > 0 ? formatMoney(price) : "— ₽"}
                  </span>
                  {discount ? (
                    <>
                      <span className="font-mono text-xs text-fg-4 line-through nums">{formatMoney(oldPrice!)}</span>
                      <span className="font-mono text-xs text-ice-300 nums">−{formatPercent(discount, { digits: 0 })}</span>
                    </>
                  ) : null}
                </>
              )}
            </div>
            <span aria-hidden className="inline-flex h-8 items-center rounded-md bg-white px-3.5 text-[13px] font-semibold text-canvas">
              {pool ? "Скинуться" : "Купить"}
            </span>
          </div>
        </article>
      </div>
    </PreviewCard>
  );
}

export function ChatPreview({
  prefix,
  player,
  productName,
  durationDays,
  price,
  message,
  now,
}: {
  prefix: string;
  player: string;
  productName: string;
  durationDays: number | null | undefined;
  price: number;
  message: string;
  now: number;
}) {
  const until =
    durationDays === null ? "навсегда" : durationDays === undefined ? "" : `до ${formatDate(now + durationDays * DAY, { year: false })}`;
  const name = productName.trim() || "товар";
  const personal = message
    .replaceAll("{player}", player)
    .replaceAll("{product}", name)
    .replaceAll("{expires}", until || "сразу");
  const broadcast = price >= 250;
  return (
    <PreviewCard title="Сообщение игроку в чате" aside={<span className="font-mono text-[10.5px] text-fg-4">Minecraft · чат</span>}>
      <div className="relative overflow-hidden bg-[#06080c] px-4 py-3.5">
        <div aria-hidden className="absolute inset-0 bg-grid-sm opacity-40" />
        <div className="relative space-y-1 font-mono text-[12px] leading-[1.6]">
          <p className="text-fg-4">&lt;Steve_Pro&gt; го на арену</p>
          {broadcast ? (
            <p className="break-words">
              <span className="text-ice-300">{prefix}</span> <span className="text-fg-2">{player} поддержал сервер и получил {name} — спасибо!</span>
            </p>
          ) : null}
          <p className="break-words">
            <span className="text-ice-300">{prefix}</span> <span className="text-azure-200">{personal}</span>
          </p>
        </div>
      </div>
      <p className="flex items-start gap-1.5 border-t border-line-soft px-4 py-2.5 text-[11.5px] leading-snug text-fg-4">
        <Info className="mt-px size-3 shrink-0" />
        {broadcast
          ? "Видит только покупатель. Объявление всем — от 250 ₽, кампания «Спасибо в чате»."
          : "Видит только покупатель. Объявление всем включается для покупок от 250 ₽."}
      </p>
    </PreviewCard>
  );
}

const VERDICT = {
  risk: { icon: ShieldAlert, title: "Риск по правилам игры", tone: "text-bad", bar: "bg-bad" },
  warn: { icon: ShieldQuestion, title: "Проверьте формулировки", tone: "text-warn", bar: "bg-warn" },
  ok: { icon: ShieldCheck, title: "Можно продавать", tone: "text-ok", bar: "bg-ok" },
  none: { icon: CircleCheck, title: "Преимуществ не нашли", tone: "text-fg-2", bar: "bg-fg-4" },
} as const;

const WHERE_LABEL = { description: "Описание", perk: "Перк", command: "Команда" } as const;

export function RulesCheck({
  verdict,
  gameName,
  rules,
  perks,
  onRemovePerk,
}: {
  verdict: RulesVerdict;
  gameName: string;
  rules?: string;
  perks: string[];
  onRemovePerk: (index: number) => void;
}) {
  const v = VERDICT[verdict.level];
  const Icon = v.icon;
  const adv = uniqueTerms(verdict.advantage);
  const grey = uniqueTerms(verdict.grey);
  const flagged: RuleHit[] = [...verdict.advantage, ...verdict.grey];
  // one row per place (a perk may match several terms)
  const places = new Map<string, { hit: RuleHit; terms: string[] }>();
  for (const h of flagged) {
    const key = `${h.where}:${h.index ?? 0}`;
    const cur = places.get(key);
    if (cur) {
      if (!cur.terms.includes(h.term)) cur.terms.push(h.term);
    } else places.set(key, { hit: h, terms: [h.term] });
  }

  return (
    <PreviewCard title={`Правила ${gameName}`} aside={<span className="font-mono text-[10.5px] text-fg-4">проверка на лету</span>}>
      <div className="relative px-4 py-3.5">
        <span aria-hidden className={cn("absolute top-4 bottom-4 left-0 w-[2px] rounded-r-full", v.bar)} />
        <p className={cn("flex items-center gap-2 text-[13.5px] font-semibold", v.tone)} aria-live="polite">
          <Icon className="size-4" /> {v.title}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-2">
          {verdict.level === "risk"
            ? `Нашли игровое преимущество за деньги: ${adv.join(", ")}. Оставьте в товаре косметику и удобства — префикс, частицы, питомца, а наборы и ресурсы выдавайте всем бесплатно или через общую складчину.`
            : verdict.level === "warn"
              ? `${grey.join(", ")} — серая зона: игроки и модераторы могут считать это преимуществом. Безопаснее сделать бонус косметическим или общим для сервера.`
              : verdict.level === "ok"
                ? `Только ${uniqueTerms(verdict.cosmetic).join(", ")} — косметика и общесерверные бонусы разрешены.`
                : "В описании, перках и командах нет ни косметики, ни игровых преимуществ. Проверьте, что именно получает игрок."}
        </p>

        {places.size ? (
          <ul className="mt-3 space-y-1.5">
            {[...places.values()].map(({ hit, terms }) => (
              <li key={`${hit.where}-${hit.index ?? 0}`} className="flex items-start gap-2 rounded-md border border-line-soft bg-surface-2/60 px-2.5 py-2 text-xs">
                <span className="mt-px shrink-0 font-mono text-[10.5px] text-fg-4">
                  {WHERE_LABEL[hit.where]}
                  {hit.index !== undefined ? ` ${hit.index + 1}` : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("line-clamp-2 break-words", hit.where === "command" ? "font-mono text-[11px] text-fg-2" : "text-fg-2")}>
                    {hit.where === "perk" ? perks[hit.index ?? 0] : hit.text}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-fg-4">{terms.join(" · ")}</span>
                </span>
                {hit.where === "perk" && hit.index !== undefined ? (
                  <button
                    type="button"
                    onClick={() => onRemovePerk(hit.index!)}
                    aria-label={`Убрать перк ${hit.index + 1}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] text-fg-3 transition-colors hover:bg-bad-soft hover:text-bad"
                  >
                    <X className="size-3" /> Убрать
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {rules ? (
          <p className="mt-3 border-t border-line-soft pt-3 text-[11.5px] leading-relaxed text-fg-4">
            <span className="text-fg-3">Что говорят правила: </span>
            {rules}
          </p>
        ) : null}
      </div>
    </PreviewCard>
  );
}
