"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  Monitor,
  RotateCcw,
  Send,
  ShieldCheck,
  Smartphone,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, formatMoney, formatRelative, pluralize } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusDot } from "@/components/ui/status-dot";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/dashboard/page-header";
import { Storefront } from "../storefront";
import { FAQ_COUNT, RULES_COUNT } from "../store-sections";
import { ACCENTS, BLOCK_META, DEFAULT_BLOCKS, DEFAULT_THEME } from "../theme";
import type { StoreAccent, StoreBlock, StoreBlockId, StoreData, StoreTheme } from "../types";
import { ScaledFrame } from "./scaled-frame";
import { InGameMenu } from "./ingame-menu";

type Snapshot = { theme: StoreTheme; blocks: StoreBlock[]; at: number };

const same = (a: Omit<Snapshot, "at">, b: Omit<Snapshot, "at">) => JSON.stringify([a.theme, a.blocks]) === JSON.stringify([b.theme, b.blocks]);

const PHONE_QUERY = "(max-width: 767px)";

/** true on phone-width viewports; false during SSR and hydration */
function usePhoneViewport() {
  return React.useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(PHONE_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}

export function StorefrontBuilder({ data }: { data: StoreData }) {
  const [theme, setTheme] = React.useState<StoreTheme>(DEFAULT_THEME);
  const [blocks, setBlocks] = React.useState<StoreBlock[]>(DEFAULT_BLOCKS);
  const [published, setPublished] = React.useState<Snapshot>({ theme: DEFAULT_THEME, blocks: DEFAULT_BLOCKS, at: data.now - 3 * 60 * 60 * 1000 - 14 * 60 * 1000 });
  // On a phone the 1280 px desktop preview would be scaled to ~0,28 — start with the phone frame there.
  const phone = usePhoneViewport();
  const [pickedDevice, setDevice] = React.useState<"desktop" | "mobile" | null>(null);
  const device = pickedDevice ?? (phone ? "mobile" : "desktop");
  const dirty = !same({ theme, blocks }, published);

  const publish = React.useCallback(() => {
    if (!dirty) return;
    const prev = published;
    setPublished({ theme, blocks, at: data.now });
    toast.success("Витрина опубликована", {
      description: `${data.host} — игроки видят новую версию`,
      action: { label: "Отменить", onClick: () => setPublished(prev) },
    });
  }, [dirty, published, theme, blocks, data.now, data.host]);

  // ⌘S / Ctrl+S — publish
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        publish();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [publish]);

  return (
    <div>
      <PageHeader
        title="Витрина"
        description="Так магазин видят игроки. Меняйте тему и блоки — превью обновляется сразу, игроки увидят после публикации."
        meta={
          dirty ? (
            <span className="flex items-center gap-1.5 text-warn">
              <StatusDot tone="warn" /> Есть неопубликованные изменения
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <StatusDot tone="ok" /> Опубликовано {formatRelative(published.at, data.now)} · {formatDateTime(published.at)}
            </span>
          )
        }
        actions={
          <>
            {dirty ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTheme(published.theme);
                  setBlocks(published.blocks);
                }}
              >
                <RotateCcw /> Сбросить
              </Button>
            ) : null}
            <Button asChild variant="secondary" size="sm">
              <Link href={`/s/${data.slug}`} target="_blank" rel="noopener">
                Открыть магазин <ArrowUpRight />
              </Link>
            </Button>
            <Button variant="primary" size="sm" onClick={publish} disabled={!dirty}>
              <Upload /> Опубликовать
              <Kbd className="ml-0.5 border-white/20 bg-white/10 text-white/80">⌘S</Kbd>
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[372px_minmax(0,1fr)]">
        {/* settings */}
        <div className="min-w-0 rounded-xl border border-line bg-surface shadow-raise xl:sticky xl:top-20">
          <Tabs defaultValue="theme">
            <TabsList className="scrollbar-none overflow-x-auto px-4">
              <TabsTrigger value="theme">Тема</TabsTrigger>
              <TabsTrigger value="blocks">Блоки</TabsTrigger>
              <TabsTrigger value="domain">Домен</TabsTrigger>
              <TabsTrigger value="channels">Каналы продаж</TabsTrigger>
            </TabsList>
            <TabsContent value="theme" className="p-4">
              <ThemePanel theme={theme} onChange={setTheme} />
            </TabsContent>
            <TabsContent value="blocks" className="p-4">
              <BlocksPanel blocks={blocks} onChange={setBlocks} data={data} />
            </TabsContent>
            <TabsContent value="domain" className="p-4">
              <DomainPanel data={data} />
            </TabsContent>
            <TabsContent value="channels" className="p-4">
              <ChannelsPanel data={data} />
            </TabsContent>
          </Tabs>
        </div>

        {/* preview */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface-2 shadow-raise">
          <div className="flex items-center gap-3 border-b border-line px-3 py-2">
            <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-line-soft bg-canvas/60 px-2.5">
              <Lock className="size-3.5 shrink-0 text-ok" aria-hidden />
              <span className="truncate font-mono text-[12px] text-fg-2">{data.host}</span>
              {dirty ? <span className="ml-auto shrink-0 rounded-sm bg-warn-soft px-1.5 py-0.5 text-[11px] text-warn">черновик</span> : null}
            </div>
            <Segmented
              value={device}
              onChange={setDevice}
              options={[
                { value: "desktop", label: <><Monitor /> <span className="hidden sm:inline">Компьютер</span></> },
                { value: "mobile", label: <><Smartphone /> <span className="hidden sm:inline">Телефон</span></> },
              ]}
            />
          </div>
          <div className={cn("bg-canvas", device === "mobile" && "py-5")}>
            {device === "desktop" ? (
              <ScaledFrame key="desktop" width={1280} height={720} label="Превью витрины: компьютер">
                <Storefront data={data} theme={theme} blocks={blocks} preview />
              </ScaledFrame>
            ) : (
              <div className="mx-auto w-[min(336px,calc(100%-2rem))] overflow-hidden rounded-[22px] border-[5px] border-surface-4 bg-canvas shadow-pop">
                <ScaledFrame key="mobile" width={390} height={640} label="Превью витрины: телефон">
                  <Storefront data={data} theme={theme} blocks={blocks} preview />
                </ScaledFrame>
              </div>
            )}
          </div>
          <p className="flex items-center gap-2 border-t border-line px-3 py-2 text-xs text-fg-3">
            <Eye className="size-3.5" /> Превью интерактивное: вкладки и FAQ работают, оплата — только в открытом магазине.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Theme ───────────── */

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium text-fg">{title}</p>
        {hint ? <p className="text-xs text-fg-4">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function ThemePanel({ theme, onChange }: { theme: StoreTheme; onChange: (t: StoreTheme) => void }) {
  const set = <K extends keyof StoreTheme>(k: K, v: StoreTheme[K]) => onChange({ ...theme, [k]: v });
  return (
    <div className="grid grid-cols-1 gap-5">
      <Group title="Акцент" hint="кнопки, прогресс, метки">
        <div role="radiogroup" aria-label="Акцент" className="grid grid-cols-1 gap-1.5">
          {(Object.keys(ACCENTS) as StoreAccent[]).map((a) => {
            const meta = ACCENTS[a];
            const active = theme.accent === a;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set("accent", a)}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-2 text-left transition-colors",
                  active ? "border-azure-400/55 bg-azure-500/[0.07]" : "border-line hover:border-line-strong",
                )}
              >
                <span className="flex h-8 w-[74px] shrink-0 items-center justify-center rounded-[6px] text-[11.5px] font-semibold" style={{ background: meta.accent, color: meta.on }}>
                  Купить
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-fg">{meta.label}</span>
                  <span className="block truncate text-[11.5px] text-fg-3">{meta.hint}</span>
                </span>
                <span className={cn("flex size-4 items-center justify-center rounded-full border", active ? "border-azure-400 bg-azure-500" : "border-line-strong")}>
                  {active ? <Check className="size-2.5 text-white" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </Group>
      <Group title="Фон">
        <Segmented
          className="w-full [&>button]:flex-1 [&>button]:justify-center"
          value={theme.background}
          onChange={(v) => set("background", v)}
          options={[
            { value: "solid", label: "Однотонный" },
            { value: "grid", label: "Сетка" },
            { value: "pixels", label: "Пиксели" },
          ]}
        />
      </Group>
      <Group title="Карточки товаров" hint={theme.density === "compact" ? "списком, без перков" : "с перками и артом"}>
        <Segmented
          className="w-full [&>button]:flex-1 [&>button]:justify-center"
          value={theme.density}
          onChange={(v) => set("density", v)}
          options={[
            { value: "comfortable", label: "Свободно" },
            { value: "compact", label: "Плотно" },
          ]}
        />
      </Group>
      <Group title="Углы">
        <Segmented
          className="w-full [&>button]:flex-1 [&>button]:justify-center"
          value={theme.corners}
          onChange={(v) => set("corners", v)}
          options={[
            { value: "soft", label: "Мягкие · 14 px" },
            { value: "sharp", label: "Строгие · 4 px" },
          ]}
        />
      </Group>
      <p className="rounded-md border border-line-soft bg-surface-2/60 px-3 py-2.5 text-xs leading-relaxed text-fg-3">
        Цвета подобраны под контраст WCAG AA на тёмном фоне — текст на кнопках читается в любой теме.
      </p>
    </div>
  );
}

/* ───────────── Blocks ───────────── */

function blockMeta(id: StoreBlockId, data: StoreData) {
  const cats = BLOCK_META[id].categories;
  if (cats) {
    const n = data.products.filter((p) => cats.includes(p.category)).length;
    return id === "pools" ? pluralize(n, ["сбор", "сбора", "сборов"]) : pluralize(n, ["товар", "товара", "товаров"]);
  }
  if (id === "goal" && data.goal) return `${formatMoney(data.goal.raised)} из ${formatMoney(data.goal.target)}`;
  if (id === "recent") return "покупки товаров из видимых блоков";
  if (id === "rules") return pluralize(RULES_COUNT, ["пункт", "пункта", "пунктов"]);
  if (id === "faq") return pluralize(FAQ_COUNT, ["вопрос", "вопроса", "вопросов"]);
  return "";
}

function BlocksPanel({ blocks, onChange, data }: { blocks: StoreBlock[]; onChange: (b: StoreBlock[]) => void; data: StoreData }) {
  const reduce = useReducedMotion();
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const visibleCount = blocks.filter((b) => b.visible).length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-fg-3">
          Порядок здесь = порядок на витрине. Разделы каталога становятся вкладками.
        </p>
        <span className="shrink-0 font-mono text-[11px] text-fg-4 nums">
          {visibleCount}/{blocks.length}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-1">
        {blocks.map((b, i) => {
          const meta = BLOCK_META[b.id];
          return (
            <motion.li
              key={b.id}
              layout={!reduce}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "flex items-center gap-2 rounded-md border border-line bg-surface-2/60 py-1.5 pr-2 pl-2.5",
                !b.visible && "border-dashed bg-transparent",
              )}
            >
              <span className="w-4 font-mono text-[11px] text-fg-4 nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className={cn("flex items-center gap-1.5 text-[13px] font-medium", b.visible ? "text-fg" : "text-fg-3")}>
                  {meta.label}
                  {!b.visible ? <EyeOff className="size-3 text-fg-4" aria-label="скрыт" /> : null}
                </span>
                <span className="block truncate text-[11.5px] text-fg-4">{blockMeta(b.id, data) || meta.description}</span>
              </span>
              <span className="flex items-center">
                <Button variant="ghost" size="icon-xs" aria-label={`Поднять блок «${meta.label}»`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon-xs" aria-label={`Опустить блок «${meta.label}»`} disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown />
                </Button>
              </span>
              <Switch
                size="sm"
                checked={b.visible}
                aria-label={`Показывать блок «${meta.label}»`}
                onCheckedChange={(v) => onChange(blocks.map((x) => (x.id === b.id ? { ...x, visible: v } : x)))}
              />
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────────── Domain ───────────── */

function DomainPanel({ data }: { data: StoreData }) {
  const [redirect, setRedirect] = React.useState(true);
  const sub = `${data.slug}.paymc.ru`;
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line">
        <div className="flex items-center gap-3 bg-surface-2 px-3 py-2.5">
          <Globe className="size-4 shrink-0 text-fg-3" />
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] text-fg-3">Адрес на PayMC</p>
            <p className="truncate font-mono text-[13px] text-fg">{sub}</p>
          </div>
          <Badge tone="ok" dot>
            Активен
          </Badge>
          <CopyButton value={`https://${sub}`} label="Скопировать адрес" />
        </div>
        <div className="flex items-center gap-3 bg-surface-2 px-3 py-2.5">
          <ShieldCheck className="size-4 shrink-0 text-ok" />
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] text-fg-3">Свой домен</p>
            <p className="truncate font-mono text-[13px] text-fg">{data.host}</p>
          </div>
          <Badge tone="ok">SSL выдан</Badge>
          <CopyButton value={`https://${data.host}`} label="Скопировать домен" />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-fg">DNS-запись у регистратора</p>
        <CodeBlock title="arcticmc.ru · DNS" code={`# одна запись у регистратора\nshop  CNAME  ${sub}.`} />
      </div>

      <ul className="grid gap-2 text-[12.5px]">
        <li className="flex items-start gap-2 text-fg-2">
          <Check className="mt-0.5 size-3.5 shrink-0 text-ok" /> CNAME указывает на PayMC — проверено сегодня в 11:58
        </li>
        <li className="flex items-start gap-2 text-fg-2">
          <Check className="mt-0.5 size-3.5 shrink-0 text-ok" /> TTL — 3600 или по умолчанию у регистратора, остальное PayMC сделает сам
        </li>
        <li className="flex items-start gap-2 text-fg-2">
          <Check className="mt-0.5 size-3.5 shrink-0 text-ok" /> Сертификат Let’s Encrypt до 4 февраля 2027, продлим сами
        </li>
        <li className="flex items-start gap-2 text-fg-2">
          <Check className="mt-0.5 size-3.5 shrink-0 text-ok" /> Старые ссылки на {sub} продолжают работать
        </li>
      </ul>

      <label className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
        <span>
          <span className="block text-[13px] text-fg">Перенаправлять на свой домен</span>
          <span className="block text-[11.5px] text-fg-3">
            {sub} → {data.host}, код 301
          </span>
        </span>
        <Switch checked={redirect} onCheckedChange={setRedirect} aria-label="Перенаправлять на свой домен" />
      </label>
    </div>
  );
}

/* ───────────── Channels ───────────── */

function ChannelsPanel({ data }: { data: StoreData }) {
  const [site, setSite] = React.useState(true);
  const [ingame, setIngame] = React.useState(true);
  const [tg, setTg] = React.useState<"off" | "connecting" | "on">("off");
  return (
    <div className="grid grid-cols-1 gap-3">
      <Channel title="Сайт" desc={data.host} on={site} onToggle={setSite} />
      <div className="rounded-lg border border-line">
        <Channel
          bare
          title="В игре: меню /donate"
          desc="Игрок пишет /donate — открывается меню, оплата по QR на карте в руке"
          on={ingame}
          onToggle={setIngame}
        />
        {ingame ? (
          <div className="border-t border-line-soft p-3">
            <InGameMenu products={data.products} storeName={data.name} />
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
        <Send className="size-4 shrink-0 text-fg-3" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-fg">Telegram Mini App</p>
          <p className="truncate text-[11.5px] text-fg-3">{tg === "on" ? "@arcticmc_shop_bot · кнопка «Магазин» в боте" : "Магазин внутри Telegram, оплата без браузера"}</p>
        </div>
        {tg === "on" ? (
          <Badge tone="ok" dot>
            Подключено
          </Badge>
        ) : (
          <Button
            size="xs"
            variant="secondary"
            disabled={tg === "connecting"}
            onClick={() => {
              setTg("connecting");
              window.setTimeout(() => {
                setTg("on");
                toast.success("Telegram Mini App подключён", { description: "Бот @arcticmc_shop_bot открывает витрину" });
              }, 1200);
            }}
          >
            {tg === "connecting" ? <Loader2 className="animate-spin" /> : null}
            {tg === "connecting" ? "Подключаем" : "Подключить"}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-line px-3 py-2.5 opacity-70">
        <span className="flex size-4 shrink-0 items-center justify-center font-mono text-[11px] font-bold text-fg-3">VK</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-fg">VK Mini App</p>
          <p className="truncate text-[11.5px] text-fg-3">Витрина в сообществе ВКонтакте</p>
        </div>
        <Badge tone="outline">скоро</Badge>
      </div>
    </div>
  );
}

function Channel({ title, desc, on, onToggle, bare }: { title: string; desc: string; on: boolean; onToggle: (v: boolean) => void; bare?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5", !bare && "rounded-lg border border-line")}>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-fg">{title}</span>
        <span className="block text-[11.5px] leading-snug text-fg-3">{desc}</span>
      </span>
      <Switch checked={on} onCheckedChange={onToggle} aria-label={title} />
    </label>
  );
}
