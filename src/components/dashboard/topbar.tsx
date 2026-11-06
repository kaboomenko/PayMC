"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CircleDollarSign,
  Menu,
  ServerCrash,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  Clock,
  Megaphone,
  FileCheck2,
  UserPlus,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { findNavItem } from "./nav";
import type { ShellData } from "./shell-types";
import type { ActivityKind } from "@/lib/mock/types";

const KIND_ICON: Record<ActivityKind, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  order: { icon: CircleDollarSign, cls: "text-azure-300" },
  delivery_failed: { icon: AlertTriangle, cls: "text-warn" },
  awaiting_player: { icon: Clock, cls: "text-ice-300" },
  payout: { icon: Wallet, cls: "text-ok" },
  chargeback: { icon: ShieldAlert, cls: "text-bad" },
  server_offline: { icon: ServerCrash, cls: "text-bad" },
  server_online: { icon: Server, cls: "text-ok" },
  campaign: { icon: Megaphone, cls: "text-azure-300" },
  member: { icon: UserPlus, cls: "text-fg-2" },
  receipt: { icon: FileCheck2, cls: "text-fg-2" },
  fraud_blocked: { icon: ShieldCheck, cls: "text-ice-300" },
};

export function Topbar({
  data,
  now,
  onOpenMenu,
}: {
  data: ShellData;
  now: number;
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();
  const item = findNavItem(pathname);
  const current = data.projects.find((p) => p.id === data.currentProjectId) ?? data.projects[0];
  const crumbs = buildCrumbs(pathname, item?.label);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line-soft bg-canvas/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70 lg:px-6">
      <Button variant="ghost" size="icon-sm" className="-ml-1 lg:hidden" aria-label="Меню" onClick={onOpenMenu}>
        <Menu />
      </Button>

      <nav aria-label="Хлебные крошки" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <span className="hidden truncate text-fg-3 sm:inline">{current.name}</span>
        {crumbs.map((c, i) => (
          <React.Fragment key={c.href}>
            <span className="hidden text-fg-4 sm:inline">/</span>
            {i === crumbs.length - 1 ? (
              <span className="truncate font-medium text-fg">{c.label}</span>
            ) : (
              <Link href={c.href} className="truncate text-fg-3 hover:text-fg-2">
                {c.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/dashboard/orders"
          className="hidden h-7 items-center gap-2 rounded-full border border-line bg-surface/70 pr-3 pl-2.5 text-xs text-fg-2 transition-colors hover:border-line-strong md:flex"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-ok" />
          </span>
          <span className="font-mono nums text-fg">{data.salesLastHour}</span>
          <span className="text-fg-3">продаж за час</span>
        </Link>

        <Notifications data={data} now={now} />

        <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
          <a href={current.storefrontUrl} target="_blank" rel="noreferrer">
            Магазин <ArrowUpRight />
          </a>
        </Button>
      </div>
    </header>
  );
}

function buildCrumbs(pathname: string, label?: string) {
  const crumbs: { href: string; label: string }[] = [];
  const item = findNavItem(pathname);
  if (item) crumbs.push({ href: item.href, label: label ?? item.label });
  if (item && pathname !== item.href) {
    const rest = pathname.slice(item.href.length).split("/").filter(Boolean);
    if (rest.length) crumbs.push({ href: pathname, label: rest[rest.length - 1] === "new" ? "Новый" : decodeURIComponent(rest[rest.length - 1]) });
  }
  if (!crumbs.length) crumbs.push({ href: "/dashboard", label: "Обзор" });
  return crumbs;
}

function Notifications({ data, now }: { data: ShellData; now: number }) {
  const [seen, setSeen] = React.useState(false);
  const unread = seen ? 0 : Math.min(data.notifications.length, 4);
  return (
    <Popover onOpenChange={(o) => o && setSeen(true)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Уведомления" className="relative">
          <Bell />
          {unread ? (
            <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-azure-500 font-mono text-[9px] font-bold text-white ring-2 ring-canvas">
              {unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-[13px] font-semibold">Уведомления</p>
          <Link href="/dashboard/integrations" className="text-xs text-fg-3 hover:text-fg-2">
            Дублировать в Telegram
          </Link>
        </div>
        <ul className="max-h-[420px] overflow-y-auto py-1">
          {data.notifications.slice(0, 9).map((n) => {
            const meta = KIND_ICON[n.kind];
            const Icon = meta.icon;
            const body = (
              <div className="flex gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]">
                <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface-3", meta.cls)}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-fg">{n.title}</p>
                  {n.description ? <p className="mt-0.5 truncate text-xs text-fg-3">{n.description}</p> : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[10.5px] text-fg-4">{formatRelative(n.at, now)}</p>
                  {n.amount ? <p className="mt-0.5 font-mono text-[11px] text-fg-2 nums">{formatMoney(n.amount)}</p> : null}
                </div>
              </div>
            );
            return <li key={n.id}>{n.href ? <Link href={n.href}>{body}</Link> : body}</li>;
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
