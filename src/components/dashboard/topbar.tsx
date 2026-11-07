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
import { formatRelative, formatMoney, plural } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { findNavItem } from "./nav";
import type { ShellData } from "./shell-types";
import type { ActivityKind } from "@/lib/mock/types";

const KIND_ICON: Record<ActivityKind, { icon: React.ComponentType<{ className?: string }>; dot?: string }> = {
  order: { icon: CircleDollarSign },
  delivery_failed: { icon: AlertTriangle, dot: "bg-warn" },
  awaiting_player: { icon: Clock },
  payout: { icon: Wallet, dot: "bg-ok" },
  chargeback: { icon: ShieldAlert, dot: "bg-bad" },
  server_offline: { icon: ServerCrash, dot: "bg-bad" },
  server_online: { icon: Server, dot: "bg-ok" },
  campaign: { icon: Megaphone },
  member: { icon: UserPlus },
  receipt: { icon: FileCheck2 },
  fraud_blocked: { icon: ShieldCheck },
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
  const crumbs = buildCrumbs(pathname, item?.label, data.search);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line-soft bg-canvas px-4 lg:px-6">
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
          <span aria-hidden className="size-2 shrink-0 animate-pulse-dot rounded-full bg-ok text-ok/40" />
          <span className="font-mono nums text-fg">{data.salesLastHour}</span>
          <span className="text-fg-3">{plural(data.salesLastHour, ["продажа", "продажи", "продаж"])} за час</span>
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

function buildCrumbs(pathname: string, label: string | undefined, search: ShellData["search"]) {
  const crumbs: { href: string; label: string }[] = [];
  const item = findNavItem(pathname);
  if (item) crumbs.push({ href: item.href, label: label ?? item.label });
  if (item && pathname !== item.href) {
    const rest = pathname.slice(item.href.length).split("/").filter(Boolean);
    const last = rest[rest.length - 1];
    if (last) {
      const known = search.find((s) => s.href === pathname)?.label;
      const fallback =
        last === "new"
          ? item.href.endsWith("/products")
            ? "Новый товар"
            : "Новый"
          : item.href.endsWith("/players")
            ? "Профиль игрока"
            : item.href.endsWith("/products")
              ? "Товар"
              : decodeURIComponent(last);
      crumbs.push({ href: pathname, label: known ?? fallback });
    }
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
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-azure-500 px-1 font-mono text-[11px] leading-none font-medium text-white ring-2 ring-canvas">
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
                <span className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface-3 text-fg-3">
                  <Icon className="size-3.5" />
                  {meta.dot ? <span aria-hidden className={cn("absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2 ring-surface-2", meta.dot)} /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-fg">{n.title}</p>
                  {n.description ? <p className="mt-0.5 truncate text-xs text-fg-3">{n.description}</p> : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[11px] text-fg-4">{formatRelative(n.at, now)}</p>
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
