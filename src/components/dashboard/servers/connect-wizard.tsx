"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Download, Eye, EyeOff, Loader2, Minus, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAMES, GAME_LIST } from "@/lib/games";
import { connectionMeta } from "@/lib/mock/meta";
import type { ConnectionKind, GameId } from "@/lib/mock/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { Field, Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { GameChip } from "@/components/dashboard/game-chip";

type Step = 0 | 1 | 2 | 3;
type Method = "agent" | "rcon";

const STEPS = ["Игра", "Способ", "Установка", "Готово"];
const RCON_GAMES: GameId[] = ["minecraft", "rust", "ark", "dayz", "scum", "pz", "samp", "palworld", "7dtd", "cs2"];
const RCON_PORT: Partial<Record<GameId, number>> = { minecraft: 25575, rust: 28016, ark: 27020, pz: 27015, samp: 7777, palworld: 25575, cs2: 27015 };

function agentKind(game: GameId): ConnectionKind {
  if (game === "gta5") return "resource";
  if (game === "valheim" || game === "dayz") return "mod";
  return "plugin";
}

const AGENT_FILE: Partial<Record<GameId, { file: string; size: string; folder: string; platform: string }>> = {
  minecraft: { file: "PayMC-2.4.1.jar", size: "1,2 МБ", folder: "plugins/", platform: "Paper 1.21.4" },
  rust: { file: "PayMC.cs", size: "84 КБ", folder: "oxide/plugins/ или carbon/plugins/", platform: "Oxide 2.0.6" },
  gta5: { file: "paymc-resource.zip", size: "310 КБ", folder: "packages/ (RAGE:MP) или resources/ (alt:V)", platform: "RAGE:MP 1.1" },
  ark: { file: "PayMC-AsaApi.zip", size: "2,1 МБ", folder: "ShooterGame/Binaries/Win64/ArkApi/Plugins/", platform: "AsaApi 1.15" },
};

export function ConnectWizard({
  open,
  onOpenChange,
  defaultGame,
  connectKey,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultGame: GameId;
  connectKey: string;
  onConnected: (s: { name: string; game: GameId; connection: ConnectionKind; platform: string; latencyMs: number; address: string }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(780px,calc(100dvh-2rem))] max-w-2xl flex-col"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        {open ? <WizardBody defaultGame={defaultGame} connectKey={connectKey} onConnected={onConnected} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function WizardBody({
  defaultGame,
  connectKey,
  onConnected,
  onClose,
}: {
  defaultGame: GameId;
  connectKey: string;
  onConnected: (s: { name: string; game: GameId; connection: ConnectionKind; platform: string; latencyMs: number; address: string }) => void;
  onClose: () => void;
}) {
  const [step, setStep] = React.useState<Step>(0);
  const [game, setGame] = React.useState<GameId>(defaultGame);
  const [method, setMethod] = React.useState<Method>("agent");
  const [name, setName] = React.useState("Креатив");
  const [agentState, setAgentState] = React.useState<"waiting" | "connected">("waiting");
  const [rcon, setRcon] = React.useState({ host: "", port: String(RCON_PORT[defaultGame] ?? 27015), password: "" });
  const [rconState, setRconState] = React.useState<"idle" | "checking" | "ok" | "error">("idle");
  const [rconErrors, setRconErrors] = React.useState<{ host?: string; port?: string; password?: string; server?: string }>({});
  const [showPass, setShowPass] = React.useState(false);

  const g = GAMES[game];
  const rconAllowed = RCON_GAMES.includes(game);
  const effMethod: Method = rconAllowed ? method : "agent";
  const kind = effMethod === "rcon" ? (game === "rust" ? "webrcon" : "rcon") : agentKind(game);
  const file = AGENT_FILE[game] ?? { file: "paymc-agent.zip", size: "1 МБ", folder: "папку плагинов или модов сервера", platform: g.platforms[0] };
  const latency = effMethod === "rcon" ? 42 : game === "minecraft" ? 18 : 24;
  const ready = effMethod === "agent" ? agentState === "connected" : rconState === "ok";

  // simulate the agent dialing in ~2.5 s after the install step opens
  React.useEffect(() => {
    if (step !== 2 || effMethod !== "agent" || agentState === "connected") return;
    const t = window.setTimeout(() => setAgentState("connected"), 2500);
    return () => window.clearTimeout(t);
  }, [step, effMethod, agentState]);

  const checkRcon = () => {
    const e: typeof rconErrors = {};
    const host = rcon.host.trim();
    const port = Number(rcon.port);
    if (!host) e.host = "Укажите адрес сервера";
    else if (!/^[a-z0-9.-]+$/i.test(host)) e.host = "Только домен или IP, без http:// и порта";
    if (!Number.isInteger(port) || port < 1 || port > 65535) e.port = "Порт от 1 до 65535";
    if (!rcon.password) e.password = "Нужен пароль RCON";
    setRconErrors(e);
    if (Object.keys(e).length) return;
    setRconState("checking");
    window.setTimeout(() => {
      if (rcon.password.length < 6) {
        setRconState("error");
        setRconErrors({ server: "Сервер отклонил пароль. Проверьте rcon.password в server.properties и перезапустите сервер." });
      } else setRconState("ok");
    }, 1200);
  };

  const finish = () => {
    onConnected({
      name: name.trim() || "Новый сервер",
      game,
      connection: kind,
      platform: effMethod === "rcon" ? `${file.platform} · RCON` : file.platform,
      latencyMs: latency,
      address: effMethod === "rcon" ? `${rcon.host.trim()}:${rcon.port}` : "play.arcticmc.ru · creative",
    });
    setStep(3);
  };

  return (
    <>
      <DialogHeader className="shrink-0 border-b border-line-soft pb-4">
        <DialogTitle>Подключить сервер</DialogTitle>
        <DialogDescription>Пять минут: агент или RCON — и покупки начнут выдаваться сами.</DialogDescription>
        <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Шаги">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined}>
              <div className={cn("h-0.5 rounded-full", i < step ? "bg-azure-400" : i === step ? "bg-fg" : "bg-line-strong")} />
              <p className={cn("mt-1.5 label-mono", i === step ? "text-fg" : i < step ? "text-azure-300" : "text-fg-4")}>
                {i + 1} · {label}
              </p>
            </li>
          ))}
        </ol>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {step === 0 ? (
          <div>
            <div role="radiogroup" aria-label="Игра" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {GAME_LIST.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  role="radio"
                  aria-checked={game === x.id}
                  onClick={() => {
                    setGame(x.id);
                    setRcon((r) => ({ ...r, port: String(RCON_PORT[x.id] ?? 27015) }));
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                    game === x.id ? "border-azure-400/60 bg-azure-500/[0.08]" : "border-line hover:border-line-strong hover:bg-white/[0.02]",
                  )}
                >
                  <GameChip game={x.id} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-fg">{x.name}</span>
                    <span className={cn("block font-mono text-[10px]", x.status === "beta" ? "text-ice-300" : "text-fg-4")}>
                      {x.status === "beta" ? "бета" : "готово"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-line bg-surface-2/50 p-3 text-[12.5px] leading-relaxed">
              <p className="text-fg-2">
                <span className="font-medium text-fg">{g.name}:</span> {g.integration}.
              </p>
              <p className="mt-1 text-fg-3">
                Игрока узнаём по {g.idLabel === "Ник" ? "нику" : g.idLabel}
                {g.status === "beta" ? " · интеграция в бете — пишите в поддержку, если что-то не так" : ""}
              </p>
              {g.rules ? <p className="mt-1 text-fg-4">{g.rules}</p> : null}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div role="radiogroup" aria-label="Способ подключения" className="grid gap-2.5 sm:grid-cols-2">
            <MethodCard
              active={effMethod === "agent"}
              onSelect={() => setMethod("agent")}
              title={connectionMeta[agentKind(game)].label}
              badge="Рекомендуем"
              pros={["Выдача за доли секунды по постоянному соединению", "Очередь: команды дождутся рестарта сервера", "Проверяем, что игрок онлайн, — наборы не пропадут", "Онлайн, TPS и задержка — прямо в кабинете"]}
            />
            <MethodCard
              active={effMethod === "rcon"}
              disabled={!rconAllowed}
              onSelect={() => setMethod("rcon")}
              title={game === "rust" ? "WebRCON" : "RCON"}
              pros={["Ничего не устанавливать — нужен только пароль", "Если хостинг не даёт доступ к файлам"]}
              cons={["Нет очереди при рестарте — повторяем по таймеру", "Не видим, онлайн ли игрок"]}
              note={rconAllowed ? undefined : `Для ${g.name} RCON не подходит — нужен агент`}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <Field label="Как назовём сервер" htmlFor="srv-name" hint="Так он будет подписан в кабинете и в выборе сервера на витрине">
              <Input id="srv-name" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} className="sm:max-w-xs" />
            </Field>

            {effMethod === "agent" ? (
              <ol className="space-y-4">
                <InstallStep n={1} title={`Скачайте ${connectionMeta[kind].label.toLowerCase()} PayMC`}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toast.success("Загрузка началась", { description: `${file.file} · ${file.size}` })}
                  >
                    <Download /> {file.file}
                    <span className="font-mono text-[11px] text-fg-4">{file.size}</span>
                  </Button>
                </InstallStep>
                <InstallStep n={2} title="Положите файл на сервер и перезапустите его">
                  <p className="text-[12.5px] text-fg-3">
                    Папка: <span className="font-mono text-fg-2">{file.folder}</span>
                  </p>
                </InstallStep>
                <InstallStep n={3} title="Выполните в консоли сервера">
                  <CodeBlock title="Консоль сервера" code={`paymc connect ${connectKey}`} />
                  <p className="mt-1.5 text-[11.5px] text-fg-4">Ключ привязан к проекту. Не публикуйте его: по нему сервер получает задания на выдачу.</p>
                </InstallStep>
              </ol>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <Field label="Адрес" htmlFor="rcon-host" error={rconErrors.host}>
                    <Input
                      id="rcon-host"
                      value={rcon.host}
                      placeholder="play.arcticmc.ru"
                      aria-invalid={!!rconErrors.host || undefined}
                      onChange={(e) => {
                        setRcon({ ...rcon, host: e.target.value });
                        setRconState("idle");
                      }}
                      className="font-mono"
                    />
                  </Field>
                  <Field label="Порт RCON" htmlFor="rcon-port" error={rconErrors.port}>
                    <Input
                      id="rcon-port"
                      inputMode="numeric"
                      value={rcon.port}
                      aria-invalid={!!rconErrors.port || undefined}
                      onChange={(e) => {
                        setRcon({ ...rcon, port: e.target.value });
                        setRconState("idle");
                      }}
                      className="font-mono"
                    />
                  </Field>
                </div>
                <Field label="Пароль RCON" htmlFor="rcon-pass" error={rconErrors.password} hint={game === "minecraft" ? "rcon.password в server.properties, там же enable-rcon=true" : undefined}>
                  <Input
                    id="rcon-pass"
                    type={showPass ? "text" : "password"}
                    value={rcon.password}
                    autoComplete="off"
                    aria-invalid={!!rconErrors.password || undefined}
                    onChange={(e) => {
                      setRcon({ ...rcon, password: e.target.value });
                      setRconState("idle");
                    }}
                    trailing={
                      <button type="button" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Скрыть пароль" : "Показать пароль"} className="rounded-sm p-1 hover:bg-white/5 hover:text-fg">
                        {showPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    }
                  />
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="secondary" size="sm" onClick={checkRcon} disabled={rconState === "checking"}>
                    {rconState === "checking" ? <Loader2 className="animate-spin" /> : <Zap />}
                    {rconState === "checking" ? "Проверяем…" : "Проверить соединение"}
                  </Button>
                  <p className="text-[11.5px] text-fg-4">Разрешите доступ к порту только с адресов PayMC — список в документации.</p>
                </div>
                {rconErrors.server ? (
                  <p className="flex items-start gap-1.5 text-[12.5px] text-bad">
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {rconErrors.server}
                  </p>
                ) : null}
              </div>
            )}

            <ConnectionStatus method={effMethod} agentState={agentState} rconState={rconState} platform={file.platform} latency={latency} />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="py-2">
            <div className="flex size-10 items-center justify-center rounded-full border border-ok/30 bg-ok-soft text-ok">
              <Check className="size-5" strokeWidth={2.5} />
            </div>
            <p className="mt-4 text-[17px] font-semibold tracking-[-0.02em] text-fg">Сервер готов. Добавьте товары</p>
            <p className="mt-1 text-[13px] text-fg-3">«{name.trim() || "Новый сервер"}» на связи и уже в списке. Осталось решить, что на нём продавать.</p>
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line text-[12.5px] sm:grid-cols-4">
              {[
                ["Игра", g.name],
                ["Подключение", connectionMeta[kind].label],
                ["Платформа", file.platform],
                ["Задержка", `${latency} мс`],
              ].map(([k, v]) => (
                <div key={k} className="bg-surface px-3 py-2.5">
                  <dt className="label-mono text-[10px] text-fg-4">{k}</dt>
                  <dd className="mt-0.5 truncate text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="primary" size="sm">
                <Link href="/dashboard/products/new">
                  Добавить товары <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard/settings?tab=import">Перенести каталог</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <DialogFooter className="shrink-0 justify-between">
        {step > 0 && step < 3 ? (
          <Button variant="ghost" size="sm" onClick={() => setStep((s) => (s - 1) as Step)}>
            <ArrowLeft /> Назад
          </Button>
        ) : (
          <span />
        )}
        {step < 2 ? (
          <Button variant="primary" size="sm" onClick={() => setStep((s) => (s + 1) as Step)}>
            Далее <ArrowRight />
          </Button>
        ) : step === 2 ? (
          <Button variant="primary" size="sm" disabled={!ready} onClick={finish}>
            {ready ? "Готово" : "Ждём подключения"} {ready ? <Check /> : null}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

function MethodCard({
  active,
  disabled,
  onSelect,
  title,
  badge,
  pros,
  cons,
  note,
}: {
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  badge?: string;
  pros: string[];
  cons?: string[];
  note?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex flex-col rounded-lg border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active ? "border-azure-400/60 bg-azure-500/[0.07]" : "border-line hover:border-line-strong",
      )}
    >
      <span className="flex items-center gap-2">
        <span className={cn("flex size-3.5 items-center justify-center rounded-full border", active ? "border-azure-400" : "border-line-strong")}>
          {active ? <span className="size-1.5 rounded-full bg-azure-400" /> : null}
        </span>
        <span className="text-[14px] font-semibold text-fg">{title}</span>
        {badge ? <Badge tone="azure">{badge}</Badge> : null}
      </span>
      <ul className="mt-3 space-y-1.5">
        {pros.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[12.5px] text-fg-2">
            <Plus className="mt-0.5 size-3.5 shrink-0 text-ok" /> {p}
          </li>
        ))}
        {cons?.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[12.5px] text-fg-3">
            <Minus className="mt-0.5 size-3.5 shrink-0 text-fg-4" /> {p}
          </li>
        ))}
      </ul>
      {note ? <span className="mt-3 text-xs text-warn">{note}</span> : null}
    </button>
  );
}

function InstallStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3">
      <span className="mt-px flex size-[22px] items-center justify-center rounded-full border border-line-strong font-mono text-[11px] text-fg-2">{n}</span>
      <div className="min-w-0">
        <p className="mb-2 text-[13px] font-medium text-fg">{title}</p>
        {children}
      </div>
    </li>
  );
}

function ConnectionStatus({
  method,
  agentState,
  rconState,
  platform,
  latency,
}: {
  method: Method;
  agentState: "waiting" | "connected";
  rconState: "idle" | "checking" | "ok" | "error";
  platform: string;
  latency: number;
}) {
  const ok = method === "agent" ? agentState === "connected" : rconState === "ok";
  if (method === "rcon" && !ok) return null;
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3.5 py-3 font-mono text-[12.5px] transition-colors",
        ok ? "border-ok/30 bg-ok-soft text-ok" : "border-line bg-[#06080c] text-fg-3",
      )}
    >
      {ok ? (
        <>
          <Check className="size-4 shrink-0" strokeWidth={2.5} />
          <span>
            {method === "agent" ? "Подключено" : "RCON отвечает"}: {platform} · {latency} мс
          </span>
        </>
      ) : (
        <>
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ice-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-ice-400" />
          </span>
          <span>
            Ждём подключения
            <span className="animate-blink">.</span>
            <span className="animate-blink [animation-delay:0.35s]">.</span>
            <span className="animate-blink [animation-delay:0.7s]">.</span>
          </span>
        </>
      )}
    </div>
  );
}
