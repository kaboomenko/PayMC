"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3, Loader2, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PixelAvatar } from "@/components/ui/avatar";
import { StatusDot } from "@/components/ui/status-dot";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { formatMoney, formatRelative, plural } from "@/lib/format";
import { PanelHeader } from "./bits";
import type { AttentionData, AttentionOrder } from "./types";

type RetryState = "idle" | "sending" | "sent";

export function AttentionCard({ data, now }: { data: AttentionData; now: number }) {
  const [retry, setRetry] = React.useState<Record<string, RetryState>>({});
  const timers = React.useRef<number[]>([]);
  React.useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const allOrders = data.groups.flatMap((g) => g.orders);
  const open = allOrders.filter((o) => retry[o.id] !== "sent").length + data.groups.filter((g) => g.orders.length === 0).length;

  function resend(o: AttentionOrder) {
    setRetry((r) => ({ ...r, [o.id]: "sending" }));
    timers.current.push(
      window.setTimeout(() => {
        setRetry((r) => ({ ...r, [o.id]: "sent" }));
        toast.success("Выдача отправлена повторно", { description: `${o.id} · ${o.playerName} · ${o.item}` });
      }, 650),
    );
  }

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader
        title="Требует внимания"
        meta={
          data.groups.length ? (
            <Badge tone={open ? "warn" : "ok"} className="font-mono nums">
              {open}
            </Badge>
          ) : null
        }
        actions={
          <Link
            href="/dashboard/orders?view=issues"
            className="inline-flex items-center gap-1 rounded-sm text-xs text-fg-3 transition-colors hover:text-fg"
          >
            Все сбои <ArrowRight className="size-3.5" />
          </Link>
        }
      />

      {data.groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <Check className="size-5 text-ok" />
          <p className="mt-2 text-sm text-fg">Всё выдано, серверы на связи</p>
          <p className="mt-1 max-w-64 text-[13px] text-fg-3">Сбои выдачи и проблемы серверов появятся здесь первыми — и в Telegram.</p>
        </div>
      ) : (
        <div className="divide-y divide-line-soft">
          {data.groups.map((g) => (
            <section key={g.id} className="px-4 py-3 sm:px-5" aria-label={`${g.server}: ${g.title}`}>
              <div className="flex items-start gap-2.5">
                <StatusDot tone={g.tone} className="mt-1.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug">
                    <span className="font-medium text-fg">{g.server}</span>
                    <span className="text-fg-3"> — {g.title}</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-fg-3">{g.detail}</p>
                </div>
                <Link
                  href={g.href}
                  className="mt-px shrink-0 rounded-sm text-xs font-medium text-azure-300 transition-colors hover:text-azure-200"
                >
                  {g.cta}
                </Link>
              </div>

              {g.console ? (
                <div className="mt-2 ml-[18px] overflow-hidden rounded-md border border-line-soft bg-canvas px-2.5 py-1.5 font-mono text-[11px] leading-[1.6]">
                  <p className="truncate text-fg-2">
                    <span className="text-fg-4 select-none">&gt; </span>
                    {g.console.command}
                  </p>
                  <p className="truncate text-bad/90">{g.console.output}</p>
                </div>
              ) : null}

              {g.orders.length ? (
                <ul className="mt-1.5 ml-[18px]">
                  {g.orders.map((o) => {
                    const state = retry[o.id] ?? "idle";
                    return (
                      <li key={o.id} className={cn("flex h-9 items-center gap-2 transition-opacity", state === "sent" && "opacity-55")}>
                        <PixelAvatar name={o.playerName} size={20} />
                        <span className="min-w-0 flex-1 truncate text-[12.5px]">
                          <Link href={`/dashboard/orders?id=${o.id}`} className="font-medium text-fg underline-offset-2 hover:underline">
                            {o.playerName}
                          </Link>
                          <span className="text-fg-3"> · {state === "sent" ? "отправили, ждём сервер" : o.item}</span>
                        </span>
                        <span className="hidden shrink-0 font-mono text-[11px] text-fg-4 nums sm:inline xl:hidden 2xl:inline" title={formatMoney(o.amount)}>
                          {formatRelative(o.createdAt, now)}
                        </span>
                        <Button
                          size="xs"
                          variant="secondary"
                          className="h-6 shrink-0 px-2"
                          disabled={state !== "idle"}
                          onClick={() => resend(o)}
                          aria-label={`Повторить выдачу ${o.id}`}
                        >
                          {state === "sending" ? <Loader2 className="animate-spin" /> : state === "sent" ? <Check /> : <RotateCcw />}
                          {state === "sent" ? "Готово" : "Повторить"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      )}

      {data.awaiting ? (
        <Link
          href="/dashboard/orders?view=awaiting"
          className="mt-auto flex items-start gap-2.5 border-t border-line px-4 py-3 text-xs leading-snug text-fg-3 transition-colors hover:text-fg-2 sm:px-5"
        >
          <Clock3 className="mt-px size-3.5 shrink-0 text-fg-3" />
          <span>
            <span className="font-mono text-fg-2 nums">{data.awaiting}</span>{" "}
            {plural(data.awaiting, ["заказ ждёт", "заказа ждут", "заказов ждут"])} входа игрока — это нормально, выдадим автоматически
          </span>
        </Link>
      ) : null}
    </Card>
  );
}
