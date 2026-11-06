"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber, formatRelative } from "@/lib/format";
import { NOW_MS } from "@/lib/mock/now";
import { playerFlagMeta, segmentMeta } from "@/lib/mock/meta";
import { Badge } from "@/components/ui/badge";
import { PixelAvatar } from "@/components/ui/avatar";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import { useUrlNav } from "@/components/dashboard/orders/url-nav";
import { formatExact, riskTone, toneText } from "@/components/dashboard/orders/format";
import { FLAG_SHORT, type PlayerRow } from "./params";

export function PlayersTable({ rows, empty }: { rows: PlayerRow[]; empty: React.ReactNode }) {
  const router = useRouter();
  const { listPending } = useUrlNav();
  if (!rows.length) return <>{empty}</>;
  return (
    <div aria-busy={listPending} className={cn("transition-opacity duration-150", listPending && "opacity-55")}>
      <TableWrap className="hidden md:block">
        <Table className="min-w-[960px]">
          <THead>
            <TR>
              <TH>Игрок</TH>
              <TH>Сегмент</TH>
              <TH className="text-right">LTV</TH>
              <TH className="text-right">Заказы</TH>
              <TH className="text-right">Ср. чек</TH>
              <TH>Был</TH>
              <TH>Привилегии</TH>
              <TH>Риск</TH>
              <TH className="w-10 text-center">
                <span className="sr-only">Telegram</span>
                <Send aria-hidden className="mx-auto size-3.5" />
              </TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((p) => (
              <TR key={p.id} interactive onClick={() => router.push(`/dashboard/players/${p.id}`)}>
                <TD className="whitespace-nowrap">
                  <span className="flex items-center gap-2.5">
                    <span className="relative">
                      <PixelAvatar name={p.name} size={26} />
                      {p.online ? <span aria-hidden className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-ok ring-2 ring-surface" /> : null}
                    </span>
                    <span className="min-w-0">
                      <Link
                        href={`/dashboard/players/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block max-w-[160px] truncate font-medium text-fg hover:text-azure-200"
                      >
                        {p.name}
                      </Link>
                      <span className="flex items-center gap-1.5 text-[11.5px] leading-4 text-fg-3">
                        <span className="font-mono text-[10.5px] text-fg-4">{p.country}</span>
                        {p.online ? <span className="text-ok">онлайн · {p.serverName}</span> : null}
                      </span>
                    </span>
                  </span>
                </TD>
                <TD>
                  <Badge tone={segmentMeta[p.segment].tone}>{segmentMeta[p.segment].label}</Badge>
                </TD>
                <TD className="text-right font-mono whitespace-nowrap text-fg nums">{p.ltv ? formatMoney(p.ltv) : <span className="text-fg-4">—</span>}</TD>
                <TD className="text-right font-mono text-fg-2 nums">{formatNumber(p.orders)}</TD>
                <TD className="text-right font-mono whitespace-nowrap text-fg-2 nums">{p.avgCheck ? formatMoney(p.avgCheck) : <span className="text-fg-4">—</span>}</TD>
                <TD className="whitespace-nowrap">
                  <Tooltip content={formatExact(p.lastSeenAt)}>
                    <span className={cn("text-[12.5px] nums", p.online ? "text-ok" : "text-fg-3")}>{p.online ? "сейчас в игре" : formatRelative(p.lastSeenAt, NOW_MS)}</span>
                  </Tooltip>
                </TD>
                <TD>
                  <RankChips ranks={p.ranks} />
                </TD>
                <TD className="whitespace-nowrap">
                  <RiskCell risk={p.risk} flags={p.flags} />
                </TD>
                <TD className="text-center">
                  {p.telegram ? (
                    <Tooltip content={`Telegram привязан · ${p.telegram}`}>
                      <span className="inline-flex text-ice-300" aria-label={`Telegram ${p.telegram}`}>
                        <Send className="size-3.5" />
                      </span>
                    </Tooltip>
                  ) : (
                    <span className="text-fg-4" aria-label="Telegram не привязан">
                      ·
                    </span>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>

      <ul className="divide-y divide-line-soft md:hidden">
        {rows.map((p) => (
          <li key={p.id}>
            <Link href={`/dashboard/players/${p.id}`} className="flex items-start gap-3 px-4 py-3 transition-colors active:bg-white/[0.03]">
              <span className="relative mt-0.5">
                <PixelAvatar name={p.name} size={30} />
                {p.online ? <span aria-hidden className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-ok ring-2 ring-surface" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-[13px] font-medium text-fg">{p.name}</span>
                  <span className="shrink-0 font-mono text-[13px] text-fg nums">{p.ltv ? formatMoney(p.ltv) : "—"}</span>
                </span>
                <span className="mt-1 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <Badge tone={segmentMeta[p.segment].tone}>{segmentMeta[p.segment].label}</Badge>
                    {p.flags.length ? <span className={cn("font-mono text-[11px]", toneText[riskTone(p.risk)])}>риск {p.risk}</span> : null}
                  </span>
                  <span className={cn("shrink-0 text-[11.5px] whitespace-nowrap", p.online ? "text-ok" : "text-fg-4")}>
                    {p.online ? `в игре · ${p.serverName}` : formatRelative(p.lastSeenAt, NOW_MS)}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RankChips({ ranks, max = 2 }: { ranks: PlayerRow["ranks"]; max?: number }) {
  if (!ranks.length) return <span className="text-fg-4">—</span>;
  const shown = ranks.slice(0, max);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((r) => {
        const soon = r.daysLeft !== null && r.daysLeft <= 3;
        return (
          <span
            key={r.name}
            className={cn(
              "inline-flex h-5 items-center gap-1 rounded-xs px-1.5 text-[11px] whitespace-nowrap ring-1 ring-inset",
              soon ? "bg-warn-soft text-warn ring-warn/20" : "bg-white/[0.04] text-fg-2 ring-line",
            )}
          >
            {r.name}
            {r.daysLeft === null ? (
              <span className="text-[11px] leading-none text-fg-3" aria-label="навсегда">
                ∞
              </span>
            ) : (
              <span className={cn("font-mono text-[10px] nums", soon ? "text-warn" : "text-fg-4")}>{r.daysLeft}&nbsp;дн</span>
            )}
          </span>
        );
      })}
      {ranks.length > max ? <span className="font-mono text-[10.5px] text-fg-4">+{ranks.length - max}</span> : null}
    </span>
  );
}

export function RiskCell({ risk, flags }: { risk: number; flags: PlayerRow["flags"] }) {
  const tone = riskTone(risk);
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("w-6 font-mono text-[12px] nums", toneText[tone])}>{risk}</span>
      {flags.map((f) => (
        <Tooltip
          key={f}
          content={
            <span>
              <span className="font-medium text-fg">{playerFlagMeta[f].label}</span>
              <br />
              {playerFlagMeta[f].hint}
            </span>
          }
        >
          <span>
            <Badge tone={playerFlagMeta[f].tone}>{FLAG_SHORT[f]}</Badge>
          </span>
        </Tooltip>
      ))}
    </span>
  );
}
