/**
 * Hero sandbox scenarios — one realistic purchase per game.
 * Timings are real-world-plausible (ms); the animation is time-compressed.
 */

export type ScenarioGame = "minecraft" | "rust" | "gta5" | "ark";

export interface ScenarioStep {
  kind: "payment" | "webhook" | "queued" | "sent" | "executed" | "awaiting" | "joined" | "confirmed";
  title: string;
  detail?: string;
  ms: number;
  command?: string;
  output?: string;
}

export interface Scenario {
  game: ScenarioGame;
  tab: string;
  server: string;
  product: { name: string; caption: string; price: number; glyph: string; perks: string[] };
  defaultPlayer: string;
  /** label for the identity used in commands */
  idLabel: string;
  /** how the player id is rendered into commands */
  playerId: (nick: string) => string;
  methods: string[];
  commands: { template: string; output: string }[];
  agent: string;
  chat: { prefix: string; broadcast: string; personal: string };
}

const steamId = (nick: string) => {
  let h = 0;
  for (let i = 0; i < nick.length; i++) h = (h * 31 + nick.charCodeAt(i)) >>> 0;
  return `7656119${String(8000000000 + (h % 999999999)).slice(0, 10)}`;
};

export const SCENARIOS: Scenario[] = [
  {
    game: "minecraft",
    tab: "Minecraft",
    server: "ArcticMC · Выживание",
    product: {
      name: "Frost",
      caption: "Привилегия · 30 дней",
      price: 299,
      glyph: "F",
      perks: ["Цветной ник и префикс", "/kit frost раз в сутки", "3 дома вместо 1"],
    },
    defaultPlayer: "kotik228",
    idLabel: "Ник",
    playerId: (n) => n,
    methods: ["СБП", "Карта", "SberPay"],
    commands: [
      {
        template: "lp user {player} parent addtemp frost 30d",
        output: "[LP] {player} now inherits permissions from frost for a duration of 30d.",
      },
      {
        template: "points give {player} 300",
        output: "[PlayerPoints] Successfully gave 300 points to {player}.",
      },
    ],
    agent: "плагин PayMC 2.4 · Paper 1.21.4",
    chat: {
      prefix: "[ArcticMC]",
      broadcast: "{player} поддержал сервер и получил Frost — спасибо!",
      personal: "Привилегия Frost активна до 6 декабря. Бонус: 300 снежинок.",
    },
  },
  {
    game: "rust",
    tab: "Rust",
    server: "KRAKEN · Main x2",
    product: {
      name: "VIP до вайпа",
      caption: "Набор и очередь без ожидания",
      price: 349,
      glyph: "V",
      perks: ["Kit VIP раз в 12 часов", "Пропуск очереди на сервер", "Телепорт без кулдауна"],
    },
    defaultPlayer: "d1ma",
    idLabel: "SteamID64",
    playerId: steamId,
    methods: ["СБП", "Карта", "T-Pay"],
    commands: [
      {
        template: "oxide.usergroup add {steamid} vip",
        output: "Player '{player}' added to group: vip",
      },
      {
        template: "inventory.giveto {steamid} supply.signal 2",
        output: "[ServerVar] giving {player} 2 x Supply Signal",
      },
    ],
    agent: "плагин PayMC · Oxide 2.0",
    chat: {
      prefix: "[KRAKEN]",
      broadcast: "{player} купил VIP до вайпа. Удачи в рейдах!",
      personal: "VIP активен до вайпа (чт, 18:00). Сигналки уже в инвентаре.",
    },
  },
  {
    game: "gta5",
    tab: "GTA V RP",
    server: "Neva Life RP · #1",
    product: {
      name: "Стартовый капитал",
      caption: "50 000 $ и VIP на 30 дней",
      price: 499,
      glyph: "$",
      perks: ["50 000 $ на банковский счёт", "VIP: +20 % к зарплате", "Слот под второй автомобиль"],
    },
    defaultPlayer: "Ivan_Petrov",
    idLabel: "Static ID",
    playerId: () => "1042",
    methods: ["СБП", "SberPay", "Карта"],
    commands: [
      {
        template: "paymc deliver --static {staticid} --money 50000",
        output: "[NevaRP] Static #1042 ({player}): bank +50000$",
      },
      {
        template: "paymc deliver --static {staticid} --vip 30d",
        output: "[NevaRP] Static #1042 ({player}): VIP until 06.12.2026",
      },
    ],
    agent: "ресурс PayMC · RAGE:MP 1.1",
    chat: {
      prefix: "[Neva Life]",
      broadcast: "Спасибо за поддержку проекта, {player}!",
      personal: "На счёт зачислено 50 000 $. VIP-статус активен 30 дней.",
    },
  },
  {
    game: "ark",
    tab: "ARK",
    server: "Frontier · The Island x5",
    product: {
      name: "1 500 очков магазина",
      caption: "Валюта ArkShop",
      price: 249,
      glyph: "1.5K",
      perks: ["Тратятся в /shop на сервере", "Не сгорают после вайпа", "Можно подарить сокланам"],
    },
    defaultPlayer: "Survivor_Kirill",
    idLabel: "EOS ID",
    playerId: (n) => `0002${steamId(n).slice(-12)}a1f`,
    methods: ["СБП", "Карта", "ЮMoney"],
    commands: [
      {
        template: "AddPoints {eosid} 1500",
        output: "Successfully added 1500 points",
      },
    ],
    agent: "RCON · ArkShop 1.9",
    chat: {
      prefix: "[Frontier]",
      broadcast: "{player} пополнил очки магазина. Спасибо!",
      personal: "Начислено 1 500 очков. Откройте /shop, чтобы потратить.",
    },
  },
];

export function fillTemplate(tpl: string, nick: string, scenario: Scenario) {
  const id = scenario.playerId(nick);
  return tpl
    .replaceAll("{player}", nick)
    .replaceAll("{steamid}", id)
    .replaceAll("{eosid}", id)
    .replaceAll("{staticid}", id);
}

export function buildSteps(s: Scenario, nick: string, offline: boolean): ScenarioStep[] {
  const rcon = s.game === "ark";
  const steps: ScenarioStep[] = [
    { kind: "payment", title: "Платёж подтверждён", detail: `${s.methods[0]} · ${s.product.price} ₽`, ms: 0 },
    { kind: "webhook", title: "Вебхук принят, подпись проверена", detail: "антифрод: риск 4 / 100", ms: rcon ? 52 : 38 },
    { kind: "queued", title: `Задание в очереди сервера`, detail: s.server, ms: 3 },
  ];
  if (offline) {
    steps.push(
      { kind: "awaiting", title: "Игрок не в сети — выдача отложена", detail: "сработает при входе на сервер", ms: 0 },
      { kind: "joined", title: `${nick} зашёл на сервер`, detail: "через 2 ч 14 мин", ms: 0 },
    );
  }
  steps.push({
    kind: "sent",
    title: rcon ? "Команды отправлены по RCON" : "Агент получил задание",
    detail: s.agent,
    ms: rcon ? 410 : s.game === "rust" ? 84 : 61,
  });
  s.commands.forEach((c, i) => {
    steps.push({
      kind: "executed",
      title: s.commands.length > 1 ? `Команда ${i + 1} из ${s.commands.length} выполнена` : "Команда выполнена",
      command: fillTemplate(c.template, nick, s),
      output: fillTemplate(c.output, nick, s),
      ms: rcon ? 120 : 14 + i * 9,
    });
  });
  steps.push({ kind: "confirmed", title: "Подтверждение от сервера", detail: "игроку отправлено сообщение", ms: 7 });
  return steps;
}
