"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpCircle, CircleAlert, Clock3, CornerDownRight, ListChecks, Loader2, Play, PlugZap, Power, RotateCcw, ServerCrash, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatNumber, formatPercent, formatRelative, formatTime, plural, pluralize } from "@/lib/format";
import { connectionMeta, serverStatusMeta } from "@/lib/mock/meta";
import type { GameId } from "@/lib/mock/types";
import { GAMES } from "@/lib/games";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PixelAvatar } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkline } from "@/components/ui/sparkline";
import { StatusDot } from "@/components/ui/status-dot";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { DeliveryConsole } from "@/components/dashboard/products/delivery-console";
import { buildDryRun, simulateOutput, type DryRunResult } from "@/components/dashboard/products/dry-run";
import { FixSteps } from "./fix-steps";
import { UptimeStrip } from "./uptime-strip";
import { LATEST_AGENT, type JournalItem, type QueueItem, type ServerSettings, type ServerView } from "./types";

const STATUS_TONE = { online: "ok", degraded: "warn", offline: "bad" } as const;
const REASON = {
  server_offline: { label: "Ждём сервер", tone: "bad" as const },
  retrying: { label: "Повтор", tone: "warn" as const },
  awaiting_player: { label: "Ждёт входа", tone: "ice" as const },
};
/** Gaps between attempts: attempt 1 right after payment (5 s timeout), then 30 с → 1 → 2 → 5 мин, then every 5 мин. */
const RETRY_STEPS = [
  { label: "30 с", ms: 30_000 },
  { label: "1 мин", ms: 60_000 },
  { label: "2 мин", ms: 120_000 },
  { label: "5 мин", ms: 300_000 },
];
const gapBefore = (attempt: number) => RETRY_STEPS[attempt - 2]?.ms ?? 300_000;

/** Where a retrying command is in the chain right now — derived from its age, so it matches the settings. */
function retryProgress(createdAt: string, now: number, max: number) {
  const elapsed = now - new Date(createdAt).getTime();
  let made = 1;
  let at = 0;
  while (made < max && at + gapBefore(made + 1) <= elapsed) {
    at += gapBefore(made + 1);
    made += 1;
  }
  return { made, exhausted: made >= max, nextInMs: made >= max ? 0 : at + gapBefore(made + 1) - elapsed };
}

const inShort = (ms: number) => (ms < 90_000 ? `${Math.max(5, Math.round(ms / 1000))}\u00a0с` : `${Math.round(ms / 60_000)}\u00a0мин`);

export function ServerSheet({
  server,
  open,
  onOpenChange,
  queue,
  onQueueChange,
  journal,
  settings,
  onSettingsChange,
  game,
  now,
  onDisconnect,
}: {
  server: ServerView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue: QueueItem[];
  onQueueChange: (q: QueueItem[]) => void;
  journal: JournalItem[];
  settings: ServerSettings;
  onSettingsChange: (patch: Partial<ServerSettings>) => void;
  game: GameId;
  now: number;
  onDisconnect: (s: ServerView) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="max-w-[640px]"
        onOpenAutoFocus={(e) => {
          // focus the panel itself, not the first copy button (avoids a stray focus ring)
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        {server ? (
          <SheetInner
            key={server.id}
            server={server}
            queue={queue}
            onQueueChange={onQueueChange}
            journal={journal}
            settings={settings}
            onSettingsChange={onSettingsChange}
            game={game}
            now={now}
            onDisconnect={onDisconnect}
          />
        ) : (
          <SheetHeader>
            <SheetTitle>Сервер</SheetTitle>
            <SheetDescription>Сервер не найден</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SheetInner({
  server: s,
  queue,
  onQueueChange,
  journal,
  settings,
  onSettingsChange,
  game,
  now,
  onDisconnect,
}: {
  server: ServerView;
  queue: QueueItem[];
  onQueueChange: (q: QueueItem[]) => void;
  journal: JournalItem[];
  settings: ServerSettings;
  onSettingsChange: (patch: Partial<ServerSettings>) => void;
  game: GameId;
  now: number;
  onDisconnect: (s: ServerView) => void;
}) {
  const [tab, setTab] = React.useState(queue.length ? "queue" : "journal");
  const [busy, setBusy] = React.useState<Set<string>>(new Set());
  const { offlineMode, attempts } = settings;
  const [confirmOff, setConfirmOff] = React.useState(false);
  const [test, setTest] = React.useState<{ result: DryRunResult; key: number } | null>(null);
  const [testRunning, setTestRunning] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const meta = serverStatusMeta[s.status];

  const execute = (item: QueueItem) => {
    if (s.status === "offline") {
      toast.error(`«${s.name}» не на связи`, { description: "Команда останется в очереди и выполнится сама после подключения агента" });
      return;
    }
    if (item.reason === "awaiting_player") {
      toast(`${item.playerName} не в сети`, { description: "Команда требует игрока онлайн — выполним при входе. Можно отменить и выдать вручную." });
      return;
    }
    setBusy((b) => new Set(b).add(item.id));
    window.setTimeout(() => {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(item.id);
        return n;
      });
      onQueueChange(queue.filter((q) => q.id !== item.id));
      toast.success(`Выполнено за ${formatDuration(s.latencyMs + 12)}`, { description: simulateOutput(item.command, item.playerName).text });
    }, Math.min(1400, 420 + s.latencyMs));
  };

  const cancel = (item: QueueItem) => {
    const idx = queue.findIndex((q) => q.id === item.id);
    onQueueChange(queue.filter((q) => q.id !== item.id));
    toast(`Команда по заказу ${item.orderId} отменена`, {
      description: "Деньги не возвращаются сами — при необходимости оформите возврат в заказе",
      action: {
        label: "Вернуть",
        onClick: () => {
          const next = queue.filter((q) => q.id !== item.id);
          next.splice(idx, 0, item);
          onQueueChange(next);
        },
      },
    });
  };

  const runTest = () => {
    const result = buildDryRun({
      commands: [
        { id: "t1", template: "say [PayMC] Тестовая выдача для {player}", serverId: "all", requireOnline: false },
        { id: "t2", template: "lp user {player} permission settemp paymc.test true 1m", serverId: "all", requireOnline: false },
      ],
      server: { ...s, offlineSince: s.offlineSince },
      player: "kotik228",
      game,
      gameName: GAMES[game].name,
      durationDays: undefined,
      playerOffline: false,
    });
    setTest((t) => ({ result, key: (t?.key ?? 0) + 1 }));
    setTestRunning(true);
  };

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2.5">
          <StatusDot tone={STATUS_TONE[s.status]} />
          <SheetTitle>{s.name}</SheetTitle>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
        <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[12px] text-fg-2">{s.address}</span>
          <CopyButton value={s.address} label="Скопировать адрес" className="-my-1 size-6" />
          <span className="text-fg-4">·</span>
          <span>{s.platform}</span>
          <span className="text-fg-4">·</span>
          <span>{s.region}</span>
        </SheetDescription>
      </SheetHeader>

      <SheetBody className="space-y-5">
        {s.status === "offline" ? (
          <div className="rounded-lg border border-bad/30 bg-bad-soft/50 p-3.5">
            <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
              <ServerCrash className="size-4 text-bad" /> Нет связи с агентом {s.offlineMinutes} мин — с {s.offlineSince}
            </p>
            <p className="mt-1 text-[12.5px] text-fg-3">
              {queue.length
                ? `${pluralize(queue.length, ["команда ждёт", "команды ждут", "команд ждут"])} в очереди и ${plural(queue.length, ["выполнится сама", "выполнятся сами", "выполнятся сами"])} после подключения.`
                : "Очередь пуста."}{" "}
              Мы написали вам в Telegram.
            </p>
            <details className="group mt-3">
              <summary className="cursor-pointer list-none text-[12.5px] font-medium text-fg-2 marker:hidden hover:text-fg">
                <span className="underline decoration-line-strong underline-offset-4 group-open:hidden">Как починить</span>
                <span className="hidden underline decoration-line-strong underline-offset-4 group-open:inline">Скрыть шаги</span>
              </summary>
              <div className="mt-3">
                <FixSteps serverName={s.name} />
              </div>
            </details>
          </div>
        ) : null}

        {s.outdated ? (
          <div className="rounded-lg border border-warn/25 bg-warn-soft/40 p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <ArrowUpCircle className="hidden size-4 shrink-0 text-warn sm:mt-0.5 sm:block" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-fg">
                  Агент {s.agentVersion} устарел — доступна {LATEST_AGENT}
                </p>
                <p className="mt-0.5 text-[12.5px] text-fg-3">В {LATEST_AGENT} — переподключение без потери очереди и таймауты под загруженные серверы. Обновление без рестарта.</p>
                <CodeBlock className="mt-2.5" title="Консоль сервера" code="paymc update" />
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={updating}
                onClick={() => {
                  setUpdating(true);
                  window.setTimeout(() => {
                    setUpdating(false);
                    toast.success(`Агент на «${s.name}» обновлён до ${LATEST_AGENT}`, { description: "Соединение не прерывалось, очередь сохранена" });
                  }, 1600);
                }}
              >
                {updating ? <Loader2 className="animate-spin" /> : null}
                {updating ? "Обновляем…" : "Обновить"}
              </Button>
            </div>
          </div>
        ) : null}

        {/* health */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
          <Health label="Онлайн · 24 ч" value={`${formatNumber(s.online)} / ${formatNumber(s.maxOnline)}`}>
            <Sparkline data={s.onlineHistory} width={120} height={28} tone="azure" />
          </Health>
          <Health
            label="TPS · 24 ч"
            value={s.status === "offline" ? "—" : formatNumber(s.tps ?? 20, 1)}
            valueClass={s.status === "offline" ? "text-fg-4" : (s.tps ?? 20) >= 19 ? "text-fg" : (s.tps ?? 20) >= 17 ? "text-warn" : "text-bad"}
          >
            <Sparkline data={s.tpsHistory} width={120} height={28} tone={s.status === "online" ? "ok" : s.status === "degraded" ? "muted" : "bad"} />
          </Health>
          <Health
            label="Задержка · 24 ч"
            value={s.status === "offline" ? "—" : formatDuration(s.latencyMs)}
            valueClass={s.status === "offline" ? "text-fg-4" : s.latencyMs > 300 ? "text-warn" : "text-fg"}
          >
            <Sparkline data={s.latencyHistory} width={120} height={28} tone="ice" />
          </Health>
          <Health label="Аптайм · 30 дн" value={formatPercent(s.uptime30d, { digits: 2 })}>
            <UptimeStrip days={s.uptimeDays} tall className="w-[120px]" />
          </Health>
        </div>
        <p className="-mt-3 text-xs text-fg-4">
          {connectionMeta[s.connection].label} PayMC {s.agentVersion} · {connectionMeta[s.connection].description.toLowerCase()} · на связи{" "}
          {s.status === "offline" ? `в ${formatTime(s.lastSeenAt)}` : formatRelative(s.lastSeenAt, now)}
        </p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="pill">
            <TabsTrigger value="queue">
              Очередь
              <span className={cn("font-mono text-[11px] nums", queue.length ? "text-warn" : "text-fg-4")}>{queue.length}</span>
            </TabsTrigger>
            <TabsTrigger value="journal">Журнал выдачи</TabsTrigger>
            <TabsTrigger value="settings">Настройки</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="pt-4">
            {queue.length ? (
              <>
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-fg-3">{queueIntro(s.status, queue)}</p>
                  {s.status !== "offline" && queue.some((q) => q.reason === "retrying") ? (
                    <Button variant="secondary" size="xs" onClick={() => queue.filter((q) => q.reason === "retrying").forEach(execute)}>
                      <Play /> Повторить все
                    </Button>
                  ) : null}
                </div>
                <ol className="space-y-2">
                  {queue.map((q, i) => {
                    const r = REASON[q.reason];
                    const isBusy = busy.has(q.id);
                    const retry = q.reason === "retrying" ? retryProgress(q.createdAt, now, attempts) : null;
                    // nothing to run «now»: the player is offline or the agent is unreachable
                    const blocked =
                      q.reason === "awaiting_player"
                        ? `${q.playerName} не в сети — команда требует игрока онлайн и выполнится при входе. Срочно — отмените и выдайте вручную.`
                        : q.reason === "server_offline"
                          ? `«${s.name}» не на связи — выполним сами, когда агент подключится.`
                          : null;
                    const runButton = (
                      <Button variant="secondary" size="xs" onClick={() => execute(q)} disabled={isBusy || !!blocked}>
                        {isBusy ? <Loader2 className="animate-spin" /> : <Play />}
                        {isBusy ? "Выполняем…" : retry?.exhausted ? "Повторить вручную" : "Выполнить сейчас"}
                      </Button>
                    );
                    return (
                      <li key={q.id} className="rounded-lg border border-line bg-surface-2/50 p-3">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 font-mono text-[11px] text-fg-4 nums">{String(i + 1).padStart(2, "0")}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <PixelAvatar name={q.playerName} size={18} />
                              <span className="text-[13px] font-medium text-fg">{q.playerName}</span>
                              <span className="truncate text-xs text-fg-3">{q.productName}</span>
                              <Badge tone={r.tone} className="ml-auto">
                                {r.label}
                              </Badge>
                            </div>
                            <p className="mt-2 rounded-md border border-line-soft bg-[#06080c] px-2.5 py-1.5 font-mono text-[11.5px] break-all text-fg-2">
                              <span className="text-fg-4 select-none">$ </span>
                              {q.command}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Link href={`/dashboard/orders?id=${q.orderId}`} className="font-mono text-[11px] text-fg-3 underline-offset-4 hover:text-fg-2 hover:underline">
                                {q.orderId}
                              </Link>
                              <span className="text-[11px] text-fg-4">
                                <Clock3 className="mr-1 inline size-3 -translate-y-px" />
                                {formatRelative(q.createdAt, now)}
                                {retry ? (
                                  retry.exhausted ? (
                                    <span className="text-warn"> · {pluralize(attempts, ["попытка", "попытки", "попыток"])} без ответа — алерт в Telegram</span>
                                  ) : (
                                    ` · попытка ${retry.made} из ${attempts}, следующая через ${inShort(retry.nextInMs)}`
                                  )
                                ) : null}
                              </span>
                              <span className="ml-auto flex gap-1">
                                <Button variant="ghost" size="xs" onClick={() => cancel(q)} disabled={isBusy}>
                                  <X /> Отменить
                                </Button>
                                {blocked ? (
                                  <Tooltip content={blocked} side="top" align="end">
                                    {/* disabled buttons swallow hover — the wrapper keeps the hint reachable by mouse and keyboard */}
                                    <span tabIndex={0} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-azure-400/60">
                                      {runButton}
                                    </span>
                                  </Tooltip>
                                ) : (
                                  runButton
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <EmptyState
                icon={<ListChecks />}
                title="Очередь пуста"
                description="Все команды выполнены. Если сервер перезагрузится или игрок выйдет до выдачи, команды подождут здесь."
                className="py-10"
              />
            )}
          </TabsContent>

          <TabsContent value="journal" className="pt-4">
            {journal.length ? (
              <div className="overflow-hidden rounded-lg border border-line bg-[#06080c]">
                <div className="flex h-8 items-center justify-between border-b border-line-soft px-3">
                  <span className="label-mono text-[10px] text-fg-4">{pluralize(journal.length, ["команда", "команды", "команд"])} · новые сверху</span>
                  <span className="font-mono text-[10.5px] text-fg-4">МСК</span>
                </div>
                <ul className="divide-y divide-line-soft">
                  {journal.map((j) => (
                    <li key={j.id} className="px-3 py-2 font-mono text-[11.5px] leading-[1.6]">
                      <div className="flex items-center gap-2 text-[10.5px] text-fg-4">
                        <span className="nums">{formatTime(j.at, true)}</span>
                        <span className="text-fg-3">{j.playerName}</span>
                        <Link href={`/dashboard/orders?id=${j.orderId}`} className="hover:text-fg-2">
                          {j.orderId}
                        </Link>
                        {j.ms !== undefined ? <span className="ml-auto nums">{formatDuration(j.ms)}</span> : null}
                      </div>
                      <p className="break-all text-fg-2">
                        <span className="text-fg-4 select-none">$ </span>
                        {j.command}
                      </p>
                      <p className={cn("flex items-start gap-1", j.ok ? "text-ice-300/90" : "text-bad")}>
                        {j.ok ? <CornerDownRight className="mt-[4px] size-3 shrink-0 text-fg-4" /> : <CircleAlert className="mt-[4px] size-3 shrink-0" />}
                        <span className="break-all">{j.output || "OK"}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState icon={<ListChecks />} title="Команд ещё не было" description="Здесь появится каждая выполненная команда с ответом сервера." className="py-10" />
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-5 pt-4">
            <SettingBlock title="Если игрок или сервер офлайн">
              <div role="radiogroup" aria-label="Поведение при офлайне" className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { v: "queue", t: "Копить в очереди", d: "Выполним, как только сервер и игрок будут на связи. Подходит для привилегий и валюты." },
                    { v: "on_join", t: "Выдавать при входе", d: "Ждём именно входа игрока — для наборов и предметов в инвентарь." },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={offlineMode === o.v}
                    onClick={() => {
                      if (offlineMode === o.v) return;
                      onSettingsChange({ offlineMode: o.v });
                      toast.success("Настройка сохранена", { description: `${s.name}: ${o.t.toLowerCase()}` });
                    }}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      offlineMode === o.v ? "border-azure-400/50 bg-azure-500/[0.08]" : "border-line hover:border-line-strong",
                    )}
                  >
                    <span className="flex items-center gap-2 text-[13px] font-medium text-fg">
                      <span className={cn("flex size-3.5 items-center justify-center rounded-full border", offlineMode === o.v ? "border-azure-400" : "border-line-strong")}>
                        {offlineMode === o.v ? <span className="size-1.5 rounded-full bg-azure-400" /> : null}
                      </span>
                      {o.t}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-fg-3">{o.d}</span>
                  </button>
                ))}
              </div>
            </SettingBlock>

            <SettingBlock
              title="Повторы, если сервер не ответил"
              aside={
                <Select
                  value={String(attempts)}
                  onValueChange={(v) => {
                    onSettingsChange({ attempts: Number(v) });
                    toast.success("Настройка сохранена", { description: `${pluralize(Number(v), ["попытка", "попытки", "попыток"])}, затем уведомление в Telegram` });
                  }}
                >
                  <SelectTrigger size="sm" className="h-7 w-auto min-w-28 text-[12.5px]" aria-label="Число попыток">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["3", "5", "10"].map((n) => (
                      <SelectItem key={n} value={n}>
                        {pluralize(Number(n), ["попытка", "попытки", "попыток"])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            >
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11.5px]">
                <span className="rounded-sm border border-line bg-surface-2 px-1.5 py-0.5 text-fg-2">таймаут 5 с</span>
                {RETRY_STEPS.slice(0, Math.min(4, attempts - 1)).map((t, i) => (
                  <React.Fragment key={t.label}>
                    <span className="text-fg-4">→</span>
                    <span className="rounded-sm border border-line bg-surface-2 px-1.5 py-0.5 text-fg-2">
                      {i + 2}: через {t.label}
                    </span>
                  </React.Fragment>
                ))}
                {attempts > 5 ? (
                  <>
                    <span className="text-fg-4">→</span>
                    <span className="rounded-sm border border-line bg-surface-2 px-1.5 py-0.5 text-fg-2">ещё {attempts - 5} × 5 мин</span>
                  </>
                ) : null}
                <span className="text-fg-4">→</span>
                <span className="rounded-sm border border-warn/30 bg-warn-soft px-1.5 py-0.5 text-warn">алерт в Telegram</span>
              </div>
            </SettingBlock>

            <SettingBlock
              title="Тестовая выдача"
              aside={
                <Button variant="secondary" size="xs" onClick={runTest} disabled={testRunning}>
                  {test && !testRunning ? <RotateCcw /> : <PlugZap />}
                  {testRunning ? "Проверяем…" : test ? "Ещё раз" : "Запустить"}
                </Button>
              }
            >
              <p className="mb-2.5 text-xs text-fg-3">
                Отправим безопасную команду: сообщение в чат и право paymc.test на 1 минуту для kotik228.
              </p>
              <DeliveryConsole
                lines={test?.result.lines ?? []}
                runKey={test?.key ?? 0}
                status={test?.result.status}
                onDone={() => setTestRunning(false)}
                title={`Консоль · ${s.name}`}
                idle={<span className="font-sans text-[12.5px] text-fg-3">Проверим путь «PayMC → агент → консоль» и время ответа.</span>}
              />
            </SettingBlock>

            <div className="rounded-lg border border-bad/25 p-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-fg">Отключить сервер</p>
                  <p className="mt-0.5 text-xs text-fg-3">Товары перестанут выдаваться на этот сервер. Ключ агента будет отозван.</p>
                </div>
                <Button variant="danger-ghost" size="sm" onClick={() => setConfirmOff(true)}>
                  <Power /> Отключить
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetBody>

      <Dialog open={confirmOff} onOpenChange={setConfirmOff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отключить «{s.name}»?</DialogTitle>
            <DialogDescription>
              Агент потеряет доступ, а покупки для этого сервера перестанут выдаваться.
              {queue.length ? ` ${pluralize(queue.length, ["команда", "команды", "команд"])} из очереди ${plural(queue.length, ["не выполнится", "не выполнятся", "не выполнятся"])}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOff(false)}>
              Оставить
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setConfirmOff(false);
                onDisconnect(s);
              }}
            >
              <Power /> Отключить сервер
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function queueIntro(status: ServerView["status"], queue: QueueItem[]) {
  if (status === "offline") return "Выполнятся по порядку сами, когда агент вернётся на связь.";
  const retrying = queue.some((q) => q.reason === "retrying");
  const awaiting = queue.some((q) => q.reason === "awaiting_player");
  if (retrying && awaiting) return "Ждут входа игроков или следующего повтора.";
  if (retrying) return "Сервер не ответил вовремя — повторим по расписанию из «Настроек».";
  return "Ждут входа игроков: эти команды выполняются, только когда игрок онлайн.";
}

function Health({ label, value, valueClass, children }: { label: string; value: string; valueClass?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 bg-surface px-3.5 py-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <p className="label-mono text-[10px] whitespace-nowrap text-fg-4">{label}</p>
        <p className={cn("mt-1 font-mono text-[17px] font-medium tracking-[-0.02em] whitespace-nowrap nums", valueClass ?? "text-fg")}>{value}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingBlock({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-fg">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
