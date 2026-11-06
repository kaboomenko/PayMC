"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Check, ChevronsUpDown, LifeBuoy, LogOut, Plus, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { LogoMark } from "@/components/brand/logo";
import { Kbd } from "@/components/ui/kbd";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV } from "./nav";
import type { ShellData, ShellProject } from "./shell-types";
import { GameChip } from "./game-chip";

export function Sidebar({
  data,
  onOpenPalette,
  onNavigate,
  className,
}: {
  data: ShellData;
  onOpenPalette: () => void;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const current = data.projects.find((p) => p.id === data.currentProjectId) ?? data.projects[0];

  return (
    <aside className={cn("flex h-full w-full flex-col", className)}>
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        <ProjectSwitcher projects={data.projects} current={current} />
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onOpenPalette}
          className="group flex h-8 w-full items-center gap-2 rounded-md border border-line bg-surface/60 px-2.5 text-[13px] text-fg-3 transition-colors hover:border-line-strong hover:text-fg-2"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Поиск и команды</span>
          <Kbd className="h-[18px] text-[10px]">⌘K</Kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-1.5 pb-3">
        {NAV.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="label-mono mb-1 px-2 text-[10px] text-fg-4">{group.label}</p>
            <ul className="space-y-px">
              {group.items.map((item) => {
                const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
                const Icon = item.icon;
                const badge =
                  item.href === "/dashboard/orders" && data.issues > 0
                    ? { text: String(data.issues), tone: "warn" as const }
                    : item.href === "/dashboard/servers" && data.offlineServers > 0
                      ? { text: String(data.offlineServers), tone: "bad" as const }
                      : null;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex h-[30px] items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors",
                        active ? "bg-white/[0.07] text-fg" : "text-fg-3 hover:bg-white/[0.04] hover:text-fg-2",
                      )}
                    >
                      {active ? (
                        <span aria-hidden className="absolute top-[7px] bottom-[7px] -left-3 w-[2px] rounded-r-full bg-azure-400" />
                      ) : null}
                      <Icon className={cn("size-4 shrink-0", active ? "text-azure-300" : "text-fg-4 group-hover:text-fg-3")} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge ? (
                        <span
                          className={cn(
                            "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-semibold",
                            badge.tone === "warn" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad",
                          )}
                        >
                          {badge.text}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-1.5 border-t border-line-soft p-3">
        {data.goal ? (
          <Link
            href="/dashboard/storefront"
            onClick={onNavigate}
            className="block rounded-lg border border-line bg-surface/60 px-2.5 py-2 transition-colors hover:border-line-strong"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="label-mono text-[10px] text-fg-4">Цель месяца</span>
              <span className="font-mono text-ice-300 nums">{Math.round((data.goal.raised / data.goal.target) * 100)}%</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-fg-2">{data.goal.title}</p>
            <Progress value={data.goal.raised} max={data.goal.target} tone="ice" size="sm" className="mt-1.5" />
            <p className="mt-1 font-mono text-[10.5px] text-fg-4 nums">
              {formatMoney(data.goal.raised)} из {formatMoney(data.goal.target)}
            </p>
          </Link>
        ) : null}
        <a
          href={current.storefrontUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-fg-3 transition-colors hover:bg-white/[0.04] hover:text-fg-2"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-50" />
            <span className="relative inline-flex size-2 rounded-full bg-ok" />
          </span>
          <span className="flex-1 truncate">Магазин открыт</span>
          <ArrowUpRight className="size-3.5" />
        </a>
        <UserMenu user={data.user} />
      </div>
    </aside>
  );
}

function ProjectSwitcher({ projects, current }: { projects: ShellProject[]; current: ShellProject }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2.5 rounded-md px-1.5 text-left transition-colors hover:bg-white/[0.04] data-[state=open]:bg-white/[0.05]"
        >
          <GameChip game={current.game} size={28} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] leading-tight font-semibold text-fg">{current.name}</span>
            <span className="block truncate text-[11px] leading-tight text-fg-3">
              {current.gameName} · {current.planLabel}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 text-fg-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Проекты</DropdownMenuLabel>
        {projects.map((p) => (
          <DropdownMenuItem key={p.id} className="h-10">
            <GameChip game={p.game} size={22} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-fg">{p.name}</span>
              <span className="block truncate text-[11px] text-fg-4">
                {p.gameName} · {p.planLabel}
              </span>
            </span>
            {p.id === current.id ? <Check className="size-4 text-azure-400!" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding">
            <Plus /> Новый проект
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ user }: { user: { name: string; email: string } }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2.5 rounded-md px-1.5 text-left transition-colors hover:bg-white/[0.04] data-[state=open]:bg-white/[0.05]"
        >
          <Avatar name={user.name} size={26} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] leading-tight font-medium text-fg">{user.name}</span>
            <span className="block truncate text-[11px] leading-tight text-fg-4">{user.email}</span>
          </span>
          <ChevronsUpDown className="size-3.5 text-fg-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <UserRound /> Профиль и безопасность
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="https://docs.paymc.ru" target="_blank" rel="noreferrer">
            <LifeBuoy /> Документация и поддержка
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <LogOut /> Выйти
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SidebarBrand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <LogoMark size={20} />
    </Link>
  );
}
