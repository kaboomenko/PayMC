"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Plus, ServerCrash, ServerOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatNumber, formatPercent, formatRelative, plural, pluralize } from "@/lib/format";
import { connectionMeta, serverStatusMeta } from "@/lib/mock/meta";
import type { ConnectionKind, GameId } from "@/lib/mock/types";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sparkline } from "@/components/ui/sparkline";
import { StatusDot } from "@/components/ui/status-dot";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toaster";
import { ConnectWizard } from "./connect-wizard";
import { FixSteps } from "./fix-steps";
import { ServerSheet } from "./server-sheet";
import { UptimeStrip } from "./uptime-strip";
import { DEFAULT_SERVER_SETTINGS, LATEST_AGENT, type Incident, type JournalItem, type QueueItem, type ServerSettings, type ServerView } from "./types";

const STATUS_TONE = { online: "ok", degraded: "warn", offline: "bad" } as const;

function setParam(key: string, value: string | null) {
  const sp = new URLSearchParams(window.location.search);
  if (value === null) sp.delete(key);
  else sp.set(key, value);
  const qs = sp.toString();
  window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}

export function ServersView({
  servers: initialServers,
  queues: initialQueues,
  journals,
  incident,
  initialServerId,
  initialConnect,
  connectKey,
  game,
  now,
}: {
  servers: ServerView[];
  queues: Record<string, QueueItem[]>;
  journals: Record<string, JournalItem[]>;
  incident: Incident | null;
  initialServerId: string | null;
  initialConnect: boolean;
  connectKey: string;
  game: GameId;
  now: number;
}) {
  const [servers, setServers] = React.useState(initialServers);
  const [queues, setQueues] = React.useState(initialQueues);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialServerId && initialServers.some((s) => s.id === initialServerId) ? initialServerId : null,
  );
  const [sheetOpen, setSheetOpen] = React.useState(selectedId !== null);
  const [connectOpen, setConnectOpen] = React.useState(initialConnect);
  const [fixOpen, setFixOpen] = React.useState(false);
  const [settings, setSettings] = React.useState<Record<string, ServerSettings>>({});
  const seq = React.useRef(0);

  const selected = servers.find((s) => s.id === selectedId) ?? null;
  const openServer = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
    setParam("server", id);
  };
  const onSheetChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) setParam("server", null);
  };
  const onConnectChange = (open: boolean) => {
    setConnectOpen(open);
    setParam("connect", open ? "1" : null);
  };

  const onConnected = (n: { name: string; game: GameId; connection: ConnectionKind; platform: string; latencyMs: number; address: string }) => {
    seq.current += 1;
    const id = `srv-new-${seq.current}`;
    const base = initialServers[0];
    const s: ServerView = {
      ...base,
      id,
      name: n.name,
      game: n.game,
      platform: n.platform,
      address: n.address,
      connection: n.connection,
      agentVersion: LATEST_AGENT,
      status: "online",
      online: 0,
      maxOnline: 100,
      latencyMs: n.latencyMs,
      queue: 0,
      lastSeenAt: new Date(now).toISOString(),
      uptime30d: 100,
      tps: n.game === "minecraft" ? 20 : undefined,
      onlineHistory: Array.from({ length: 24 }, () => 0),
      uptimeDays: Array.from({ length: 30 }, () => "ok" as const),
      tpsHistory: Array.from({ length: 24 }, () => 20),
      latencyHistory: Array.from({ length: 24 }, () => n.latencyMs),
      outdated: false,
      offlineSince: undefined,
      offlineMinutes: undefined,
    };
    setServers((prev) => [...prev, s]);
    setQueues((q) => ({ ...q, [id]: [] }));
  };

  const onDisconnect = (s: ServerView) => {
    const idx = servers.findIndex((x) => x.id === s.id);
    setServers((prev) => prev.filter((x) => x.id !== s.id));
    onSheetChange(false);
    toast(`«${s.name}» отключён`, {
      description: "Ключ агента отозван, выдача на этот сервер остановлена",
      action: {
        label: "Вернуть",
        onClick: () =>
          setServers((prev) => {
            const next = [...prev];
            next.splice(Math.min(idx, next.length), 0, s);
            return next;
          }),
      },
    });
  };

  const onlineNow = servers.reduce((a, s) => a + s.online, 0);
  const queued = servers.reduce((a, s) => a + (queues[s.id]?.length ?? 0), 0);
  // «на связи» = the agent answers (a slow server is still connected and delivering)
  const live = servers.filter((s) => s.status !== "offline");
  const slow = servers.filter((s) => s.status === "degraded").length;
  const down = servers.length - live.length;
  const linkHint = [slow ? `${slow} ${plural(slow, ["медленно отвечает", "медленно отвечают", "медленно отвечают"])}` : "", down ? `${down} без связи` : ""]
    .filter(Boolean)
    .join(" · ");
  const avgLatency = live.length ? Math.round(live.reduce((a, s) => a + s.latencyMs, 0) / live.length) : 0;
  const incidentServer = incident ? servers.find((s) => s.id === incident.serverId) : undefined;
  const incidentQueue = incident ? (queues[incident.serverId]?.length ?? 0) : 0;

  return (
    <>
      <PageHeader
        title="Серверы"
        description="Агенты PayMC на ваших серверах: связь, очередь команд и журнал выдачи"
        actions={
          <Button variant="primary" size="sm" onClick={() => onConnectChange(true)}>
            <Plus /> Подключить сервер
          </Button>
        }
      />

      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
          <Stat label="Игроков онлайн" value={formatNumber(onlineNow)} hint={`на ${pluralize(live.length, ["сервере", "серверах", "серверах"])}`} />
          <Stat label="На связи" value={`${live.length} из ${servers.length}`} hint={linkHint || "всё в порядке"} tone={linkHint ? "warn" : undefined} />
          <Stat label="Команд в очереди" value={formatNumber(queued)} hint="выполнятся сами" tone={queued ? "warn" : undefined} />
          <Stat label="Средняя задержка" value={formatDuration(avgLatency)} hint="от оплаты до агента" />
        </dl>

        {incident && incidentServer ? (
          <section aria-label="Инцидент" className="relative overflow-hidden rounded-xl border border-bad/30 bg-surface shadow-raise">
            <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-bad" />
            <div className="flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-start">
              <ServerCrash className="hidden size-5 shrink-0 text-bad sm:mt-0.5 sm:block" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-medium text-fg">
                  {incident.serverName} не на связи {incident.minutes} мин
                  <Badge tone="bad" dot>
                    с {incident.since}
                  </Badge>
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-fg-3">
                  {incidentQueue
                    ? `${pluralize(incidentQueue, ["команда", "команды", "команд"])} в очереди — выполним сами, как только агент подключится. Игроки не потеряют покупки.`
                    : "Очередь пуста."}{" "}
                  Уведомили вас в Telegram в {incident.since}.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="sm" onClick={() => setFixOpen((v) => !v)} aria-expanded={fixOpen}>
                  Как починить <ChevronDown className={cn("transition-transform duration-200", fixOpen && "rotate-180")} />
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openServer(incident.serverId)}>
                  Открыть
                </Button>
              </div>
            </div>
            {fixOpen ? (
              <div className="border-t border-line-soft bg-surface-2/30 px-5 py-4">
                <div className="max-w-2xl">
                  <FixSteps serverName={incident.serverName} />
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-raise">
          <div className="hidden grid-cols-[minmax(170px,1.3fr)_minmax(210px,1.5fr)_minmax(140px,1fr)_64px_76px_70px_minmax(110px,0.9fr)_20px] gap-4 border-b border-line px-5 py-2.5 lg:grid">
            {["Сервер", "Адрес и агент", "Онлайн · 24 ч", "TPS", "Задержка", "Очередь", "Аптайм · 30 дн", ""].map((h, i) => (
              <span key={i} className={cn("label-mono text-fg-3", (i === 3 || i === 4 || i === 5) && "text-right")}>
                {h}
              </span>
            ))}
          </div>
          {servers.length ? (
            <ul className="divide-y divide-line-soft">
              {servers.map((s) => (
                <ServerRow key={s.id} s={s} queue={queues[s.id]?.length ?? 0} now={now} onOpen={() => openServer(s.id)} active={sheetOpen && selectedId === s.id} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<ServerOff />}
              title="Ни одного сервера"
              description="Подключите сервер плагином или по RCON — после этого покупки начнут выдаваться автоматически."
              action={
                <Button variant="primary" size="sm" onClick={() => onConnectChange(true)}>
                  <Plus /> Подключить сервер
                </Button>
              }
            />
          )}
        </div>
        <p className="text-xs text-fg-4">
          Агент держит постоянное соединение с PayMC: если сервер перезагружается, команды ждут в очереди, а не теряются. Последняя версия — {LATEST_AGENT}.
        </p>
      </div>

      <ServerSheet
        server={selected}
        open={sheetOpen}
        onOpenChange={onSheetChange}
        queue={selected ? (queues[selected.id] ?? []) : []}
        onQueueChange={(q) => selected && setQueues((prev) => ({ ...prev, [selected.id]: q }))}
        journal={selected ? (journals[selected.id] ?? []) : []}
        settings={(selected && settings[selected.id]) || DEFAULT_SERVER_SETTINGS}
        onSettingsChange={(patch) =>
          selected && setSettings((prev) => ({ ...prev, [selected.id]: { ...(prev[selected.id] ?? DEFAULT_SERVER_SETTINGS), ...patch } }))
        }
        game={game}
        now={now}
        onDisconnect={onDisconnect}
      />
      <ConnectWizard open={connectOpen} onOpenChange={onConnectChange} defaultGame={game} connectKey={connectKey} onConnected={onConnected} />
    </>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="label-mono text-fg-4">{label}</dt>
      {/* the value never breaks; a long hint drops under it instead of squeezing it */}
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-mono text-[19px] font-medium tracking-[-0.02em] whitespace-nowrap text-fg nums">{value}</span>
        {hint ? <span className={cn("hidden text-[11.5px] leading-snug sm:inline", tone === "warn" ? "text-warn" : "text-fg-4")}>{hint}</span> : null}
      </dd>
    </div>
  );
}

function ServerRow({ s, queue, now, onOpen, active }: { s: ServerView; queue: number; now: number; onOpen: () => void; active: boolean }) {
  const meta = serverStatusMeta[s.status];
  const offline = s.status === "offline";
  const tps = s.tps ?? 20;
  return (
    <li className={cn("group relative transition-colors hover:bg-white/[0.02]", active && "bg-azure-500/[0.05]")}>
      {/* stretched button: the whole row opens the sheet */}
      <button type="button" onClick={onOpen} aria-label={`Открыть сервер «${s.name}»`} className="absolute inset-0 z-0 outline-none focus-visible:bg-white/[0.03] focus-visible:ring-1 focus-visible:ring-azure-400 focus-visible:ring-inset" />
      <div className="pointer-events-none relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5 lg:grid-cols-[minmax(170px,1.3fr)_minmax(210px,1.5fr)_minmax(140px,1fr)_64px_76px_70px_minmax(110px,0.9fr)_20px] lg:items-center">
        {/* name + status */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <StatusDot tone={STATUS_TONE[s.status]} />
            <span className="truncate text-[14px] font-medium text-fg">{s.name}</span>
          </div>
          <p className="mt-0.5 truncate pl-[18px] text-xs">
            <span className={s.status === "online" ? "text-fg-3" : s.status === "degraded" ? "text-warn" : "text-bad"}>{meta.label}</span>
            <span className="text-fg-4"> · {offline ? `${s.offlineMinutes} мин` : formatRelative(s.lastSeenAt, now)}</span>
          </p>
        </div>

        {/* mobile: online on the right */}
        <div className="text-right lg:hidden">
          <p className="font-mono text-[13px] text-fg nums">
            {formatNumber(s.online)}
            <span className="text-fg-4"> / {formatNumber(s.maxOnline)}</span>
          </p>
          <Sparkline data={s.onlineHistory} width={64} height={16} tone={offline ? "bad" : "azure"} className="ml-auto" />
        </div>

        {/* address + agent */}
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate font-mono text-[12px] text-fg-2">{s.address}</span>
            <CopyButton value={s.address} label={`Скопировать адрес ${s.name}`} className="pointer-events-auto relative z-10 size-6 shrink-0" />
          </div>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-fg-4">
            <span className="truncate">
              {s.platform.split(" · ")[0]} · {connectionMeta[s.connection].label} {s.agentVersion}
            </span>
            {s.outdated ? (
              <Tooltip content={`В ${LATEST_AGENT} — переподключение без потери очереди. Обновление: paymc update`}>
                <span className="pointer-events-auto relative z-10 shrink-0">
                  <Badge tone="warn">Обновить до {LATEST_AGENT}</Badge>
                </span>
              </Tooltip>
            ) : null}
          </p>
        </div>

        {/* desktop metrics */}
        <div className="hidden items-center gap-3 lg:flex">
          <span className="w-[74px] font-mono text-[13px] text-fg nums">
            {formatNumber(s.online)}
            <span className="text-fg-4">/{formatNumber(s.maxOnline)}</span>
          </span>
          <Sparkline data={s.onlineHistory} width={56} height={20} tone={offline ? "bad" : "azure"} />
        </div>
        <span className={cn("hidden text-right font-mono text-[13px] nums lg:block", offline ? "text-fg-4" : tps >= 19 ? "text-fg" : tps >= 17 ? "text-warn" : "text-bad")}>
          {offline ? "—" : formatNumber(tps, 1)}
        </span>
        <span className={cn("hidden text-right font-mono text-[13px] nums lg:block", offline ? "text-fg-4" : s.latencyMs > 300 ? "text-warn" : "text-fg")}>
          {offline ? "—" : formatDuration(s.latencyMs)}
        </span>
        <span className="hidden text-right lg:block">
          {queue ? (
            <span className="inline-flex h-5 min-w-6 items-center justify-center rounded-sm bg-warn-soft px-1.5 font-mono text-[12px] text-warn nums">{queue}</span>
          ) : (
            <span className="font-mono text-[13px] text-fg-4">0</span>
          )}
        </span>
        <div className="hidden lg:block">
          <UptimeStrip days={s.uptimeDays} />
          <p className="mt-1 font-mono text-[11px] text-fg-3 nums">{formatPercent(s.uptime30d, { digits: 2 })}</p>
        </div>
        <ChevronRight className="hidden size-4 text-fg-4 transition-transform group-hover:translate-x-0.5 group-hover:text-fg-3 lg:block" />

        {/* mobile metrics line */}
        <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-fg-3 lg:hidden">
          <span>
            TPS <span className={cn(offline ? "text-fg-4" : tps >= 19 ? "text-fg" : "text-warn")}>{offline ? "—" : formatNumber(tps, 1)}</span>
          </span>
          <span>
            пинг <span className={cn(offline ? "text-fg-4" : s.latencyMs > 300 ? "text-warn" : "text-fg")}>{offline ? "—" : formatDuration(s.latencyMs)}</span>
          </span>
          <span>
            очередь <span className={queue ? "text-warn" : "text-fg"}>{queue}</span>
          </span>
          <span>
            аптайм <span className="text-fg">{formatPercent(s.uptime30d, { digits: 2 })}</span>
          </span>
        </div>
      </div>
    </li>
  );
}
