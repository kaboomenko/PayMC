import { DAY, NOW_MS, SERVERS, getProduct, getServer } from "@/lib/mock";
import type { GameServer, Product } from "@/lib/mock/types";
import type { StatusTone } from "@/components/ui/status-dot";
import { formatDate, formatMoney, formatNumber, pluralize } from "@/lib/format";

/**
 * Landing demo for the delivery section: five real-looking ArcticMC orders
 * with full traces. Products, prices and delivery commands come from the
 * catalog (the same one the in-game checkout and the dashboard use); server
 * names, cores and agent versions come from SERVERS. Built on the server —
 * the client panel only gets plain data. Times are derived from the frozen
 * NOW (12:00 MSK), so SSR and hydration render identical output.
 */

export type DemoTone = "ok" | "ice" | "warn" | "bad";

export interface DemoStep {
  kind: "payment" | "webhook" | "queued" | "sent" | "executed" | "awaiting" | "joined" | "error" | "retry" | "confirmed" | "receipt";
  title: string;
  detail?: string;
  /** ms since the previous step */
  delta?: number;
  /** overrides the right-hand timing label ("ждём", "вход") */
  deltaLabel?: string;
  command?: string;
  output?: string;
  status: "ok" | "warn" | "error" | "pending";
}

export type InGame =
  | { kind: "chat"; lines: { prefix?: string; text: string; personal?: boolean }[] }
  | { kind: "title"; title: string; subtitle: string }
  | { kind: "bossbar"; text: string; progress: number; chat: string }
  | { kind: "empty"; text: string };

export interface DemoOrderState {
  status: { label: string; tone: DemoTone };
  steps: DemoStep[];
  ingame: InGame;
}

export interface DemoOrder extends DemoOrderState {
  id: string;
  player: string;
  item: string;
  price: number;
  method: string;
  server: string;
  at: string;
  /** a simulated next event the visitor can trigger (player joins, server recovers) */
  resolve?: { action: string; note: string; extra: DemoStep[]; after: Omit<DemoOrderState, "steps"> };
}

export interface DemoQueue {
  name: string;
  tone: StatusTone;
  note: string;
  /** the demo order whose simulated resolution clears this queue */
  orderId?: string;
  resolved?: { tone: StatusTone; note: string };
}

export interface DeliveryDemo {
  orders: DemoOrder[];
  queues: DemoQueue[];
  serversUp: number;
  serversTotal: number;
}

const at = (secondsAgo: number) => new Date(NOW_MS - secondsAgo * 1000).toISOString();

/** "1 000 снежинок" with a non-breaking space inside the number */
const nb = (s: string) => s.replace(/(\d) (\d)/g, "$1 $2");

function product(id: string): Product {
  const p = getProduct(id);
  if (!p) throw new Error(`Landing demo: unknown product ${id}`);
  return p;
}

function server(id: string): GameServer {
  const s = getServer(id);
  if (!s) throw new Error(`Landing demo: unknown server ${id}`);
  return s;
}

/** Delivery commands of a product with {player}/{days} filled in. */
function commands(p: Product, player: string) {
  return p.commands.map((c) => c.template.replaceAll("{player}", player).replaceAll("{days}", String(p.durationDays ?? 30)));
}

const commandCount = (n: number) => pluralize(n, ["команда", "команды", "команд"]);
const agent = (s: GameServer) => `WebSocket · плагин PayMC ${s.agentVersion} · ${s.platform.replace(/^.* за /, "")}`;
const tps = (s: GameServer) => `TPS ${formatNumber(s.tps ?? 20, 1)}`;

export function buildDeliveryDemo(): DeliveryDemo {
  const lobby = server("srv-lobby");
  const survival = server("srv-survival");
  const anarchy = server("srv-anarchy");
  const offline = SERVERS.filter((s) => s.projectId === lobby.projectId && s.status === "offline");
  const projectServers = SERVERS.filter((s) => s.projectId === lobby.projectId);

  /* 1 · rank with two commands, delivered */
  const frost = product("p-frost");
  const frostDays = frost.durationDays ?? 30;
  const [frostRank, frostBonus = ""] = commands(frost, "Steve_Pro");
  const bonus = Number(frostBonus.match(/(\d+)$/)?.[1] ?? 0);

  /* 2 · kit that needs the player online */
  const kit = product("p-kit-builder");
  const [kitCmd] = commands(kit, "kotik228");
  const kitName = kitCmd.split(" ")[1] ?? "builder";

  /* 3 · currency on the lagging server, auto-retry */
  const coins = product("p-coins-1k");
  const [coinsCmd] = commands(coins, "Lera_Snow");

  /* 4 · unban — runs on the proxy, so it covers the whole network */
  const unban = product("p-unban");
  const unbanServer = server(unban.serverIds[0] ?? "srv-lobby");
  const [unbanCmd] = commands(unban, "Masha_Bee");

  /* 5 · cosmetic pet */
  const pet = product("p-pet-fox");
  const [petCmd] = commands(pet, "nerd_by");
  const petPerm = petCmd.split(" ")[4] ?? "";

  const orders: DemoOrder[] = [
    {
      id: "PMC-104851",
      player: "Steve_Pro",
      item: `${frost.name} · ${pluralize(frostDays, ["день", "дня", "дней"])}`,
      price: frost.price,
      method: "СБП",
      server: survival.name,
      at: at(18),
      status: { label: "Выдано 0,3 с", tone: "ok" },
      steps: [
        { kind: "payment", title: "Платёж подтверждён", detail: `СБП · Т-Банк · ${formatMoney(frost.price)}`, status: "ok" },
        { kind: "webhook", title: "Вебхук принят, подпись проверена", detail: "Антифрод: риск 4 / 100", delta: 86, status: "ok" },
        { kind: "queued", title: `Задание в очереди сервера «${survival.name}»`, detail: commandCount(frost.commands.length), delta: 4, status: "ok" },
        { kind: "sent", title: "Агент получил задание", detail: agent(survival), delta: 142, status: "ok" },
        {
          kind: "executed",
          title: "Команда 1 из 2 выполнена",
          command: frostRank,
          output: `[LP] Steve_Pro now inherits permissions from frost for a duration of ${frostDays}d.`,
          delta: 31,
          status: "ok",
        },
        {
          kind: "executed",
          title: "Команда 2 из 2 выполнена",
          command: frostBonus,
          output: `[PlayerPoints] Successfully gave ${bonus} points to Steve_Pro.`,
          delta: 18,
          status: "ok",
        },
        { kind: "confirmed", title: "Сервер подтвердил выдачу", detail: "Игроку отправлено сообщение в чат", delta: 12, status: "ok" },
        { kind: "receipt", title: "Чек № 205k1mzq8c зарегистрирован", detail: "«Мой налог» · копия ушла игроку на почту", delta: 640, status: "ok" },
      ],
      ingame: {
        kind: "chat",
        lines: [
          { prefix: "[ArcticMC]", text: `Steve_Pro поддержал сервер и получил ${frost.name} — спасибо!` },
          {
            text: `Привилегия ${frost.name} активна до ${formatDate(NOW_MS + frostDays * DAY, { year: false })}. Бонус: ${pluralize(bonus, ["снежинка", "снежинки", "снежинок"])}.`,
            personal: true,
          },
        ],
      },
    },
    {
      id: "PMC-104850",
      player: "kotik228",
      item: kit.name,
      price: kit.price,
      method: "SberPay",
      server: survival.name,
      at: at(170),
      status: { label: "Ждёт входа", tone: "ice" },
      steps: [
        { kind: "payment", title: "Платёж подтверждён", detail: `SberPay · ${formatMoney(kit.price)}`, status: "ok" },
        { kind: "webhook", title: "Вебхук принят, подпись проверена", detail: "Антифрод: риск 3 / 100", delta: 41, status: "ok" },
        {
          kind: "queued",
          title: `Задание в очереди сервера «${survival.name}»`,
          detail: `${commandCount(kit.commands.length)} · нужен игрок онлайн`,
          delta: 3,
          status: "ok",
        },
        {
          kind: "awaiting",
          title: "Игрок не в сети — выдача отложена",
          detail: "Наборы выдаются только онлайн. Выполним при входе — даже если сервер перезапустится.",
          delta: 48,
          status: "pending",
        },
        { kind: "receipt", title: "Чек № 205k1mz7ra зарегистрирован", detail: "Чек относится к платежу и не ждёт выдачи", delta: 512, status: "ok" },
      ],
      ingame: { kind: "empty", text: "Игрок не в сети. Сообщение покажем, когда он зайдёт." },
      resolve: {
        action: "Игрок зашёл",
        note: "Смоделируйте вход игрока — задание выполнится из очереди.",
        extra: [
          { kind: "joined", title: "kotik228 зашёл на сервер", detail: "Через 2 ч 14 мин · агент поднял задание из очереди", deltaLabel: "вход", status: "ok" },
          {
            kind: "executed",
            title: "Команда выполнена",
            command: kitCmd,
            output: `Kit ${kitName} given to kotik228.`,
            delta: 19,
            status: "ok",
          },
          { kind: "confirmed", title: "Сервер подтвердил выдачу", detail: "Игрок увидел надпись на экране", delta: 9, status: "ok" },
        ],
        after: {
          status: { label: "Выдано при входе", tone: "ok" },
          ingame: { kind: "title", title: `${kit.name} выдан`, subtitle: "Загляните в инвентарь · спасибо за поддержку" },
        },
      },
    },
    {
      id: "PMC-104849",
      player: "Lera_Snow",
      item: coins.name,
      price: coins.price,
      method: "T-Pay",
      server: anarchy.name,
      at: at(237),
      status: { label: "Повтор 2/5", tone: "warn" },
      steps: [
        { kind: "payment", title: "Платёж подтверждён", detail: `T-Pay · ${formatMoney(coins.price)}`, status: "ok" },
        { kind: "webhook", title: "Вебхук принят, подпись проверена", detail: "Антифрод: риск 9 / 100", delta: 52, status: "ok" },
        { kind: "queued", title: `Задание в очереди сервера «${anarchy.name}»`, detail: commandCount(coins.commands.length), delta: 5, status: "ok" },
        { kind: "sent", title: "Агент получил задание", detail: `WebSocket · плагин PayMC ${anarchy.agentVersion} · ${tps(anarchy)}`, delta: 618, status: "ok" },
        { kind: "receipt", title: "Чек № 205k1mx4tw зарегистрирован", detail: "«Мой налог»", delta: 540, status: "ok" },
        {
          kind: "error",
          title: "Сервер не ответил за 5 000 мс",
          detail: `${tps(anarchy)} — сервер перегружен, команда не подтверждена`,
          command: coinsCmd,
          output: "timeout: no ack from agent in 5000 ms",
          delta: 4460,
          status: "warn",
        },
        { kind: "retry", title: "Повтор 1 из 5 — без ответа", detail: "Интервал растёт: 30 с → 1 мин → 2 мин → 5 мин", delta: 30_000, status: "warn" },
        {
          kind: "retry",
          title: "Повтор 2 из 5 — через минуту",
          detail: "Не выйдет за 5 попыток — алерт в Telegram и кнопка «Выдать вручную»",
          deltaLabel: "ждём",
          status: "pending",
        },
      ],
      ingame: {
        kind: "chat",
        lines: [{ prefix: "[ArcticMC]", text: "Покупка принята. Сервер под нагрузкой — снежинки придут в течение пары минут." }],
      },
      resolve: {
        action: "Сервер ожил",
        note: "Смоделируйте, что TPS вернулся в норму, — сработает следующий повтор.",
        extra: [
          {
            kind: "executed",
            title: "Повтор 2 из 5 — команда выполнена",
            command: coinsCmd,
            output: `[PlayerPoints] Successfully gave ${coinsCmd.split(" ").pop()} points to Lera_Snow.`,
            delta: 60_000,
            status: "ok",
          },
          { kind: "confirmed", title: "Сервер подтвердил выдачу", detail: "Игроку отправлено сообщение в чат", delta: 22, status: "ok" },
        ],
        after: {
          status: { label: "Выдано · повтор 2", tone: "ok" },
          ingame: {
            kind: "chat",
            lines: [
              { prefix: "[ArcticMC]", text: "Покупка принята. Сервер под нагрузкой — снежинки придут в течение пары минут." },
              { text: `Начислено ${nb(coins.name)}. Спасибо, что дождались!`, personal: true },
            ],
          },
        },
      },
    },
    {
      id: "PMC-104848",
      player: "Masha_Bee",
      item: unban.name,
      price: unban.price,
      method: "Карта",
      server: unbanServer.name,
      at: at(443),
      status: { label: "Выдано 1,1 с", tone: "ok" },
      steps: [
        { kind: "payment", title: "Платёж подтверждён", detail: `Карта Мир · Сбербанк · 3-D Secure · ${formatMoney(unban.price)}`, status: "ok" },
        { kind: "webhook", title: "Вебхук принят, подпись проверена", detail: "Антифрод: риск 12 / 100", delta: 54, status: "ok" },
        {
          kind: "queued",
          title: `Задание в очереди сервера «${unbanServer.name}»`,
          detail: `${commandCount(unban.commands.length)} · игрок может быть офлайн`,
          delta: 6,
          status: "ok",
        },
        { kind: "sent", title: "Агент получил задание", detail: agent(unbanServer), delta: 712, status: "ok" },
        {
          kind: "executed",
          title: "Команда выполнена",
          command: unbanCmd,
          output: "[LiteBans] Masha_Bee has been unbanned by PayMC.",
          delta: 268,
          status: "ok",
        },
        { kind: "confirmed", title: "Сервер подтвердил выдачу", detail: "Бан снят на всех серверах сети", delta: 41, status: "ok" },
        { kind: "receipt", title: "Чек № 205k1mv0nd зарегистрирован", detail: "«Мой налог» · копия ушла игроку на почту", delta: 590, status: "ok" },
      ],
      ingame: {
        kind: "chat",
        lines: [{ prefix: "[ArcticMC]", text: "Бан снят. С возвращением, Masha_Bee! Правила: /rules" }],
      },
    },
    {
      id: "PMC-104847",
      player: "nerd_by",
      item: pet.name,
      price: pet.price,
      method: "ЮMoney",
      server: lobby.name,
      at: at(645),
      status: { label: "Выдано 0,2 с", tone: "ok" },
      steps: [
        { kind: "payment", title: "Платёж подтверждён", detail: `ЮMoney · ${formatMoney(pet.price)}`, status: "ok" },
        { kind: "webhook", title: "Вебхук принят, подпись проверена", detail: "Антифрод: риск 2 / 100", delta: 44, status: "ok" },
        { kind: "queued", title: `Задание в очереди сервера «${lobby.name}»`, detail: commandCount(pet.commands.length), delta: 3, status: "ok" },
        { kind: "sent", title: "Агент получил задание", detail: agent(lobby), delta: 97, status: "ok" },
        {
          kind: "executed",
          title: "Команда выполнена",
          command: petCmd,
          output: `[LP] Set ${petPerm} to true for nerd_by in context global.`,
          delta: 22,
          status: "ok",
        },
        { kind: "confirmed", title: "Сервер подтвердил выдачу", detail: "Цель месяца обновлена в боссбаре", delta: 8, status: "ok" },
        { kind: "receipt", title: "Чек № 205k1mt9qe зарегистрирован", detail: "«Мой налог»", delta: 702, status: "ok" },
      ],
      ingame: {
        kind: "bossbar",
        text: "Цель месяца: сервер мини-игр — 68 %",
        progress: 0.68,
        chat: "nerd_by приютил песца и приблизил цель месяца. Спасибо!",
      },
    },
  ];

  const queues: DemoQueue[] = [
    { name: lobby.name, tone: "ok", note: "очередь пуста" },
    { name: survival.name, tone: "ok", note: "1 задание ждёт входа игрока", orderId: "PMC-104850", resolved: { tone: "ok", note: "очередь пуста" } },
    { name: anarchy.name, tone: "warn", note: `${tps(anarchy)} · 1 повтор`, orderId: "PMC-104849", resolved: { tone: "ok", note: "TPS 19,6 · очередь пуста" } },
    ...offline.map((s) => ({ name: s.name, tone: "bad" as const, note: `офлайн · ${formatNumber(s.queue)} в очереди` })),
  ];

  return {
    orders,
    queues,
    serversUp: projectServers.filter((s) => s.status !== "offline").length,
    serversTotal: projectServers.length,
  };
}
