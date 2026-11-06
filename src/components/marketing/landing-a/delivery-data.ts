import { NOW_MS } from "@/lib/mock/now";

/**
 * Landing demo for the delivery section: five real-looking ArcticMC orders
 * with full traces. Times are derived from the frozen NOW (12:00 MSK), so
 * SSR and hydration render identical output.
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

const at = (secondsAgo: number) => new Date(NOW_MS - secondsAgo * 1000).toISOString();

export const DEMO_ORDERS: DemoOrder[] = [
  {
    id: "PMC-104851",
    player: "Steve_Pro",
    item: "Frost · 30 дней",
    price: 299,
    method: "СБП",
    server: "Выживание",
    at: at(18),
    status: { label: "Выдано 0,3 с", tone: "ok" },
    steps: [
      { kind: "payment", title: "Платёж подтверждён", detail: "СБП · Т-Банк · 299 ₽", status: "ok" },
      { kind: "webhook", title: "Вебхук принят, подпись проверена", detail: "Антифрод: риск 4 / 100", delta: 86, status: "ok" },
      { kind: "queued", title: "Задание в очереди сервера «Выживание»", detail: "2 команды", delta: 4, status: "ok" },
      { kind: "sent", title: "Агент получил задание", detail: "WebSocket · плагин PayMC 2.4.1 · Paper 1.21.4", delta: 142, status: "ok" },
      {
        kind: "executed",
        title: "Команда 1 из 2 выполнена",
        command: "lp user Steve_Pro parent addtemp frost 30d",
        output: "[LP] Steve_Pro now inherits permissions from frost for a duration of 30d.",
        delta: 31,
        status: "ok",
      },
      {
        kind: "executed",
        title: "Команда 2 из 2 выполнена",
        command: "points give Steve_Pro 300",
        output: "[PlayerPoints] Successfully gave 300 points to Steve_Pro.",
        delta: 18,
        status: "ok",
      },
      { kind: "confirmed", title: "Сервер подтвердил выдачу", detail: "Игроку отправлено сообщение в чат", delta: 12, status: "ok" },
      { kind: "receipt", title: "Чек № 205k1mzq8c зарегистрирован", detail: "«Мой налог» · копия ушла игроку на почту", delta: 640, status: "ok" },
    ],
    ingame: {
      kind: "chat",
      lines: [
        { prefix: "[ArcticMC]", text: "Steve_Pro поддержал сервер и получил Frost — спасибо!" },
        { text: "Привилегия Frost активна до 6 декабря. Бонус: 300 снежинок.", personal: true },
      ],
    },
  },
  {
    id: "PMC-104850",
    player: "kotik228",
    item: "Набор «Полярник»",
    price: 149,
    method: "SberPay",
    server: "Выживание",
    at: at(170),
    status: { label: "Ждёт входа", tone: "ice" },
    steps: [
      { kind: "payment", title: "Платёж подтверждён", detail: "SberPay · 149 ₽", status: "ok" },
      { kind: "webhook", title: "Вебхук принят, подпись проверена", detail: "Антифрод: риск 3 / 100", delta: 41, status: "ok" },
      { kind: "queued", title: "Задание в очереди сервера «Выживание»", detail: "1 команда · нужен игрок онлайн", delta: 3, status: "ok" },
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
          command: "essentials:kit polar kotik228",
          output: "Kit polar given to kotik228.",
          delta: 19,
          status: "ok",
        },
        { kind: "confirmed", title: "Сервер подтвердил выдачу", detail: "Игрок увидел надпись на экране", delta: 9, status: "ok" },
      ],
      after: {
        status: { label: "Выдано при входе", tone: "ok" },
        ingame: { kind: "title", title: "Набор «Полярник» выдан", subtitle: "Загляните в инвентарь · спасибо за поддержку" },
      },
    },
  },
  {
    id: "PMC-104849",
    player: "Lera_Snow",
    item: "1 000 снежинок",
    price: 249,
    method: "T-Pay",
    server: "Анархия",
    at: at(237),
    status: { label: "Повтор 2/5", tone: "warn" },
    steps: [
      { kind: "payment", title: "Платёж подтверждён", detail: "T-Pay · 249 ₽", status: "ok" },
      { kind: "webhook", title: "Вебхук принят, подпись проверена", detail: "Антифрод: риск 9 / 100", delta: 52, status: "ok" },
      { kind: "queued", title: "Задание в очереди сервера «Анархия»", detail: "1 команда", delta: 5, status: "ok" },
      { kind: "sent", title: "Агент получил задание", detail: "WebSocket · плагин PayMC 2.3.0 · TPS 14,2", delta: 618, status: "ok" },
      { kind: "receipt", title: "Чек № 205k1mx4tw зарегистрирован", detail: "«Мой налог»", delta: 540, status: "ok" },
      {
        kind: "error",
        title: "Сервер не ответил за 5 000 мс",
        detail: "TPS 14,2 — сервер перегружен, команда не подтверждена",
        command: "points give Lera_Snow 1000",
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
          command: "points give Lera_Snow 1000",
          output: "[PlayerPoints] Successfully gave 1000 points to Lera_Snow.",
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
            { text: "Начислено 1 000 снежинок. Спасибо, что дождались!", personal: true },
          ],
        },
      },
    },
  },
  {
    id: "PMC-104848",
    player: "Masha_Bee",
    item: "Разбан",
    price: 199,
    method: "Карта",
    server: "Анархия",
    at: at(443),
    status: { label: "Выдано 1,1 с", tone: "ok" },
    steps: [
      { kind: "payment", title: "Платёж подтверждён", detail: "Карта Мир · Сбербанк · 199 ₽", status: "ok" },
      { kind: "webhook", title: "Вебхук принят, подпись проверена", detail: "Антифрод: риск 12 / 100", delta: 54, status: "ok" },
      { kind: "queued", title: "Задание в очереди сервера «Анархия»", detail: "1 команда · игрок может быть офлайн", delta: 6, status: "ok" },
      { kind: "sent", title: "Агент получил задание", detail: "WebSocket · плагин PayMC 2.3.0 · TPS 16,8", delta: 712, status: "ok" },
      {
        kind: "executed",
        title: "Команда выполнена",
        command: "litebans:unban Masha_Bee --sender=PayMC",
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
    item: "Питомец «Лис»",
    price: 129,
    method: "ЮMoney",
    server: "Лобби",
    at: at(645),
    status: { label: "Выдано 0,2 с", tone: "ok" },
    steps: [
      { kind: "payment", title: "Платёж подтверждён", detail: "ЮMoney · 129 ₽", status: "ok" },
      { kind: "webhook", title: "Вебхук принят, подпись проверена", detail: "Антифрод: риск 2 / 100", delta: 44, status: "ok" },
      { kind: "queued", title: "Задание в очереди сервера «Лобби»", detail: "1 команда", delta: 3, status: "ok" },
      { kind: "sent", title: "Агент получил задание", detail: "WebSocket · плагин PayMC 2.4.1 · Velocity", delta: 97, status: "ok" },
      {
        kind: "executed",
        title: "Команда выполнена",
        command: "lp user nerd_by permission set pets.type.fox true",
        output: "[LP] Set pets.type.fox to true for nerd_by in context global.",
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
      chat: "nerd_by приютил лиса и приблизил цель месяца. Спасибо!",
    },
  },
];
