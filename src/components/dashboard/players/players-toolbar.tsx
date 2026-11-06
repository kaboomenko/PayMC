"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownWideNarrow, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { segmentMeta } from "@/lib/mock/meta";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUrlNav } from "@/components/dashboard/orders/url-nav";
import { PLAYER_SEGMENTS, PLAYER_SORTS, PLAYER_SORT_LABELS, playersHref, type PlayerSort, type PlayersQuery, type SegmentFilter } from "./params";

const SEGMENT_LABEL: Record<SegmentFilter, string> = {
  all: "Все",
  whale: segmentMeta.whale.label,
  loyal: segmentMeta.loyal.label,
  new: segmentMeta.new.label,
  at_risk: segmentMeta.at_risk.label,
  dormant: segmentMeta.dormant.label,
  flagged: "С флагами риска",
};

const SEGMENT_DOT: Record<SegmentFilter, string> = {
  all: "",
  whale: "bg-azure-400",
  loyal: "bg-ok",
  new: "bg-ice-400",
  at_risk: "bg-warn",
  dormant: "bg-fg-4",
  flagged: "bg-bad",
};

export function PlayerSegmentTabs({ query, counts }: { query: PlayersQuery; counts: Record<SegmentFilter, number> }) {
  const { navigate } = useUrlNav();
  const [segment, setSegment] = React.useOptimistic(query.segment);
  return (
    <nav aria-label="Сегменты игроков" className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max items-center gap-5 border-b border-line">
        {PLAYER_SEGMENTS.map((s) => {
          const href = playersHref(query, { segment: s, page: 1 });
          const active = segment === s;
          return (
            <Link
              key={s}
              href={href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              title={s === "all" || s === "flagged" ? undefined : segmentMeta[s].description}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                navigate(href, { optimistic: () => setSegment(s) });
              }}
              className={cn(
                "relative inline-flex h-10 items-center gap-2 text-[13px] font-medium whitespace-nowrap transition-colors outline-none",
                "after:absolute after:inset-x-0 after:-bottom-px after:h-px",
                "focus-visible:text-fg focus-visible:after:bg-azure-400",
                active ? "text-fg after:bg-fg" : "text-fg-3 after:bg-transparent hover:text-fg-2",
              )}
            >
              {SEGMENT_DOT[s] ? <span aria-hidden className={cn("size-1.5 rounded-full", SEGMENT_DOT[s])} /> : null}
              {SEGMENT_LABEL[s]}
              <span
                className={cn(
                  "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-xs px-1 font-mono text-[10.5px] nums",
                  active ? "bg-white/[0.08] text-fg-2" : "bg-white/[0.04] text-fg-3",
                )}
              >
                {formatNumber(counts[s])}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PlayersToolbar({ query }: { query: PlayersQuery }) {
  const { navigate } = useUrlNav();
  const [optimistic, setOptimistic] = React.useOptimistic(query);
  const [text, setText] = React.useState(query.q);
  const [pushed, setPushed] = React.useState(query.q);
  const [seenQ, setSeenQ] = React.useState(query.q);
  if (query.q !== seenQ) {
    setSeenQ(query.q);
    if (query.q !== pushed) {
      setText(query.q);
      setPushed(query.q);
    }
  }

  const apply = React.useCallback(
    (patch: Partial<PlayersQuery>) => {
      const next = { ...optimistic, ...patch, page: 1 };
      navigate(playersHref(next), { optimistic: () => setOptimistic(next) });
    },
    [navigate, optimistic, setOptimistic],
  );

  React.useEffect(() => {
    if (text.trim() === pushed.trim()) return;
    const t = window.setTimeout(() => {
      setPushed(text);
      apply({ q: text });
    }, 280);
    return () => window.clearTimeout(t);
  }, [text, pushed, apply]);

  return (
    <div className="flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        leading={<Search />}
        trailing={
          text ? (
            <button
              type="button"
              onClick={() => setText("")}
              aria-label="Очистить поиск"
              className="flex size-6 items-center justify-center rounded-sm text-fg-3 hover:bg-white/[0.06] hover:text-fg"
            >
              <X className="size-3.5" />
            </button>
          ) : null
        }
        placeholder="Ник, UUID или @telegram"
        aria-label="Поиск игроков"
        spellCheck={false}
        className="min-w-0 flex-1 [&_input]:h-8 [&_input]:text-[13px]"
      />
      <Select value={optimistic.sort} onValueChange={(v) => apply({ sort: v as PlayerSort })}>
        <SelectTrigger size="sm" aria-label="Сортировка" className="w-[150px] shrink-0 sm:w-[190px]">
          <span className="flex min-w-0 items-center gap-2">
            <ArrowDownWideNarrow className="size-3.5 shrink-0 text-fg-3" />
            <span className="hidden text-fg-3 sm:inline">Сортировка:</span>
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent align="end">
          {PLAYER_SORTS.map((s) => (
            <SelectItem key={s} value={s}>
              {PLAYER_SORT_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
