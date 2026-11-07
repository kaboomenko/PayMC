"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command, defaultFilter } from "cmdk";
import { Dialog as D } from "radix-ui";
import {
  ArrowRight,
  CornerDownLeft,
  Package,
  PackagePlus,
  Receipt,
  RotateCcw,
  Search,
  TicketPlus,
  UserRound,
  Wallet,
  Megaphone,
  Server,
} from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { toast } from "@/components/ui/toaster";
import { NAV } from "./nav";
import type { ShellData } from "./shell-types";

/* Search that forgives the wrong keyboard layout: «dbg» finds «вип», «rjnbr» finds «котик». */
const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const RU = "йцукенгшщзхъфывапролджэячсмитьбюё";
const swapLayout = (text: string) =>
  [...text.toLowerCase()]
    .map((ch) => {
      const i = EN.indexOf(ch);
      if (i >= 0) return RU[i];
      const j = RU.indexOf(ch);
      return j >= 0 ? EN[j] : ch;
    })
    .join("");

function layoutTolerantFilter(value: string, search: string, keywords?: string[]) {
  // order ids must match exactly, not fuzzily (PMC-104883 ≠ PMC-105488)
  if (/^pmc-?\d+$/i.test(search.trim())) {
    if (value.startsWith("open-order")) return 1;
    return value.toLowerCase().includes(search.trim().toLowerCase()) ? 0.95 : 0;
  }
  const direct = defaultFilter(value, search, keywords);
  if (direct > 0 || !search) return direct;
  return defaultFilter(value, swapLayout(search), keywords) * 0.9;
}

const itemCls =
  "group flex h-10 cursor-default select-none items-center gap-3 rounded-md px-2.5 text-[13px] text-fg-2 outline-none data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-fg [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-4 data-[selected=true]:[&_svg]:text-azure-300";

const groupCls =
  "[&_[cmdk-group-heading]]:label-mono [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]: [&_[cmdk-group-heading]]:text-fg-4";

export function CommandPalette({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShellData;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  const go = React.useCallback(
    (href: string) => {
      onOpenChange(false);
      setQuery("");
      router.push(href);
    },
    [onOpenChange, router],
  );

  const action = (label: string, description?: string) => {
    onOpenChange(false);
    setQuery("");
    toast.success(label, description ? { description } : undefined);
  };

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-[2px]" />
        <D.Content
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-[620px] -translate-x-1/2 overflow-hidden rounded-xl border border-line-strong bg-surface-2 shadow-pop outline-none data-[state=open]:animate-[fade-up_0.18s_var(--ease-snappy)]"
        >
          <D.Title className="sr-only">Поиск и команды</D.Title>
          <Command loop filter={layoutTolerantFilter} className="flex flex-col" label="Поиск и команды">
            <div className="flex h-12 items-center gap-2.5 border-b border-line px-4">
              <Search className="size-4 text-fg-3" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                autoFocus
                placeholder="Заказ, игрок, товар или команда…"
                className="h-full flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-4"
              />
              <Kbd>esc</Kbd>
            </div>
            <Command.List className="max-h-[min(440px,60vh)] overflow-y-auto p-1.5">
              <Command.Empty className="py-10 text-center text-[13px] text-fg-3">
                Ничего не нашли по запросу «{query}»
              </Command.Empty>

              <Command.Group heading="Действия" className={groupCls}>
                <Command.Item className={itemCls} onSelect={() => go("/dashboard/products/new")} keywords={["товар", "создать"]}>
                  <PackagePlus /> Создать товар
                  <span className="ml-auto text-xs text-fg-4">с готовыми командами</span>
                </Command.Item>
                <Command.Item className={itemCls} onSelect={() => go("/dashboard/promo?new=1")} keywords={["промокод", "скидка"]}>
                  <TicketPlus /> Создать промокод
                </Command.Item>
                <Command.Item className={itemCls} onSelect={() => go("/dashboard/campaigns?new=1")} keywords={["кампания", "рассылка"]}>
                  <Megaphone /> Новая кампания в игре
                </Command.Item>
                <Command.Item
                  className={itemCls}
                  onSelect={() => action("Повторная выдача запущена", "3 заказа отправлены на сервер повторно")}
                  keywords={["повтор", "выдача", "ошибка"]}
                >
                  <RotateCcw /> Повторить все неудачные выдачи
                  <span className="ml-auto font-mono text-xs text-warn">{data.issues}</span>
                </Command.Item>
                <Command.Item className={itemCls} onSelect={() => go("/dashboard/finance?payout=1")} keywords={["вывод", "выплата"]}>
                  <Wallet /> Вывести деньги сейчас
                </Command.Item>
                <Command.Item className={itemCls} onSelect={() => go("/dashboard/servers?connect=1")} keywords={["сервер", "подключить", "плагин"]}>
                  <Server /> Подключить сервер
                </Command.Item>
              </Command.Group>

              <Command.Group heading="Переходы" className={groupCls}>
                {NAV.flatMap((g) => g.items).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item key={item.href} value={`${item.label} ${item.hint ?? ""}`} className={itemCls} onSelect={() => go(item.href)}>
                      <Icon />
                      <span>{item.label}</span>
                      {item.hint ? <span className="truncate text-xs text-fg-4">{item.hint}</span> : null}
                      {item.key ? (
                        <span className="ml-auto flex items-center gap-1">
                          <Kbd>G</Kbd>
                          <Kbd>{item.key.toUpperCase()}</Kbd>
                        </span>
                      ) : null}
                    </Command.Item>
                  );
                })}
              </Command.Group>

              {/^pmc-\d{5,}$/i.test(query.trim()) ? (
                <Command.Group heading="Заказ" className={groupCls} forceMount>
                  <Command.Item
                    forceMount
                    value={`open-order ${query}`}
                    className={itemCls}
                    onSelect={() => go(`/dashboard/orders?id=${query.trim().toUpperCase()}`)}
                  >
                    <Receipt /> Открыть заказ <span className="font-mono">{query.trim().toUpperCase()}</span>
                    <span className="ml-auto text-xs text-fg-4">трасса выдачи и детали</span>
                  </Command.Item>
                </Command.Group>
              ) : null}

              {query.length > 1 ? (
                <Command.Group heading="Данные" className={groupCls}>
                  {data.search.map((s) => (
                    <Command.Item key={s.id} value={`${s.label} ${s.sub}`} className={itemCls} onSelect={() => go(s.href)}>
                      {s.kind === "order" ? <Receipt /> : s.kind === "player" ? <UserRound /> : <Package />}
                      <span className="font-medium">{s.label}</span>
                      <span className="truncate text-xs text-fg-4">{s.sub}</span>
                      <ArrowRight className="ml-auto opacity-0 group-data-[selected=true]:opacity-100" />
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {query.trim().length > 1 ? (
                <Command.Group heading="Искать везде" className={groupCls} forceMount>
                  <Command.Item
                    forceMount
                    value={`search-orders ${query}`}
                    className={itemCls}
                    onSelect={() => go(`/dashboard/orders?q=${encodeURIComponent(query.trim())}&days=90`)}
                  >
                    <Search /> Искать «{query.trim()}» в заказах за 90 дней
                  </Command.Item>
                  <Command.Item
                    forceMount
                    value={`search-players ${query}`}
                    className={itemCls}
                    onSelect={() => go(`/dashboard/players?q=${encodeURIComponent(query.trim())}`)}
                  >
                    <UserRound /> Искать «{query.trim()}» среди всех игроков
                  </Command.Item>
                </Command.Group>
              ) : null}
            </Command.List>
            <div className="flex h-9 items-center gap-4 border-t border-line px-4 text-[11px] text-fg-4">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> выбор
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>
                  <CornerDownLeft className="size-3" />
                </Kbd>
                открыть
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <Kbd>G</Kbd> + буква — быстрый переход
              </span>
            </div>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
