"use client";

import * as React from "react";
import { Reorder, useDragControls } from "motion/react";
import { BookOpen, CircleAlert, GripVertical, Play, Plus, RotateCcw, SquareTerminal, Trash2, TriangleAlert, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMAND_LIBRARY, VARIABLES, templatesFor, unknownVariables, type CommandTemplate } from "@/lib/command-library";
import type { DeliveryCommand, GameId } from "@/lib/mock/types";
import { serverStatusMeta } from "@/lib/mock/meta";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusDot } from "@/components/ui/status-dot";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommandLibraryDialog } from "./command-library-dialog";
import { DeliveryConsole } from "./delivery-console";
import { buildDryRun, commandHead, commandIssues, expandTemplate, type DryRunResult } from "./dry-run";
import type { EditorServer } from "./types";

const STATUS_TONE = { online: "ok", degraded: "warn", offline: "bad" } as const;

export function CommandBuilder({
  commands,
  onChange,
  game,
  gameName,
  servers,
  productServerIds,
  durationDays,
  newId,
  isPool = false,
}: {
  commands: DeliveryCommand[];
  onChange: (c: DeliveryCommand[]) => void;
  game: GameId;
  gameName: string;
  servers: EditorServer[];
  productServerIds: string[];
  durationDays: number | null | undefined;
  newId: () => string;
  /** a pool runs its commands once, when the target is reached */
  isPool?: boolean;
}) {
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const vars = VARIABLES.filter((v) => !v.games || v.games.includes(game));
  // pools need a server-wide reward (a booster), not a personal rank
  const library = templatesFor(game);
  const example = (isPool ? library.find((t) => /складчин/i.test(t.description)) : undefined) ?? library[0];

  const patch = (id: string, p: Partial<DeliveryCommand>) => onChange(commands.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const addBlank = () => onChange([...commands, { id: newId(), template: "", serverId: "all", requireOnline: false }]);
  const addTemplate = (t: CommandTemplate) => {
    onChange([...commands, { id: newId(), template: t.template, serverId: "all", requireOnline: !!t.requireOnline, templateId: t.id }]);
    setLibraryOpen(false);
  };

  return (
    <div>
      {commands.length ? (
        <Reorder.Group axis="y" values={commands} onReorder={onChange} className="space-y-2.5">
          {commands.map((c, i) => (
            <CommandRow
              key={c.id}
              cmd={c}
              index={i}
              total={commands.length}
              game={game}
              gameName={gameName}
              vars={vars}
              servers={servers}
              durationDays={durationDays}
              onPatch={(p) => patch(c.id, p)}
              onRemove={() => onChange(commands.filter((x) => x.id !== c.id))}
            />
          ))}
        </Reorder.Group>
      ) : (
        <div className="relative overflow-hidden rounded-lg border border-dashed border-line-strong px-4 py-6">
          <div aria-hidden className="absolute inset-0 bg-dots opacity-40 mask-radial" />
          <div className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <SquareTerminal className="size-5 shrink-0 text-fg-3" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-fg">
                {isPool ? "Сервер выполнит эти команды один раз — когда сумма будет собрана" : "Сервер выполнит эти команды после оплаты"}
              </p>
              <p className="mt-0.5 text-[12.5px] text-fg-3">
                {example ? `Возьмите готовую из библиотеки — например, «${example.title}» для ${example.plugin}, — или впишите свою.` : "Впишите команду, которую выполнит консоль сервера."}{" "}
                {isPool ? "Награда общая: выдайте её всему серверу, а не одному игроку." : "Порядок важен: выполняем сверху вниз."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setLibraryOpen(true)}>
          <BookOpen /> Добавить из библиотеки
        </Button>
        <Button variant="ghost" size="sm" onClick={addBlank}>
          <Plus /> Своя команда
        </Button>
        {commands.length > 1 ? <span className="ml-auto hidden text-xs text-fg-4 sm:inline">Выполняются по порядку, перетаскивайте за ⋮⋮</span> : null}
      </div>

      <DryRunPanel
        commands={commands}
        servers={servers}
        productServerIds={productServerIds}
        game={game}
        gameName={gameName}
        durationDays={durationDays}
      />

      <CommandLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        game={game}
        onPick={addTemplate}
        onBlank={() => {
          addBlank();
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}

function CommandRow({
  cmd,
  index,
  total,
  game,
  gameName,
  vars,
  servers,
  durationDays,
  onPatch,
  onRemove,
}: {
  cmd: DeliveryCommand;
  index: number;
  total: number;
  game: GameId;
  gameName: string;
  vars: typeof VARIABLES;
  servers: EditorServer[];
  durationDays: number | null | undefined;
  onPatch: (p: Partial<DeliveryCommand>) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const issues = commandIssues(cmd.template, game, durationDays, gameName);
  const hasError = issues.some((x) => x.level === "error");
  // the library label only describes the row while it is still that plugin command
  const template = cmd.templateId ? COMMAND_LIBRARY.find((t) => t.id === cmd.templateId) : undefined;
  const origin = template && commandHead(cmd.template) === commandHead(template.template) ? template : undefined;
  const unknown = unknownVariables(cmd.template, game);
  const inputId = `cmd-${cmd.id}`;

  const insert = (key: string) => {
    const el = inputRef.current;
    const v = cmd.template;
    const start = el?.selectionStart ?? v.length;
    const end = el?.selectionEnd ?? v.length;
    const next = v.slice(0, start) + key + v.slice(end);
    onPatch({ template: next });
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + key.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const fixFor = (code: string): { label: string; apply: () => void } | null => {
    if (code === "slash") return { label: "Убрать слэш", apply: () => onPatch({ template: cmd.template.trimStart().replace(/^\/+/, "") }) };
    if (code === "unknown_var" && game === "minecraft")
      return {
        label: "Заменить на {player}",
        apply: () => onPatch({ template: unknown.reduce((acc, u) => acc.replaceAll(u, "{player}"), cmd.template) }),
      };
    return null;
  };

  return (
    <Reorder.Item
      value={cmd}
      dragListener={false}
      dragControls={controls}
      className={cn("relative rounded-lg border bg-surface-2/40", hasError ? "border-bad/30" : "border-line")}
      whileDrag={{ scale: 1.01, boxShadow: "0 16px 40px -12px rgb(0 0 0 / 0.75)" }}
    >
      <div className="flex items-start gap-2 p-3 sm:gap-2.5">
        <div className="flex shrink-0 flex-col items-center gap-1 pt-1.5">
          <button
            type="button"
            aria-label={`Перетащить команду ${index + 1}`}
            tabIndex={-1}
            onPointerDown={(e) => controls.start(e)}
            className="flex h-6 w-5 cursor-grab touch-none items-center justify-center rounded-xs text-fg-4 hover:text-fg-2 active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
          <span className="font-mono text-[10.5px] text-fg-4 nums">{index + 1}</span>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <label htmlFor={inputId} className="sr-only">
            Команда {index + 1} из {total}
          </label>
          <TemplateInput id={inputId} value={cmd.template} onChange={(template) => onPatch({ template })} unknown={unknown} invalid={hasError} inputRef={inputRef} />

          <div className="flex flex-wrap items-center gap-1">
            {vars.map((v) => (
              <Tooltip key={v.key} content={`${v.label} · например, ${v.example}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(v.key)}
                  className="h-6 rounded-sm border border-line bg-surface-3/60 px-1.5 font-mono text-[11px] text-ice-300 transition-colors hover:border-ice-400/40 hover:bg-ice-400/10"
                >
                  {v.key}
                </button>
              </Tooltip>
            ))}
            {origin ? (
              <span className="ml-auto pl-2 font-mono text-[10.5px] text-fg-4">
                {origin.plugin} · {origin.title.toLowerCase()}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-0.5">
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-fg-2 select-none">
              <Switch size="sm" checked={cmd.requireOnline} onCheckedChange={(v) => onPatch({ requireOnline: v })} aria-label="Только когда игрок онлайн" />
              Только когда игрок онлайн
            </label>
            <Select value={cmd.serverId} onValueChange={(v) => onPatch({ serverId: v })}>
              <SelectTrigger size="sm" className="h-7 w-auto min-w-40 text-[12.5px]" aria-label="Где выполнять">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все серверы товара</SelectItem>
                {servers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <StatusDot tone={STATUS_TONE[s.status]} className="size-1.5" />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-[12.5px] text-fg-3">
              Задержка
              <span className="relative">
                <input
                  type="number"
                  min={0}
                  max={3600}
                  inputMode="numeric"
                  value={cmd.delaySec ?? 0}
                  onChange={(e) => onPatch({ delaySec: Math.max(0, Math.min(3600, Number(e.target.value) || 0)) || undefined })}
                  aria-label="Задержка перед выполнением, секунд"
                  className="h-7 w-16 rounded-md border border-line bg-surface-2 pr-5 pl-2 font-mono text-[12px] text-fg outline-none nums hover:border-line-strong focus:border-azure-500/70"
                />
                <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 font-mono text-[11px] text-fg-4">с</span>
              </span>
            </label>
          </div>

          {issues.length ? (
            <ul className="space-y-1">
              {issues.map((iss) => {
                const fix = fixFor(iss.code);
                return (
                  <li key={iss.code} className={cn("flex items-start gap-1.5 text-xs", iss.level === "error" ? "text-bad" : "text-warn")}>
                    {iss.level === "error" ? <CircleAlert className="mt-px size-3.5 shrink-0" /> : <TriangleAlert className="mt-px size-3.5 shrink-0" />}
                    <span className="min-w-0 flex-1">
                      {iss.text}
                      {fix ? (
                        <button
                          type="button"
                          onClick={fix.apply}
                          className="ml-2 inline-flex items-center gap-1 rounded-xs text-fg-2 underline decoration-line-strong underline-offset-4 hover:text-fg hover:decoration-fg-3"
                        >
                          <Wand2 className="size-3" /> {fix.label}
                        </button>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : cmd.template.trim() ? (
            <p className="truncate font-mono text-[11px] text-fg-4" title="Пример с тестовым игроком">
              <span className="select-none">пример › </span>
              {expandTemplate(cmd.template.trim().replace(" accumulate", ""), { player: "kotik228", days: durationDays })}
            </p>
          ) : null}
        </div>

        <Button variant="ghost" size="icon-xs" className="shrink-0 text-fg-3 hover:text-bad" aria-label={`Удалить команду ${index + 1}`} onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
    </Reorder.Item>
  );
}

/**
 * Mono input that highlights {variables}: known in ice, unknown in bad tone.
 * A transparent auto-growing textarea sits on top of a highlighted mirror.
 */
function TemplateInput({
  id,
  value,
  onChange,
  unknown,
  invalid,
  inputRef,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  unknown: string[];
  invalid: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const bad = new Set(unknown);
  const parts = value.split(/(\{[a-z_]+\})/gi);
  const shared = "col-start-1 row-start-1 px-3 py-[7px] font-mono text-[12.5px] leading-5 whitespace-pre-wrap break-words";
  return (
    <div
      className={cn(
        "relative grid rounded-md border bg-[#070a10] shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)] transition-[border-color,box-shadow] duration-150 focus-within:border-azure-500/70 focus-within:shadow-[0_0_0_3px_rgb(51_119_255/0.18)]",
        invalid ? "border-bad/50" : "border-line hover:border-line-strong",
      )}
    >
      <div aria-hidden className={cn(shared, "pointer-events-none text-fg")}>
        {parts.map((p, i) =>
          /^\{[a-z_]+\}$/i.test(p) ? (
            <span key={i} className={bad.has(p) ? "text-bad underline decoration-bad/70 decoration-wavy underline-offset-[3px]" : "text-ice-300"}>
              {p}
            </span>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
        {"​"}
      </div>
      <textarea
        ref={inputRef}
        id={id}
        rows={1}
        value={value}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        aria-invalid={invalid || undefined}
        placeholder="lp user {player} parent addtemp vip {days}d"
        onChange={(e) => onChange(e.target.value.replace(/[\r\n]+/g, " "))}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        className={cn(shared, "resize-none overflow-hidden bg-transparent text-transparent caret-fg outline-none placeholder:text-fg-4 selection:bg-azure-500/35")}
      />
    </div>
  );
}

function DryRunPanel({
  commands,
  servers,
  productServerIds,
  game,
  gameName,
  durationDays,
}: {
  commands: DeliveryCommand[];
  servers: EditorServer[];
  productServerIds: string[];
  game: GameId;
  gameName: string;
  durationDays: number | null | undefined;
}) {
  const options = servers.filter((s) => productServerIds.includes(s.id));
  const pool = options.length ? options : servers;
  const fallback = (pool.find((s) => s.status === "online") ?? pool[0])?.id ?? "";
  const [serverId, setServerId] = React.useState(fallback);
  const [player, setPlayer] = React.useState("kotik228");
  const [offline, setOffline] = React.useState(false);
  const [result, setResult] = React.useState<DryRunResult | null>(null);
  const [runKey, setRunKey] = React.useState(0);
  const [ranWith, setRanWith] = React.useState("");
  const [running, setRunning] = React.useState(false);

  const effectiveServerId = pool.some((s) => s.id === serverId) ? serverId : fallback;
  const server = servers.find((s) => s.id === effectiveServerId);
  const signature = JSON.stringify([commands, effectiveServerId, player, offline, durationDays]);
  const stale = runKey > 0 && ranWith !== signature && !running;
  const nick = player.trim().replace(/\s+/g, "_").slice(0, 16);

  const run = () => {
    if (!server) return;
    const r = buildDryRun({
      commands,
      server: { ...server, offlineSince: server.offlineSince },
      player: nick || "kotik228",
      game,
      gameName,
      durationDays,
      playerOffline: offline,
      serverNames: Object.fromEntries(servers.map((s) => [s.id, s.name])),
    });
    setResult(r);
    setRanWith(signature);
    setRunning(true);
    setRunKey((k) => k + 1);
  };

  return (
    <section aria-labelledby="dry-run-title" className="mt-5 border-t border-line-soft pt-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id="dry-run-title" className="text-[13px] font-semibold text-fg">
          Проверить выдачу
        </h3>
        <p className="text-xs text-fg-4">Сухой прогон: проверим синтаксис и вывод плагинов, игроку ничего не выдадим</p>
      </div>
      <div className="mb-3 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-fg-3">Сервер</span>
          <Select value={effectiveServerId} onValueChange={setServerId}>
            <SelectTrigger size="sm" aria-label="Сервер для проверки">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pool.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <StatusDot tone={STATUS_TONE[s.status]} className="size-1.5" />
                    {s.name}
                    <span className="text-fg-4">· {serverStatusMeta[s.status].label.toLowerCase()}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-fg-3">Тестовый игрок</span>
          <input
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            maxLength={16}
            spellCheck={false}
            className="h-8 w-full rounded-md border border-line bg-surface-2 px-2.5 font-mono text-[12.5px] text-fg outline-none hover:border-line-strong focus:border-azure-500/70 focus:shadow-[0_0_0_3px_rgb(51_119_255/0.18)]"
          />
        </label>
        <label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border border-line bg-surface-2 px-2.5 text-[12.5px] text-fg-2 select-none">
          <Switch size="sm" checked={offline} onCheckedChange={setOffline} aria-label="Игрок не в сети" />
          Игрок не в сети
        </label>
        <Button variant="primary" size="sm" onClick={run} disabled={running || !server}>
          {runKey && !running ? <RotateCcw /> : <Play />}
          {running ? "Проверяем…" : runKey ? "Ещё раз" : "Запустить"}
        </Button>
      </div>
      <DeliveryConsole
        lines={result?.lines ?? []}
        runKey={runKey}
        status={result?.status}
        onDone={() => setRunning(false)}
        title={server ? `Консоль · ${server.name}` : "Консоль"}
        idle={
          <span className="font-sans text-[12.5px] text-fg-3">
            Нажмите «Запустить» — покажем, какие команды уйдут на сервер и что он ответит.
          </span>
        }
      />
      {stale ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-3">
          <TriangleAlert className="size-3.5 text-warn" /> Настройки изменились после проверки — запустите её снова
        </p>
      ) : null}
    </section>
  );
}
