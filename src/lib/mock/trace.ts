/**
 * Lazily builds the delivery trace for an order — deterministic per order id.
 * The trace is the product's core promise: every step with timings, executed
 * commands and console output, usable as dispute evidence.
 */
import { createRng } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/payments";
import { PRODUCT_SEEDS, SERVERS } from "./catalog";
import { MINUTE, NOW_MS } from "./now";
import { BANKS } from "./orders";
import type { Order, TraceStep } from "./types";
import { pluralize } from "@/lib/format";

const SERVER_NAME = new Map(SERVERS.map((s) => [s.id, s.name]));
const SEED_INDEX = new Map(PRODUCT_SEEDS.map((p) => [p.id, p]));

function outputFor(command: string, player: string): string {
  const c = command.trim();
  if (c.startsWith("lp user") && c.includes("parent addtemp")) {
    const m = c.match(/parent addtemp (\S+) (\S+)/);
    return `[LP] ${player} now inherits permissions from ${m?.[1] ?? "group"} for a duration of ${m?.[2] ?? "30d"}.`;
  }
  if (c.startsWith("lp user") && c.includes("parent add ")) {
    const m = c.match(/parent add (\S+)/);
    return `[LP] ${player} now inherits permissions from ${m?.[1] ?? "group"} in context global.`;
  }
  if (c.startsWith("lp user") && c.includes("permission set")) {
    const m = c.match(/permission set (\S+)/);
    return `[LP] Set ${m?.[1] ?? "permission"} to true for ${player} in context global.`;
  }
  if (c.startsWith("lp user") && c.includes("setprefix")) return `[LP] ${player} had prefix set at priority 100 in context global.`;
  if (c.startsWith("points give")) {
    const m = c.match(/points give \S+ (\d+)/);
    return `[PlayerPoints] Successfully gave ${m?.[1] ?? "?"} points to ${player}.`;
  }
  if (c.startsWith("excellentcrates")) {
    const m = c.match(/key give \S+ (\S+) (\d+)/);
    return `[ExcellentCrates] Given x${m?.[2] ?? "1"} ${m?.[1] ?? "crate"} key(s) to ${player}.`;
  }
  if (c.startsWith("essentials:kit")) {
    const m = c.match(/kit (\S+)/);
    return `Kit ${m?.[1] ?? "kit"} given to ${player}.`;
  }
  if (c.startsWith("litebans:unban")) return `[LiteBans] ${player} has been unbanned by PayMC.`;
  if (c.startsWith("litebans:unmute")) return `[LiteBans] ${player} has been unmuted by PayMC.`;
  if (c.startsWith("boosters")) return "[Boosters] Global XP booster x2 activated for 24h.";
  if (c.startsWith("eventmanager")) return "[Events] Event ice_dragon scheduled: Sat 19:00.";
  return "OK";
}

function fill(template: string, order: Order, qty: number, days?: number | null) {
  return template
    .replaceAll("{player}", order.playerName)
    .replaceAll("{amount}", String(qty))
    .replaceAll("{days}", String(days ?? 30))
    .replaceAll("{custom}", order.playerName.slice(0, 6))
    .replace(" accumulate", "");
}

export function buildTrace(order: Order): TraceStep[] {
  const rng = createRng(Number(order.id.replace(/\D/g, "")) * 31);
  const int = (a: number, b: number) => Math.floor(a + rng() * (b - a + 1));
  const steps: TraceStep[] = [];
  let t = new Date(order.createdAt).getTime();
  let n = 0;
  const push = (s: Omit<TraceStep, "id" | "at">, delta = 0) => {
    t += delta;
    steps.push({ id: `${order.id}-${n++}`, at: new Date(t).toISOString(), deltaMs: n === 1 ? undefined : delta, ...s });
  };
  const bank = BANKS[int(0, BANKS.length - 1)];
  const method = PAYMENT_METHODS[order.method];
  const serverName = SERVER_NAME.get(order.serverId) ?? "Сервер";
  const slow = order.serverId === "srv-anarchy";

  const confirmation =
    order.method === "card"
      ? `${bank} · 3-D Secure пройден`
      : order.method === "sbp"
        ? `${bank} · подтверждён в приложении банка`
        : order.method === "mobile"
          ? "подтверждён по СМС"
          : "подтверждён в приложении";
  push({ kind: "payment", title: "Платёж подтверждён", detail: `${method.label} · ${confirmation}`, status: "ok" });
  push({ kind: "webhook", title: "Вебхук принят, подпись проверена", detail: `Антифрод: риск ${order.risk} / 100`, status: order.risk > 60 ? "warn" : "ok" }, int(28, 110));
  push({ kind: "queued", title: `Задание в очереди сервера «${serverName}»`, detail: pluralize(order.items.reduce((a, it) => a + (SEED_INDEX.get(it.productId)?.commands.length ?? 1), 0), ["команда", "команды", "команд"]), status: "ok" }, int(2, 9));

  const commands = order.items.flatMap((it) => {
    const seed = SEED_INDEX.get(it.productId);
    return (seed?.commands ?? []).map((c) => fill(c.template, order, it.qty, seed?.durationDays));
  });

  if (order.status === "retrying" && order.serverId === "srv-skyblock") {
    push({ kind: "error", title: "Сервер не отвечает", detail: "Агент на «SkyBlock» без связи с 11:13", status: "error" }, 5000);
    push({ kind: "retry", title: "Ждём сервер — задание сохранено в очереди", detail: "Выдадим сразу после подключения агента. Игрок уведомлён в Telegram.", status: "pending" }, 2);
    return steps;
  }

  if (order.status === "awaiting_player") {
    push({ kind: "awaiting_player", title: "Игрок не в сети — выдача отложена", detail: "Команды требуют игрока онлайн. Выполним при входе на сервер.", status: "pending" }, int(40, 90));
    return steps;
  }

  const sentDelta = slow ? int(380, 900) : int(40, 160);
  push({ kind: "sent", title: "Агент получил задание", detail: `WebSocket · плагин PayMC ${slow ? "2.3.0" : "2.4.1"}`, status: "ok" }, sentDelta);

  if (order.status === "failed") {
    const cmd = commands[0] ?? "points give";
    push({ kind: "error", title: "Команда не выполнена", command: cmd, output: "Unknown or incomplete command, see below for error", detail: "Плагин PlayerPoints не установлен на сервере «Анархия»", status: "error" }, int(12, 30));
    for (let i = 1; i <= 5; i++) {
      push({ kind: "retry", title: `Повтор ${i} из 5`, detail: i < 5 ? `Следующая попытка через ${[30, 60, 120, 300][i - 1] ?? 300} с` : "Попытки закончились — нужно действие владельца", output: "Unknown or incomplete command", status: "error" }, [0, 30_000, 60_000, 120_000, 300_000][i - 1] ?? 300_000);
    }
    return steps;
  }

  if (order.status === "retrying") {
    push({ kind: "error", title: "Сервер не ответил за 5 000 мс", detail: "TPS 16,8 — сервер перегружен", status: "warn" }, 5000);
    // retries at +30 s, +1 min, +2 min, +5 min — show the ones that already happened
    const schedule = [30_000, 60_000, 120_000, 300_000];
    const elapsed = NOW_MS - t;
    let acc = 0;
    let made = 0;
    for (const gap of schedule) {
      if (acc + gap > elapsed) break;
      acc += gap;
      made += 1;
      push({ kind: "retry", title: `Повтор ${made} из 5`, detail: "Нет ответа за 5 000 мс", output: "Timed out waiting for agent response", status: "warn" }, gap);
    }
    const next = schedule[made] ?? 300_000;
    const left = Math.max(5, Math.round((acc + next - elapsed) / 1000));
    push(
      { kind: "retry", title: `Повтор ${made + 1} из 5 через ${left > 90 ? `${Math.round(left / 60)} мин` : `${left} с`}`, detail: "Интервал растёт: 30 с → 1 мин → 2 мин → 5 мин. Если не выйдет — пришлём алерт в Telegram", status: "pending" },
      1,
    );
    return steps;
  }

  if (order.status === "delivering") {
    push({ kind: "executed", title: "Выполняется…", command: commands[0], status: "pending" }, int(10, 20));
    return steps;
  }

  // delivered / refunded / chargeback
  const waited = (order.deliveryMs ?? 0) > MINUTE;
  if (waited) {
    push({ kind: "awaiting_player", title: "Игрок не в сети — выдача отложена", detail: "Выполним при входе на сервер", status: "ok" }, int(30, 80));
    t = new Date(order.createdAt).getTime() + (order.deliveryMs ?? 0) - 200;
    push({ kind: "sent", title: `${order.playerName} зашёл на сервер`, detail: "Агент выполнил отложенные команды", status: "ok" }, 0);
  }
  commands.forEach((c, i) => {
    push({ kind: "executed", title: commands.length > 1 ? `Команда ${i + 1} из ${commands.length} выполнена` : "Команда выполнена", command: c, output: outputFor(c, order.playerName), status: "ok" }, slow ? int(40, 220) : int(6, 28));
  });
  push({ kind: "confirmed", title: "Сервер подтвердил выдачу", detail: "Игроку отправлено сообщение в чат", status: "ok" }, int(3, 12));
  if (order.receipt?.status === "sent") {
    push({ kind: "receipt", title: `Чек № ${order.receipt.number} зарегистрирован`, detail: "«Мой налог» · отправлен игроку на почту", status: "ok" }, int(300, 1400));
  } else if (order.receipt?.status === "pending") {
    push({ kind: "receipt", title: "Чек регистрируется в «Мой налог»", detail: "Обычно занимает до минуты", status: "pending" }, int(300, 900));
  }

  if (order.status === "refunded") {
    push({ kind: "refund", title: `Возврат ${order.amount.toLocaleString("ru-RU")} ₽`, detail: "Инициатор: владелец · причина «Купил не тот режим»", status: "warn" }, int(2, 30) * 60 * MINUTE);
    push({ kind: "executed", title: "Выданное снято автоматически", command: `lp user ${order.playerName} parent clear`, output: `[LP] ${order.playerName}'s parents were cleared in context global.`, status: "ok" }, int(800, 2000));
  }
  if (order.status === "chargeback") {
    push({ kind: "error", title: "Чарджбэк от банка-эмитента", detail: "Код спора 4837 · «Не совершал операцию»", status: "error" }, int(5, 12) * 24 * 60 * MINUTE);
    push({ kind: "executed", title: "Привилегия снята автоматически", command: `lp user ${order.playerName} parent clear`, output: `[LP] ${order.playerName}'s parents were cleared in context global.`, status: "ok" }, int(600, 1500));
    push({ kind: "refund", title: "Пакет доказательств отправлен в банк", detail: "Трасса доставки, IP, время входа на сервер, UUID", status: "ok" }, int(2, 6) * 60 * MINUTE);
    push({ kind: "error", title: "Игрок добавлен в общий чёрный список PayMC", detail: "Платежи с его карт отклоняются на всех проектах", status: "warn" }, 1000);
  }
  // never show future timestamps
  return steps.filter((s) => new Date(s.at).getTime() <= NOW_MS);
}

export function withTrace(order: Order): Order {
  return { ...order, trace: buildTrace(order) };
}
