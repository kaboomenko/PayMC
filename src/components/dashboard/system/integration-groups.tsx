"use client";

import * as React from "react";
import Link from "next/link";
import { BellRing, Loader2, MoreHorizontal, PlugZap, RefreshCw, Settings2, Unplug } from "lucide-react";
import { cn } from "@/lib/utils";
import { integrationCategoryMeta } from "@/lib/mock/meta";
import type { Integration } from "@/lib/mock/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toaster";
import { MetrikaSheet, VkSheet } from "./integration-sheets";

const ORDER: Integration["category"][] = ["community", "notifications", "tax", "analytics", "developer", "monitoring"];
const STATUS: Record<Integration["status"], { label: string; tone: "ok" | "neutral" | "outline" }> = {
  connected: { label: "Подключено", tone: "ok" },
  available: { label: "Доступно", tone: "neutral" },
  soon: { label: "Скоро", tone: "outline" },
};

/** Where "Настроить" leads for integrations that have a section on this page… */
const ANCHOR: Record<string, string> = { webhooks: "webhooks", api: "api-keys" };
/** …or a section elsewhere in the dashboard… */
const ROUTE: Record<string, string> = { nalog: "/dashboard/finance?tab=taxes" };
/** …or its own settings sheet. */
type SheetId = "vk" | "metrika";
const SHEET: Record<string, SheetId> = { vk: "vk", metrika: "metrika" };

export function IntegrationGroups({ items }: { items: Integration[] }) {
  const [status, setStatus] = React.useState<Record<string, Integration["status"]>>(() => Object.fromEntries(items.map((i) => [i.id, i.status])));
  const [detail, setDetail] = React.useState<Record<string, string | undefined>>(() => Object.fromEntries(items.map((i) => [i.id, i.detail])));
  const [busy, setBusy] = React.useState<string | null>(null);
  const [sheet, setSheet] = React.useState<SheetId | null>(null);

  const groups = ORDER.map((cat) => ({ cat, list: items.filter((i) => i.category === cat) })).filter((g) => g.list.length);
  const connected = Object.values(status).filter((s) => s === "connected").length;

  function connect(i: Integration) {
    setBusy(i.id);
    setTimeout(() => {
      setBusy(null);
      setStatus((s) => ({ ...s, [i.id]: "connected" }));
      toast.success(`${i.name}: подключено`, { description: "Первые события придут в течение минуты" });
    }, 900);
  }

  function disconnect(i: Integration) {
    setStatus((s) => ({ ...s, [i.id]: "available" }));
    toast(`${i.name} отключено`, {
      description: "События перестали отправляться",
      action: { label: "Вернуть", onClick: () => setStatus((s) => ({ ...s, [i.id]: "connected" })) },
    });
  }

  return (
    <section aria-labelledby="int-all">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 id="int-all" className="text-[15px] font-medium text-fg">
            Все интеграции
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-3">
            Подключено {connected} из {items.length}. Подключение — в один клик, отключить можно в любой момент.
          </p>
        </div>
      </div>
      <div className="gap-4 lg:columns-2">
        {groups.map(({ cat, list }) => (
          <div key={cat} className="mb-4 break-inside-avoid rounded-xl border border-line bg-surface shadow-raise">
            <p className="border-b border-line-soft px-5 py-2.5 label-mono text-fg-3">{integrationCategoryMeta[cat].label}</p>
            <ul>
              {list.map((i) => {
                const st = status[i.id];
                const meta = STATUS[st];
                return (
                  <li key={i.id} className="flex flex-col gap-3 border-b border-line-soft px-5 py-3.5 last:border-0 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className={cn("text-[13px] font-medium", st === "soon" ? "text-fg-2" : "text-fg")}>{i.name}</span>
                        <Badge tone={meta.tone} dot={st === "connected"}>
                          {meta.label}
                        </Badge>
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-fg-3">{i.description}</p>
                      {st === "connected" && detail[i.id] ? <p className="mt-1.5 font-mono text-[11.5px] text-fg-2">{detail[i.id]}</p> : null}
                      {i.id === "discord" ? <p className="mt-1.5 text-[11.5px] text-warn">Заблокирован в РФ — для игроков из России используйте Telegram и VK</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {st === "connected" ? (
                        <>
                          {ANCHOR[i.id] ? (
                            <Button asChild variant="secondary" size="xs">
                              <a href={`#${ANCHOR[i.id]}`}>
                                <Settings2 />
                                Настроить
                              </a>
                            </Button>
                          ) : ROUTE[i.id] ? (
                            <Button asChild variant="secondary" size="xs">
                              <Link href={ROUTE[i.id]}>
                                <Settings2 />
                                Настроить
                              </Link>
                            </Button>
                          ) : SHEET[i.id] ? (
                            <Button variant="secondary" size="xs" onClick={() => setSheet(SHEET[i.id])}>
                              <Settings2 />
                              Настроить
                            </Button>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-xs" aria-label={`Ещё действия: ${i.name}`}>
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => toast.success(`${i.name}: соединение работает`, { description: "Ответ за 84 мс" })}>
                                <RefreshCw />
                                Проверить соединение
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem destructive onSelect={() => disconnect(i)}>
                                <Unplug />
                                Отключить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ) : st === "available" ? (
                        <Button variant="secondary" size="xs" onClick={() => connect(i)} disabled={busy === i.id}>
                          {busy === i.id ? <Loader2 className="animate-spin" /> : <PlugZap />}
                          {busy === i.id ? "Подключаем" : "Подключить"}
                        </Button>
                      ) : (
                        <>
                          <Button variant="secondary" size="xs" disabled>
                            Скоро
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Сообщить о запуске: ${i.name}`}
                            onClick={() => toast.success("Сообщим о запуске", { description: `${i.name} · письмо придёт на artem@arcticmc.ru` })}
                          >
                            <BellRing />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <VkSheet open={sheet === "vk"} onOpenChange={(v) => setSheet(v ? "vk" : null)} />
      <MetrikaSheet
        open={sheet === "metrika"}
        onOpenChange={(v) => setSheet(v ? "metrika" : null)}
        onSaved={(d) => setDetail((s) => ({ ...s, metrika: d }))}
      />
    </section>
  );
}
