"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, Copy, MoreHorizontal, Pause, Pencil, Play, Plus, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort, formatMoney, formatNumber, formatPercent, formatRelative, pluralize } from "@/lib/format";
import { NOW, NOW_MS } from "@/lib/mock/now";
import { campaignTypeMeta, channelMeta } from "@/lib/mock/meta";
import type { Campaign } from "@/lib/mock/types";
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
import { CampaignBuilder, segmentLabel, type BuilderProduct, type BuilderServer } from "./campaign-builder";
import {
  TEMPLATES,
  defaultTypeForSegment,
  draftFromCampaign,
  draftFromTemplate,
  ttlLabel,
  type CampaignDraft,
  type SegmentKey,
} from "./campaign-templates";
import { MinecraftChat, SAMPLE_VARS, type PreviewVars } from "./game-previews";
import { useHotkey, useQueryState } from "./use-query-state";

type ViewStatus = Campaign["status"] | "scheduled";

export interface CampaignView extends Omit<Campaign, "status"> {
  status: ViewStatus;
  /** last purchase attributed to the campaign */
  lastPurchaseAt?: string;
  /** for scheduled drafts — what starts it */
  scheduleNote?: string;
}

type Filter = "all" | "active" | "paused" | "draft";

const SEGMENT_KEYS: SegmentKey[] = ["all", "whale", "loyal", "new", "at_risk", "dormant"];

export function CampaignBoard({
  campaigns: initialCampaigns,
  segmentCounts,
  products,
  servers,
}: {
  campaigns: CampaignView[];
  segmentCounts: Record<SegmentKey, number>;
  products: BuilderProduct[];
  servers: BuilderServer[];
}) {
  const [campaigns, setCampaigns] = React.useState(initialCampaigns);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [newParam, setNewParam] = useQueryState("new");
  const [segmentParam] = useQueryState("segment");
  const [editing, setEditing] = React.useState<CampaignView | null>(null);
  const seq = React.useRef(0);

  const serverIds = servers.map((s) => s.id);
  const segment = SEGMENT_KEYS.includes(segmentParam as SegmentKey) ? (segmentParam as SegmentKey) : null;
  const builderOpen = newParam === "1" || editing !== null;
  const initialDraft: CampaignDraft = editing
    ? draftFromCampaign({ ...editing, status: editing.status === "scheduled" ? "draft" : editing.status }, serverIds)
    : draftFromTemplate(defaultTypeForSegment(segment), serverIds, segment);

  useHotkey("n", () => setNewParam("1"));

  const closeBuilder = () => {
    setEditing(null);
    if (newParam) setNewParam(null, { segment: null });
  };

  const patch = (id: string, p: Partial<CampaignView>) => setCampaigns((list) => list.map((c) => (c.id === id ? { ...c, ...p } : c)));

  const toggle = (c: CampaignView) => {
    const prev = c.status;
    const next: ViewStatus = prev === "active" ? "paused" : prev === "paused" ? "active" : prev === "draft" ? "scheduled" : "draft";
    patch(c.id, { status: next });
    const label =
      next === "active" ? "возобновлена" : next === "paused" ? "на паузе" : next === "scheduled" ? "запланирована" : "снята с расписания";
    toast(`«${c.name}» ${label}`, {
      description: next === "paused" ? "Статистика сохранится, игроки перестанут получать сообщения" : c.scheduleNote,
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
        description: `${fields.name} · ${segmentLabel(d.segment)}, ≈ ${formatNumber(segmentCounts[d.segment] ?? 0)} игроков · ${d.channels.map((c) => channelMeta[c].label).join(", ")}`,
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

  return (
    <>
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
          Один игрок получает не больше одного сообщения в 3 дня по всем кампаниям
        </p>
      </div>

      {visible.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {visible.map((c) => (
            <CampaignCard
              key={c.id}
              c={c}
              onToggle={() => toggle(c)}
              onEdit={() => setEditing(c)}
              onDuplicate={() => duplicate(c)}
              onDelete={() => remove(c)}
            />
          ))}
          {filter === "all" && visible.length % 2 === 1 ? <IdeaCard used={campaigns.map((c) => c.type)} onPick={() => setNewParam("1")} /> : null}
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
        key={editing?.id ?? `new-${segment ?? "any"}`}
        open={builderOpen}
        onOpenChange={(o) => (o ? null : closeBuilder())}
        initial={initialDraft}
        mode={editing ? "edit" : "create"}
        segmentCounts={segmentCounts}
        products={products}
        servers={servers}
        onSave={save}
      />
    </>
  );
}

/** Fills the empty grid slot with templates the project doesn't use yet. */
function IdeaCard({ used, onPick }: { used: Campaign["type"][]; onPick: () => void }) {
  const ideas = TEMPLATE_IDEAS.filter((i) => !used.includes(i.type)).slice(0, 2);
  return (
    <div className="hidden flex-col rounded-xl border border-dashed border-line-strong p-5 xl:flex">
      <p className="label-mono text-fg-4">Ещё не пробовали</p>
      <ul className="mt-3 flex-1 space-y-3">
        {(ideas.length ? ideas : TEMPLATE_IDEAS.slice(0, 2)).map((i) => (
          <li key={i.type} className="rounded-lg border border-line-soft bg-surface/60 p-3">
            <p className="text-[13.5px] font-medium text-fg">{campaignTypeMeta[i.type].label}</p>
            <p className="mt-0.5 text-[12.5px] text-fg-3">{i.pitch}</p>
          </li>
        ))}
      </ul>
      <Button variant="secondary" size="sm" className="mt-4 self-start" onClick={onPick}>
        <Plus /> Собрать кампанию
      </Button>
    </div>
  );
}

const TEMPLATE_IDEAS: { type: Campaign["type"]; pitch: string }[] = [
  { type: "goal_progress", pitch: "Боссбар «Аренда сервера — 73 %» на всех серверах: сборы растут, когда цель видна в игре." },
  { type: "wipe_day", pitch: "Скидка в первые часы после вайпа — в эти часы покупают в 2–3 раза чаще обычного." },
  { type: "rank_expiring", pitch: "Напоминание за 3 дня до конца привилегии: продлевают 23 % получивших." },
];

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
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  c: CampaignView;
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
  const vars: PreviewVars = { ...SAMPLE_VARS, discount: formatPercent(c.offer?.discountPct ?? 10, { digits: 0 }) };

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
            <span className="label-mono text-azure-300">{campaignTypeMeta[c.type].label}</span>
            <Badge tone={badge.tone} dot={c.status === "active"}>
              {badge.label}
            </Badge>
          </div>
          <h3 className="mt-1.5 truncate text-[15px] font-semibold tracking-[-0.015em] text-fg">{c.name}</h3>
          <p className="mt-1 flex items-start gap-1.5 text-[13px] leading-snug text-fg-3">
            <Zap className="mt-0.5 size-3.5 shrink-0 text-fg-4" />
            {c.trigger}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={c.status === "active" || c.status === "scheduled"}
            onCheckedChange={onToggle}
            aria-label={isDraft ? `Запланировать «${c.name}»` : `Кампания «${c.name}» включена`}
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
                ) : (
                  <>
                    <Play /> Запланировать
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
            {c.offer.discountPct > 0 ? <span className="text-ice-300">−{formatPercent(c.offer.discountPct, { digits: 0 })}</span> : "подарок"} · {ttlLabel(c.offer.ttlHours)}
          </span>
        ) : null}
      </div>

      <div className={cn("mt-4 border-t border-line-soft px-4 py-4 sm:px-5", c.status === "paused" && "opacity-60")}>
        {isDraft ? (
          <div className="flex items-start gap-3 rounded-lg border border-ice-400/20 bg-ice-400/[0.05] px-3.5 py-3">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-ice-300" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-fg">{c.scheduleNote ?? "Черновик — включите, когда будете готовы"}</p>
              <p className="mt-0.5 text-xs text-fg-3">
                {c.scheduleNote ? (
                  <>
                    Привязана к событию в{" "}
                    <Link href="/dashboard/calendar" className="text-azure-300 underline-offset-2 hover:underline">
                      календаре акций
                    </Link>
                    {c.status === "scheduled" ? " · включится сама" : " · включите переключатель, чтобы не забыть"}
                  </>
                ) : (
                  "Статистика появится после первого срабатывания"
                )}
              </p>
            </div>
          </div>
        ) : s.reached === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-line-strong px-3.5 py-3">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-azure-400/60 motion-reduce:animate-none" />
              <span className="relative size-2 rounded-full bg-azure-400" />
            </span>
            <p className="text-[13px] text-fg-2">
              Ждём первого срабатывания — охват и покупки появятся здесь, как только триггер сработает у первого игрока
            </p>
          </div>
        ) : hasOffer ? (
          <div className="grid gap-x-5 gap-y-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <FunnelRow label="Охват" value={s.reached} pct={100} tone="bg-azure-500/45" />
              <FunnelRow label="Клики" value={s.clicked} pct={ctr} rate={ctr} tone="bg-azure-500/70" />
              <FunnelRow label="Покупки" value={s.converted} pct={total} rate={cr} tone="bg-ice-400" />
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-line-soft pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
              <p className="label-mono text-[10px] text-fg-4">Выручка</p>
              <p className="font-mono text-[20px] leading-none font-medium tracking-[-0.02em] text-fg nums sm:mt-1">{formatMoney(s.revenue)}</p>
              <p className="font-mono text-[11.5px] text-ok nums sm:mt-1.5">{formatPercent(total)} купили</p>
            </div>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="label-mono text-[10px] text-fg-4">Охват</p>
              <p className="mt-1 font-mono text-[20px] leading-none font-medium text-fg nums">{formatNumber(s.reached)}</p>
            </div>
            <p className="max-w-[60%] text-right text-xs text-fg-3">
              Без оффера — работает как социальное доказательство: игроки видят, что сервер поддерживают
            </p>
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-line-soft bg-[#06080c] px-4 py-3 sm:px-5 rounded-b-xl">
        <MinecraftChat message={c.message} vars={vars} context={false} className="bg-transparent px-0 py-0 text-[11.5px] [&_p]:line-clamp-2" />
        <p className="mt-2 flex items-center justify-between gap-3 font-mono text-[10.5px] text-fg-4">
          <span>с {formatDateShort(c.createdAt)}</span>
          {c.lastPurchaseAt && c.status !== "paused" ? (
            <span>
              последняя покупка <span className="text-fg-3">{formatRelative(c.lastPurchaseAt, NOW_MS)}</span>
            </span>
          ) : c.stats.reached ? (
            <span>{pluralize(c.stats.reached, ["показ", "показа", "показов"])}</span>
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
        {rate !== undefined ? <span className="ml-1.5 text-fg-4">{formatPercent(rate, { digits: 0 })}</span> : null}
      </span>
    </div>
  );
}
