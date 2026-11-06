/**
 * Dry-run engine for delivery commands: expands variables, validates them for
 * the project's game and produces console lines with realistic latencies and
 * plugin outputs. Pure and deterministic (hash-based jitter, no Math.random).
 */
import type { GameId, ServerStatus } from "@/lib/mock/types";
import { COMMAND_LIBRARY, VARIABLES, unknownVariables } from "@/lib/command-library";
import { formatDuration, formatNumber, plural, pluralize } from "@/lib/format";

export type ConsoleTone = "fg" | "muted" | "ok" | "ice" | "bad" | "warn";

export interface ConsoleLine {
  id: string;
  kind: "prompt" | "note" | "cmd" | "out" | "summary";
  text: string;
  tone?: ConsoleTone;
  /** latency shown on the right */
  ms?: number;
  /** pause before this line appears in the animation */
  wait: number;
}

export interface DryRunCommand {
  id: string;
  template: string;
  serverId: string;
  requireOnline: boolean;
  delaySec?: number;
  templateId?: string;
}

export interface DryRunServer {
  id: string;
  name: string;
  status: ServerStatus;
  latencyMs: number;
  platform: string;
  agentVersion: string;
  tps?: number;
  lastSeenAt?: string;
  offlineSince?: string;
}

export interface DryRunResult {
  lines: ConsoleLine[];
  status: "ok" | "deferred" | "error" | "offline" | "empty";
  totalMs: number;
  executed: number;
  deferred: number;
  failed: number;
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function fakeUuid(nick: string) {
  const h = hash(nick).toString(16).padStart(8, "0");
  const h2 = hash(`${nick}:2`).toString(16).padStart(8, "0");
  return `${h}-${h2.slice(0, 4)}-4${h2.slice(4, 7)}-a${h.slice(1, 4)}-${h2}${h.slice(0, 4)}`;
}

export function fakeSteamId(nick: string) {
  return `7656119${String(8_000_000_000 + (hash(nick) % 999_999_999)).slice(0, 10)}`;
}

export function expandTemplate(tpl: string, ctx: { player: string; days?: number | null; amount?: number; custom?: string }) {
  return tpl
    .replaceAll("{player}", ctx.player)
    .replaceAll("{uuid}", fakeUuid(ctx.player))
    .replaceAll("{steamid}", fakeSteamId(ctx.player))
    .replaceAll("{eosid}", `0002${fakeSteamId(ctx.player).slice(-12)}a1f`)
    .replaceAll("{staticid}", "1042")
    .replaceAll("{days}", String(ctx.days ?? 30))
    .replaceAll("{amount}", String(ctx.amount ?? 1))
    .replaceAll("{custom}", ctx.custom ?? "ICE");
}

/** What the server console would print back. Falls back to library examples. */
export function simulateOutput(command: string, player: string): { text: string; tone: ConsoleTone } {
  const c = command.trim().replace(/^\//, "");
  let m: RegExpMatchArray | null;
  if ((m = c.match(/^lp user \S+ parent addtemp (\S+) (\S+)/))) return { text: `[LP] ${player} now inherits permissions from ${m[1]} for a duration of ${m[2]}.`, tone: "ice" };
  if ((m = c.match(/^lp user \S+ parent add (\S+)/))) return { text: `[LP] ${player} now inherits permissions from ${m[1]} in context global.`, tone: "ice" };
  if ((m = c.match(/^lp user \S+ permission settemp (\S+) \S+ (\S+)/))) return { text: `[LP] Set ${m[1]} to true for ${player} for a duration of ${m[2]}.`, tone: "ice" };
  if ((m = c.match(/^lp user \S+ permission set (\S+)/))) return { text: `[LP] Set ${m[1]} to true for ${player} in context global.`, tone: "ice" };
  if (/^lp user \S+ meta setprefix/.test(c)) return { text: `[LP] ${player} had prefix set at priority 100 in context global.`, tone: "ice" };
  if ((m = c.match(/^points give \S+ (\d+)/))) return { text: `[PlayerPoints] Successfully gave ${m[1]} points to ${player}.`, tone: "ice" };
  if ((m = c.match(/^eco give \S+ (\d+)/))) return { text: `$${formatNumber(Number(m[1]))} added to ${player} account.`, tone: "ice" };
  if ((m = c.match(/^cmi money give \S+ (\d+)/))) return { text: `[CMI] Added ${m[1]} to ${player} balance.`, tone: "ice" };
  if ((m = c.match(/^(?:essentials:)?kit (\S+)/))) return { text: `Kit ${m[1]} given to ${player}.`, tone: "ice" };
  if ((m = c.match(/^excellentcrates key give \S+ (\S+) (\d+)/))) return { text: `[ExcellentCrates] Given x${m[2]} ${m[1]} key(s) to ${player}.`, tone: "ice" };
  if ((m = c.match(/^crazycrates give virtual (\S+) (\d+)/))) return { text: `[CrazyCrates] You have given ${player} ${m[2]} ${m[1]} keys.`, tone: "ice" };
  if (/^litebans:unban/.test(c)) return { text: `[LiteBans] ${player} has been unbanned by PayMC.`, tone: "ice" };
  if (/^litebans:unmute/.test(c)) return { text: `[LiteBans] ${player} has been unmuted by PayMC.`, tone: "ice" };
  if ((m = c.match(/^boosters activate (\S+) (\S+) (\S+)/))) return { text: `[Boosters] Global ${m[1].toUpperCase()} booster x${m[2]} activated for ${m[3]}.`, tone: "ice" };
  if ((m = c.match(/^eventmanager start (\S+)/))) return { text: `[Events] Event ${m[1]} scheduled: Sat 19:00.`, tone: "ice" };
  if (/^op \S+/.test(c)) return { text: `Made ${player} a server operator`, tone: "warn" };
  if ((m = c.match(/^say (.+)/))) return { text: `[Server] ${m[1]}`, tone: "ice" };
  const head = c.split(/\s+/).slice(0, 2).join(" ");
  const lib = COMMAND_LIBRARY.find((t) => t.template.startsWith(head));
  if (lib) return { text: lib.output.replaceAll("kotik228", player).replaceAll("d1ma", player).replaceAll("Ivan_Petrov", player), tone: "ice" };
  return { text: "Команда принята, сервер не вернул текст", tone: "muted" };
}

const knownVarsFor = (game: GameId) => VARIABLES.filter((v) => !v.games || v.games.includes(game)).map((v) => v.key);

export interface CommandIssue {
  code: "empty" | "unknown_var" | "brace" | "days_forever" | "days_once" | "slash" | "danger";
  level: "error" | "warn";
  text: string;
}

/** Inline validation for one command template. */
export function commandIssues(tpl: string, game: GameId, durationDays: number | null | undefined, gameName: string): CommandIssue[] {
  const out: CommandIssue[] = [];
  const t = tpl.trim();
  if (!t) return [{ code: "empty", level: "error", text: "Команда пустая — впишите её или удалите строку" }];
  const unknown = unknownVariables(t, game);
  if (unknown.length) {
    out.push({
      code: "unknown_var",
      level: "error",
      text: `${unknown.join(", ")} — ${unknown.length > 1 ? "таких переменных" : "такой переменной"} нет в ${gameName}. Доступны: ${knownVarsFor(game).join(" ")}`,
    });
  }
  const open = (t.match(/\{/g) ?? []).length;
  const close = (t.match(/\}/g) ?? []).length;
  if (open !== close) out.push({ code: "brace", level: "error", text: "Не закрыта фигурная скобка у переменной" });
  if (durationDays === null && t.includes("{days}"))
    out.push({ code: "days_forever", level: "error", text: "Товар навсегда, а команда использует {days} — уберите срок из команды" });
  if (durationDays === undefined && t.includes("{days}"))
    out.push({ code: "days_once", level: "warn", text: "У товара нет срока — {days} подставится как 30. Укажите срок в «Цена и срок»" });
  if (t.startsWith("/")) out.push({ code: "slash", level: "warn", text: "Слэш в начале не нужен: консоль сервера выполняет команды без него" });
  const danger = COMMAND_LIBRARY.find((x) => x.danger && t.split(/\s+/)[0] === x.template.split(/\s+/)[0]);
  if (danger?.danger) out.push({ code: "danger", level: "error", text: danger.danger });
  return out;
}

export function buildDryRun(input: {
  commands: DryRunCommand[];
  server: DryRunServer;
  player: string;
  game: GameId;
  gameName: string;
  durationDays: number | null | undefined;
  playerOffline: boolean;
  amount?: number;
  /** server names for "skipped" notes */
  serverNames?: Record<string, string>;
}): DryRunResult {
  const { server, player, game } = input;
  const lines: ConsoleLine[] = [];
  let n = 0;
  const push = (l: Omit<ConsoleLine, "id">) => lines.push({ ...l, id: `l${n++}` });
  const slug = server.id.replace(/^srv-/, "");

  push({ kind: "prompt", text: `paymc dry-run --server ${slug} --player ${player}`, wait: 0 });
  if (server.status === "offline") {
    push({ kind: "note", text: `Агент «${server.name}» не на связи${server.offlineSince ? ` с ${server.offlineSince}` : ""}`, tone: "bad", wait: 650 });
    push({
      kind: "note",
      text: `В боевом режиме ${pluralize(input.commands.length, ["команда встанет", "команды встанут", "команд встанут"])} в очередь и выполнятся сами после подключения`,
      tone: "muted",
      wait: 260,
    });
    push({ kind: "summary", text: "Сейчас не выполнится: сервер не на связи", tone: "warn", wait: 380 });
    return { lines, status: "offline", totalMs: 0, executed: 0, deferred: input.commands.length, failed: 0 };
  }
  push({
    kind: "note",
    text: `агент ${server.agentVersion} · ${server.platform} · пинг ${server.latencyMs} мс${server.tps !== undefined ? ` · TPS ${formatNumber(server.tps, 1)}` : ""}`,
    tone: "muted",
    wait: 320,
  });
  if (server.status === "degraded") {
    push({ kind: "note", text: "Сервер отвечает медленно — выдача сработает, но с задержкой", tone: "warn", wait: 200 });
  }
  if (!input.commands.length) {
    push({ kind: "summary", text: "Нечего проверять: добавьте хотя бы одну команду", tone: "warn", wait: 300 });
    return { lines, status: "empty", totalMs: 0, executed: 0, deferred: 0, failed: 0 };
  }

  let total = 0;
  let executed = 0;
  let deferred = 0;
  let failed = 0;
  input.commands.forEach((c, i) => {
    const label = input.commands.length > 1 ? `#${i + 1} ` : "";
    if (c.serverId !== "all" && c.serverId !== server.id) {
      push({ kind: "note", text: `${label}пропущена — настроена для «${input.serverNames?.[c.serverId] ?? c.serverId}»`, tone: "muted", wait: 220 });
      return;
    }
    const issues = commandIssues(c.template, game, input.durationDays, input.gameName).filter((x) => x.level === "error");
    if (issues.length) {
      failed += 1;
      push({ kind: "cmd", text: c.template.trim() || "(пустая команда)", wait: 320 });
      push({ kind: "out", text: `${label}ошибка: ${issues[0].text}`, tone: "bad", wait: 260 });
      return;
    }
    const expanded = expandTemplate(c.template.trim().replace(/^\//, "").replace(" accumulate", ""), {
      player,
      days: input.durationDays,
      amount: input.amount,
    });
    if (c.requireOnline && input.playerOffline) {
      deferred += 1;
      push({ kind: "cmd", text: expanded, wait: 320 });
      push({ kind: "out", text: `${player} не в сети — выполним при входе на сервер`, tone: "ice", wait: 260 });
      return;
    }
    if (c.delaySec) push({ kind: "note", text: `${label}задержка ${c.delaySec} с перед выполнением`, tone: "muted", wait: 200 });
    const ms = server.latencyMs + 3 + (hash(`${server.id}:${expanded}`) % (server.status === "degraded" ? 260 : 24));
    total += ms;
    executed += 1;
    const out = simulateOutput(expanded, player);
    push({ kind: "cmd", text: expanded, wait: 320 });
    push({ kind: "out", text: out.text, tone: out.tone, ms, wait: Math.min(900, 160 + ms / 2) });
  });

  if (failed) {
    push({
      kind: "summary",
      text: `Не сработает: ${pluralize(failed, ["команда", "команды", "команд"])} с ошибкой. Исправьте ${failed > 1 ? "их" : "её"} и проверьте снова`,
      tone: "bad",
      wait: 380,
    });
    return { lines, status: "error", totalMs: total, executed, deferred, failed };
  }
  if (deferred) {
    push({
      kind: "summary",
      text: `Сработает: ${pluralize(executed, ["команда", "команды", "команд"])} сразу, ${deferred} — при входе игрока`,
      tone: "ok",
      wait: 380,
    });
    return { lines, status: "deferred", totalMs: total, executed, deferred, failed };
  }
  push({
    kind: "summary",
    text: `Сработает: ${formatNumber(executed)} ${plural(executed, ["команда", "команды", "команд"])}, ${formatDuration(total)}`,
    tone: "ok",
    wait: 380,
  });
  return { lines, status: "ok", totalMs: total, executed, deferred, failed };
}
