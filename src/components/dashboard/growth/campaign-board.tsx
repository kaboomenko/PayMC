"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Copy, MoreHorizontal, Pause, Pencil, Play, Plus, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort, formatMoney, formatNumber, formatPercent, formatRelative, plural, pluralize } from "@/lib/format";
import { NOW, NOW_MS } from "@/lib/mock/now";
import { campaignTypeMeta, channelMeta } from "@/lib/mock/meta";
import type { Campaign, CampaignType } from "@/lib/mock/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toaster";
import { CampaignBuilder, segmentLabel, type BuilderProduct, type BuilderServer, type OwnCampaignStats } from "./campaign-builder";
import {
  TEMPLATES,
  TEMPLATE_ORDER,
  defaultTypeForSegment,
  draftFromCampaign,
  draftFromTemplate,
  ttlLabel,
  type CampaignDraft,
  type SegmentKey,
} from "./campaign-templates";
import { BossBar, MinecraftChat, SAMPLE_VARS, TitleOverlay, fillVars, type PreviewVars } from "./game-previews";
import { KpiStrip, Unit } from "./kpi-strip";
import { useHotkey, useQueryState } from "./use-query-state";

type ViewStatus = Campaign["status"] | "scheduled";

export interface CampaignView extends Omit<Campaign, "status"> {
  status: ViewStatus;
  /** last purchase attributed to the campaign */
  lastPurchaseAt?: string;
  /** for drafts bound to a calendar event — what starts them */
  scheduleNote?: string;
}

/** Figures only the server knows: money attributed to campaigns over 30 days. */
export interface CampaignKpiBase {
  revenue30: number;
  /** share of the project's 30-day revenue, % */
  revenueShare: number;
  daily: number[];
}

export interface CampaignGoal {
  title: string;
  raised: number;
  target: number;
}

type Filter = "all" | "active" | "paused" | "draft";

const SEGMENT_KEYS: SegmentKey[] = ["all", "whale", "loyal", "new", "at_risk", "dormant"];
const BUYS: [string, string, string] = ["покупка", "покупки", "покупок"];

export function CampaignBoard({
  campaigns: initialCampaigns,
  segmentCounts,
  products,
  servers,
  kpi,
  goal,
}: {
  campaigns: CampaignView[];
  segmentCounts: Record<SegmentKey, number>;
  products: BuilderProduct[];
  servers: BuilderServer[];
  kpi: CampaignKpiBase;
  goal: CampaignGoal | null;
}) {
  const [campaigns, setCampaigns] = React.useState(initialCampaigns);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [newParam, setNewParam] = useQueryState("new");
  const [segmentParam] = useQueryState("segment");
  const [templateParam] = useQueryState("template");
  const [editing, setEditing] = React.useState<CampaignView | null>(null);
  const seq = React.useRef(0);
  const productName = React.useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);

  const serverIds = servers.map((s) => s.id);
  const segment = SEGMENT_KEYS.includes(segmentParam as SegmentKey) ? (segmentParam as SegmentKey) : null;
  const template = TEMPLATE_ORDER.includes(templateParam as CampaignType) ? (templateParam as CampaignType) : null;
  const builderOpen = newParam === "1" || editing !== null;
  const initialDraft: CampaignDraft = editing
    ? draftFromCampaign({ ...editing, status: editing.status === "scheduled" ? "draft" : editing.status }, serverIds)
    : draftFromTemplate(template ?? defaultTypeForSegment(segment), serverIds, segment);

  // the step-4 estimate leans on the project's own campaign of the same type
  const ownStats = React.useMemo(() => {
    const out: Partial<Record<CampaignType, OwnCampaignStats>> = {};
    for (const c of campaigns) {
      if (c.stats.reached === 0 || (out[c.type]?.reached ?? 0) >= c.stats.reached) continue;
      out[c.type] = { name: c.name, reached: c.stats.reached, converted: c.stats.converted, revenue: c.stats.revenue, discountPct: c.offer?.discountPct ?? 0 };
    }
    return out;
  }, [campaigns]);

  useHotkey("n", () => setNewParam("1"));

  const closeBuilder = () => {
    setEditing(null);
    if (newParam) setNewParam(null, { segment: null, template: null });
  };

  const patch = (id: string, p: Partial<CampaignView>) => setCampaigns((list) => list.map((c) => (c.id === id ? { ...c, ...p } : c)));

  const toggle = (c: CampaignView) => {
    const prev = c.status;
    // a draft tied to a calendar event gets scheduled; a plain draft simply starts
    const next: ViewStatus =
      prev === "active" ? "paused" : prev === "paused" ? "active" : prev === "scheduled" ? "draft" : c.scheduleNote ? "scheduled" : "active";
    patch(c.id, { status: next });
    const label =
      next === "paused"
        ? "на паузе"
        : next === "scheduled"
          ? "запланирована"
          : next === "draft"
            ? "снята с расписания"
            : prev === "paused"
              ? "возобновлена"
              : "запущена";
    toast(`«${c.name}» ${label}`, {
      description: next === "paused" ? "Статистика сохранится, игроки перестанут получать сообщения" : next === "scheduled" ? c.scheduleNote : undefined,
      action: { label: "Отменить", onClick: () => patch(c.id, { status: prev }) },
    });
  };

  const duplicate = (c: CampaignView) => {
    seq.current += 1;
    const copy: CampaignView = {
      ...c,
      id: `${c.id}-copy-${seq.current}`,
      name: `${c.name} — копия`,
      status: "draft",
      stats: { reached: 0, clicked: 0, converted: 0, revenue: 0 },
      createdAt: NOW.toISOString(),
      lastPurchaseAt: undefined,
      scheduleNote: undefined,
    };
    setCampaigns((list) => {
      const i = list.findIndex((x) => x.id === c.id);
      return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)];
    });
    toast("Копия создана как черновик", { description: copy.name });
  };

  const remove = (c: CampaignView) => {
    const index = campaigns.findIndex((x) => x.id === c.id);
    setCampaigns((list) => list.filter((x) => x.id !== c.id));
    toast(`Кампания «${c.name}» удалена`, {
      action: {
        label: "Вернуть",
        onClick: () => setCampaigns((list) => [...list.slice(0, index), c, ...list.slice(index)]),
      },
    });
  };

  const save = (d: CampaignDraft, intent: "launch" | "draft") => {
    const tpl = TEMPLATES[d.type];
    const fields = {
      name: d.name.trim() || campaignTypeMeta[d.type].label,
      type: d.type,
      trigger: tpl.sentence(d.delay),
      channels: d.channels,
      message: d.message,
      offer: d.discountPct > 0 || d.productId.startsWith("p-") ? { discountPct: d.discountPct, productId: d.productId.startsWith("p-") ? d.productId : undefined, ttlHours: d.ttlHours } : undefined,
      status: (intent === "launch" ? "active" : "draft") as ViewStatus,
    };
    if (d.id) {
      patch(d.id, fields);
    } else {
      seq.current += 1;
      const created: CampaignView = {
        id: `cmp-new-${seq.current}`,
        ...fields,
        stats: { reached: 0, clicked: 0, converted: 0, revenue: 0 },
        createdAt: NOW.toISOString(),
      };
      setCampaigns((list) => [created, ...list]);
      setFilter("all");
    }
    closeBuilder();
    if (intent === "launch") {
      toast.success("Кампания запущена", {
        description: `${fields.name} · ${segmentLabel(d.segment)}, ≈ ${pluralize(segmentCounts[d.segment] ?? 0, ["игрок", "игрока", "игроков"])} · ${d.channels.map((c) => channelMeta[c].label).join(", ")}`,
      });
    } else {
      toast("Черновик сохранён", { description: fields.name });
    }
  };

  const counts = {
    all: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    paused: campaigns.filter((c) => c.status === "paused").length,
    draft: campaigns.filter((c) => c.status === "draft" || c.status === "scheduled").length,
  };
  const visible = campaigns.filter((c) =>
    filter === "all" ? true : filter === "draft" ? c.status === "draft" || c.status === "scheduled" : c.status === filter,
  );
  const ideas = TEMPLATE_IDEAS.filter((i) => !campaigns.some((c) => c.type === i.type)).slice(0, 2);

  return (
    <>
      <CampaignKpis campaigns={campaigns} kpi={kpi} />

      <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: <FilterLabel label="Все" n={counts.all} /> },
            { value: "active", label: <FilterLabel label="Активные" n={counts.active} /> },
            { value: "paused", label: <FilterLabel label="На паузе" n={counts.paused} /> },
            { value: "draft", label: <FilterLabel label="Черновики" n={counts.draft} /> },
          ]}
          className="max-w-full overflow-x-auto"
        />
        <p className="text-xs text-fg-3">
          Один игрок получает не больше одного сообщения в 3 дня по всем кампаниям · статистика за 30 дней
        </p>
      </div>

      {visible.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {visible.map((c) => (
            <CampaignCard
              key={c.id}
              c={c}
              productName={productName}
              onToggle={() => toggle(c)}
              onEdit={() => setEditing(c)}
              onDuplicate={() => duplicate(c)}
              onDelete={() => remove(c)}
            />
          ))}
          {filter === "all" && visible.length % 2 === 1 && ideas.length ? (
            <IdeaCard ideas={ideas} goal={goal} onPick={(type) => setNewParam("1", { template: type, segment: null })} />
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line-strong">
          <EmptyState
            icon={<Zap />}
            title={filter === "paused" ? "Нет кампаний на паузе" : filter === "draft" ? "Черновиков нет" : "Кампаний пока нет"}
            description={
              filter === "paused"
                ? "Пауза сохраняет статистику и оффер — удобно на время вайпа или технических работ."
                : "Начните с брошенной корзины: у вас она возвращает 18 % игроков, ушедших с оплаты."
            }
            action={
              <Button variant="primary" size="sm" onClick={() => setNewParam("1")}>
                <Plus /> Новая кампания
              </Button>
            }
          />
        </div>
      )}

      <CampaignBuilder
        key={editing?.id ?? `new-${segment ?? "any"}-${template ?? "auto"}`}
        open={builderOpen}
        onOpenChange={(o) => (o ? null : closeBuilder())}
        initial={initialDraft}
        mode={editing ? "edit" : "create"}
        segmentCounts={segmentCounts}
        products={products}
        servers={servers}
        ownStats={ownStats}
        onSave={save}
      />
    </>
  );
}

/* ───────────── KPIs (follow the cards below) ───────────── */

function CampaignKpis({ campaigns, kpi }: { campaigns: CampaignView[]; kpi: CampaignKpiBase }) {
  const shows = campaigns.reduce((a, c) => a + c.stats.reached, 0);
  const withOffer = campaigns.filter((c) => c.offer && c.status !== "draft" && c.status !== "scheduled");
  const offerShows = withOffer.reduce((a, c) => a + c.stats.reached, 0);
  const converted = withOffer.reduce((a, c) => a + c.stats.converted, 0);
  const active = campaigns.filter((c) => c.status === "active").length;
  const paused = campaigns.filter((c) => c.status === "paused").length;
  const scheduled = campaigns.filter((c) => c.status === "scheduled").length;
  const drafts = campaigns.filter((c) => c.status === "draft").length;
  const rest = [
    paused ? `${paused} на паузе` : null,
    scheduled ? `${scheduled} ${plural(scheduled, ["запланирована", "запланированы", "запланированы"])}` : null,
    drafts ? `${drafts} ${plural(drafts, ["черновик", "черновика", "черновиков"])}` : null,
  ].filter(Boolean);

  return (
    <KpiStrip
      items={[
        {
          label: "Выручка от кампаний · 30 дн",
          value: (
            <>
              {formatNumber(kpi.revenue30)}
              <Unit>₽</Unit>
            </>
          ),
          sub: `${formatPercent(kpi.revenueShare)} всей выручки проекта`,
        },
        {
          label: "Показы · 30 дн",
          value: formatNumber(shows),
          sub: "сообщений в игре и мессенджерах",
        },
        {
          label: "Конверсия в покупку",
          value: formatPercent((converted / (offerShows || 1)) * 100),
          sub: `${pluralize(converted, BUYS)} из ${formatNumber(offerShows)} с оффером`,
        },
        {
          label: "Активных кампаний",
          value: (
            <>
              {active}
              <Unit>из {campaigns.length}</Unit>
            </>
          ),
          sub: rest.length ? rest.join(" · ") : "все работают",
        },
      ]}
    />
  );
}

/* ───────────── Ideas ───────────── */

const TEMPLATE_IDEAS: { type: CampaignType; pitch: string }[] = [
  { type: "goal_progress", pitch: "Боссбар с целью месяца на всех серверах: сборы растут, когда цель видна в игре." },
  { type: "wipe_day", pitch: "Скидка в первые часы после вайпа — в эти часы покупают в 2–3 раза чаще обычного." },
  { type: "rank_expiring", pitch: "Напоминание за 3 дня до конца привилегии: продлевают 23 % получивших." },
];

/**
 * Fills the odd grid slot with templates the project hasn't tried. Each idea opens the builder
 * on its own template; a single idea gets a live preview so the slot doesn't sit empty.
 */
function IdeaCard({ ideas, goal, onPick }: { ideas: typeof TEMPLATE_IDEAS; goal: CampaignGoal | null; onPick: (type: CampaignType) => void }) {
  const single = ideas.length === 1;
  return (
    <div className={cn("hidden flex-col rounded-xl border border-dashed border-line-strong p-5 xl:flex", !single && "self-start")}>
      <p className="label-mono text-fg-4">Ещё не пробовали</p>
      <ul className="mt-3 space-y-2">
        {ideas.map((i) => (
          <li key={i.type}>
            <button
              type="button"
              onClick={() => onPick(i.type)}
              className="group flex w-full flex-col rounded-lg border border-line-soft bg-surface/60 p-3 text-left transition-colors hover:border-line-strong hover:bg-surface"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-[13.5px] font-medium text-fg">{campaignTypeMeta[i.type].label}</span>
                <span className="flex items-center gap-1 text-[12px] text-azure-300 transition-colors group-hover:text-azure-200">
                  Собрать <ArrowRight className="size-3.5" />
                </span>
              </span>
              <span className="mt-0.5 text-[12.5px] text-fg-3">{i.pitch}</span>
            </button>
          </li>
        ))}
      </ul>
      {single ? <IdeaPreview type={ideas[0].type} goal={goal} /> : null}
    </div>
  );
}

/** What the untried campaign looks like in the game — the same HUD pieces the builder uses. */
function IdeaPreview({ type, goal }: { type: CampaignType; goal: CampaignGoal | null }) {
  const tpl = TEMPLATES[type];
  const pct = goal ? Math.min(100, Math.round((goal.raised / goal.target) * 100)) : 73;
  const vars: PreviewVars = { ...SAMPLE_VARS, discount: formatPercent(tpl.discountPct || 10, { digits: 0 }), link: "shop.arcticmc.ru" };
  return (
    <div className="mt-2 flex min-h-[132px] flex-1 flex-col justify-between overflow-hidden rounded-lg border border-line bg-[linear-gradient(to_bottom,#05070b,#0e121b_60%,#141a26)] px-3 pt-3 pb-2.5">
      <div>
        <p className="label-mono mb-2 text-fg-4">Так это увидят игроки</p>
        {type === "goal_progress" ? (
          <>
            <BossBar text={`Цель месяца — ${pct} %`} pct={pct} className="w-full" />
            {goal ? (
              <p className="mt-1 text-center font-mono text-[11px] text-ice-200/80 nums">
                {formatMoney(goal.raised)} из {formatMoney(goal.target)}
              </p>
            ) : null}
          </>
        ) : (
          <TitleOverlay title={fillVars(tpl.title, vars)} subtitle={fillVars(tpl.subtitle, vars)} />
        )}
      </div>
      <MinecraftChat
        message={type === "goal_progress" ? `На аренду сервера собрано ${pct} %. Поддержать: {link}` : tpl.message}
        vars={vars}
        context={false}
        className="mt-3 bg-black/45 text-[11px]"
      />
    </div>
  );
}

function FilterLabel({ label, n }: { label: string; n: number }) {
  return (
    <>
      {label} <span className="font-mono text-[11px] text-fg-4 nums">{n}</span>
    </>
  );
}

const STATUS_BADGE: Record<ViewStatus, { label: string; tone: "ok" | "neutral" | "ice" | "azure" }> = {
  active: { label: "Работает", tone: "ok" },
  paused: { label: "На паузе", tone: "neutral" },
  draft: { label: "Черновик", tone: "neutral" },
  scheduled: { label: "Запланирована", tone: "ice" },
};

function CampaignCard({
  c,
  productName,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  c: CampaignView;
  productName: Map<string, string>;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const s = c.stats;
  const isDraft = c.status === "draft" || c.status === "scheduled";
  const hasOffer = !!c.offer && s.clicked > 0;
  const ctr = s.reached ? (s.clicked / s.reached) * 100 : 0;
  const cr = s.clicked ? (s.converted / s.clicked) * 100 : 0;
  const total = s.reached ? (s.converted / s.reached) * 100 : 0;
  const badge = STATUS_BADGE[c.status];
  // {product} is the offer's product when the campaign has one; cart/rank offers show a sample rank
  const offerProduct = c.offer?.productId ? productName.get(c.offer.productId) : undefined;
  const vars: PreviewVars = {
    ...SAMPLE_VARS,
    product: offerProduct ?? SAMPLE_VARS.product,
    link: offerProduct && c.offer?.productId ? `shop.arcticmc.ru/${c.offer.productId.replace(/^p-/, "")}` : SAMPLE_VARS.link,
    discount: formatPercent(c.offer?.discountPct ?? 10, { digits: 0 }),
  };

  return (
    <article
      className={cn(
        "group/card flex flex-col rounded-xl border bg-surface shadow-raise transition-colors",
        c.status === "active" ? "border-line hover:border-line-strong" : "border-line-soft",
      )}
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-mono text-fg-3">{campaignTypeMeta[c.type].label}</span>
            <Badge tone={badge.tone} dot={c.status === "active"}>
              {badge.label}
            </Badge>
          </div>
          <h3 className="mt-1.5 truncate text-[15px] font-medium text-fg">{c.name}</h3>
          <p className="mt-1 flex items-start gap-1.5 text-[13px] leading-snug text-fg-3">
            <Zap className="mt-0.5 size-3.5 shrink-0 text-fg-4" />
            {c.trigger}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={c.status === "active" || c.status === "scheduled"}
            onCheckedChange={onToggle}
            aria-label={isDraft ? (c.scheduleNote ? `Запланировать «${c.name}»` : `Запустить «${c.name}»`) : `Кампания «${c.name}» включена`}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Действия с кампанией «${c.name}»`} className="data-[state=open]:bg-white/[0.06]">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDuplicate}>
                <Copy /> Дублировать
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onToggle}>
                {c.status === "active" ? (
                  <>
                    <Pause /> Пауза
                  </>
                ) : c.status === "paused" ? (
                  <>
                    <Play /> Возобновить
                  </>
                ) : c.status === "scheduled" ? (
                  <>
                    <Pause /> Снять с расписания
                  </>
                ) : c.scheduleNote ? (
                  <>
                    <Play /> Запланировать
                  </>
                ) : (
                  <>
                    <Play /> Запустить
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={onDelete}>
                <Trash2 /> Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 px-4 sm:px-5">
        {c.channels.map((ch) => (
          <span key={ch} className="inline-flex h-6 items-center rounded-sm border border-line bg-surface-2 px-2 text-[11.5px] text-fg-2">
            {channelMeta[ch].label}
          </span>
        ))}
        {c.offer ? (
          <span className="ml-auto font-mono text-[11.5px] text-fg-3">
            {c.offer.discountPct > 0 ? (
              <span className="text-fg-2">−{formatPercent(c.offer.discountPct, { digits: 0 })}</span>
            ) : (
              <>подарок{offerProduct ? <span className="text-fg-2"> · {offerProduct}</span> : null}</>
            )}{" "}
            · {ttlLabel(c.offer.ttlHours)}
          </span>
        ) : null}
      </div>

      <div className={cn("mt-4 border-t border-line-soft px-4 py-4 sm:px-5", c.status === "paused" && "opacity-60")}>
        {isDraft ? (
          <div className="flex items-start gap-3 rounded-lg border border-line bg-white/[0.02] px-3.5 py-3">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-fg-3" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-fg">{c.scheduleNote ?? "Черновик — включите, когда будете готовы"}</p>
              <p className="mt-0.5 text-xs text-fg-3">
                {c.scheduleNote ? (
                  <>
                    Привязана к событию в{" "}
                    <Link href="/dashboard/calendar?month=2026-12" className="text-azure-300 underline-offset-2 hover:underline">
                      календаре акций
                    </Link>
                    {c.status === "scheduled" ? " · включится сама" : " · автозапуск выключен — включите переключатель"}
                  </>
                ) : (
                  "Статистика появится после первого срабатывания"
                )}
              </p>
            </div>
          </div>
        ) : s.reached === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-line-strong px-3.5 py-3">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-azure-400" />
            <p className="text-[13px] text-fg-2">
              Ждём первого срабатывания — показы и покупки появятся здесь, как только триггер сработает у первого игрока
            </p>
          </div>
        ) : hasOffer ? (
          <div className="grid gap-x-5 gap-y-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <FunnelRow label="Показы" value={s.reached} pct={100} tone="bg-fg-4/40" />
              <FunnelRow label="Клики" value={s.clicked} pct={ctr} rate={ctr} tone="bg-fg-4/70" />
              <FunnelRow label="Покупки" value={s.converted} pct={total} rate={cr} tone="bg-azure-500" />
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-line-soft pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
              <p className="label-mono text-fg-4">Выручка · 30 дн</p>
              <p className="font-mono text-[20px] leading-none font-medium tracking-[-0.02em] text-fg nums sm:mt-1">{formatMoney(s.revenue)}</p>
              <p className="font-mono text-[11.5px] text-fg-3 nums sm:mt-1.5">{formatPercent(total)} купили</p>
            </div>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="label-mono text-fg-4">Показы · 30 дн</p>
              <p className="mt-1 font-mono text-[20px] leading-none font-medium text-fg nums">{formatNumber(s.reached)}</p>
            </div>
            <p className="max-w-[60%] text-right text-xs text-fg-3">
              Без оффера — работает как социальное доказательство: игроки видят, что сервер поддерживают
            </p>
          </div>
        )}
      </div>

      <div className="mt-auto rounded-b-xl border-t border-line-soft bg-[#06080c] px-4 py-3 sm:px-5">
        <MinecraftChat message={c.message} vars={vars} context={false} className="bg-transparent px-0 py-0 text-[11.5px] [&_p]:line-clamp-2" />
        <p className="mt-2 flex items-center justify-between gap-3 font-mono text-[11px] text-fg-4">
          <span>создана {formatDateShort(c.createdAt)}</span>
          {c.lastPurchaseAt && c.status !== "paused" ? (
            <span>
              последняя покупка <span className="text-fg-3">{formatRelative(c.lastPurchaseAt, NOW_MS)}</span>
            </span>
          ) : null}
        </p>
      </div>
    </article>
  );
}

function FunnelRow({ label, value, pct, rate, tone }: { label: string; value: number; pct: number; rate?: number; tone: string }) {
  return (
    <div className="grid grid-cols-[64px_1fr_auto] items-center gap-2.5 text-[12px]">
      <span className="text-fg-3">{label}</span>
      <span className="relative h-2 overflow-hidden rounded-[2px] bg-white/[0.04]">
        <span className={cn("absolute inset-y-0 left-0 rounded-[2px]", tone)} style={{ width: `${Math.max(2, pct)}%` }} />
      </span>
      <span className="w-[92px] text-right font-mono text-fg-2 nums">
        {formatNumber(value)}
        <span className="ml-1.5 inline-block w-9 text-right text-fg-4">{rate !== undefined ? formatPercent(rate, { digits: 0 }) : null}</span>
      </span>
    </div>
  );
}
