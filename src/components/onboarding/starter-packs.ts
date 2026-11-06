import { COMMAND_LIBRARY, VARIABLES, templatesFor, type CommandTemplate } from "@/lib/command-library";
import { formatNumber, pluralize } from "@/lib/format";
import type { GameId } from "@/lib/mock/types";

export interface PackItem {
  id: string;
  name: string;
  price: number;
  /** delivery command with the item-specific argument filled in */
  command: string;
}

export interface StarterPack {
  id: string;
  title: string;
  plugin: string;
  description: string;
  items: PackItem[];
  /** shown as a warning badge: the command is a generic guess, check it on the server */
  review?: string;
}

const tpl = (id: string) => COMMAND_LIBRARY.find((t) => t.id === id);

function pack(id: string, title: string, templateId: string, description: string, items: [string, number, (t: string) => string][]): StarterPack | null {
  const t = tpl(templateId);
  if (!t) return null;
  return {
    id,
    title,
    plugin: t.plugin,
    description,
    items: items.map(([name, price, fill], i) => ({ id: `${id}-${i}`, name, price, command: fill(t.template) })),
  };
}

const MC: (StarterPack | null)[] = [
  pack("ranks", "Привилегии на LuckPerms", "luckperms.parent.addtemp", "Три ранга на 30 дней, повторная покупка продлевает срок", [
    ["VIP", 149, (t) => t],
    ["Premium", 299, (t) => t.replace(" vip ", " premium ")],
    ["Legend", 549, (t) => t.replace(" vip ", " legend ")],
  ]),
  pack("cases", "Кейсы", "excellentcrates.key.give", "Виртуальные ключи ExcellentCrates — не занимают инвентарь", [
    ["Кейс «Обычный»", 59, (t) => t.replace(" ice ", " common ").replace("{amount}", "1")],
    ["Кейс «Редкий»", 129, (t) => t.replace(" ice ", " rare ").replace("{amount}", "1")],
    ["Ключи ×10", 490, (t) => t.replace(" ice ", " common ").replace("{amount}", "10")],
  ]),
  pack("currency", "Донат-валюта", "playerpoints.give", "Поинты для /shop — игроки тратят их на косметику", [
    ["1 000 монет", 99, (t) => t.replace("{amount}", "1000")],
    ["5 000 монет", 449, (t) => t.replace("{amount}", "5000")],
    ["15 000 монет", 1190, (t) => t.replace("{amount}", "15000")],
  ]),
];

const RUST: (StarterPack | null)[] = [
  pack("ranks", "VIP-группы Oxide", "oxide.usergroup.add", "Группы прав Oxide/Carbon, снимаются автоматически по сроку", [
    ["VIP", 199, (t) => t],
    ["Premium", 399, (t) => t.replace(" vip", " premium")],
    ["Elite", 699, (t) => t.replace(" vip", " elite")],
  ]),
  pack("kits", "Наборы Kits", "rust.kits", "Выдаются, когда игрок на сервере", [
    ["Старт", 99, (t) => t.replace(" vip", " start")],
    ["Строитель", 199, (t) => t.replace(" vip", " builder")],
    ["Рейдер", 349, (t) => t.replace(" vip", " raider")],
  ]),
  pack("currency", "Баланс Economics", "rust.economics", "Игровые деньги для внутреннего магазина", [
    ["5 000 $", 99, (t) => t.replace("{amount}", "5000")],
    ["25 000 $", 449, (t) => t.replace("{amount}", "25000")],
    ["75 000 $", 1190, (t) => t.replace("{amount}", "75000")],
  ]),
];

const GTA: (StarterPack | null)[] = [
  pack("ranks", "VIP-статус", "gta.vip", "Через ресурс PayMC для RAGE:MP и alt:V — у каждого уровня своя группа", [
    ["VIP Silver · 30 дней", 299, (t) => t.replace("--vip {days}d", "--vip silver 30d")],
    ["VIP Gold · 30 дней", 599, (t) => t.replace("--vip {days}d", "--vip gold 30d")],
    ["VIP Platinum · 30 дней", 999, (t) => t.replace("--vip {days}d", "--vip platinum 30d")],
  ]),
  pack("currency", "Деньги на счёт", "gta.money", "Зачисление на банковский счёт персонажа", [
    ["50 000 $", 149, (t) => t.replace("{amount}", "50000")],
    ["250 000 $", 590, (t) => t.replace("{amount}", "250000")],
    ["1 000 000 $", 1990, (t) => t.replace("{amount}", "1000000")],
  ]),
  pack("cars", "Транспорт", "gta.vehicle", "Автомобиль сразу в гараж персонажа", [
    ["Седан", 490, (t) => t.replace("{custom}", "sultan")],
    ["Спорткар", 1490, (t) => t.replace("{custom}", "elegy")],
    ["Внедорожник", 990, (t) => t.replace("{custom}", "baller")],
  ]),
];

const MONEY_RE = /деньг|баланс|очк|валют|руб/i;

/**
 * Three items from one template, varying the argument that matters:
 * a term (7/30/90 days), an amount, or the group/kit name. Templates with
 * nothing to vary (or a player-filled {custom}) give no pack.
 */
function generated(t: CommandTemplate, i: number): StarterPack | null {
  const id = `pack-${i}`;
  const base = { id, title: t.title, plugin: t.plugin, description: t.description };
  if (t.template.includes("{custom}")) return null;
  if (t.template.includes("{days}")) {
    return {
      ...base,
      items: [7, 30, 90].map((d, j) => ({
        id: `${id}-${j}`,
        name: `${t.title} · ${pluralize(d, ["день", "дня", "дней"])}`,
        price: [99, 249, 549][j],
        command: t.template.replace("{days}", String(d)).replace("{amount}", "1"),
      })),
    };
  }
  if (t.template.includes("{amount}")) {
    const money = MONEY_RE.test(`${t.title} ${t.description}`);
    const amounts = money ? [1000, 5000, 15000] : [1, 3, 10];
    return {
      ...base,
      items: amounts.map((a, j) => ({
        id: `${id}-${j}`,
        name: money ? `${t.title} · ${formatNumber(a)}` : `${t.title} ×${a}`,
        price: (money ? [99, 449, 1190] : [99, 249, 699])[j],
        command: t.template.replace("{amount}", String(a)),
      })),
    };
  }
  if (/\bvip\b/i.test(t.template)) {
    return {
      ...base,
      items: ["VIP", "Premium", "Elite"].map((g, j) => ({
        id: `${id}-${j}`,
        name: `${t.title} · ${g}`,
        price: [199, 399, 699][j],
        command: t.template.replace(/\bvip\b/i, (m) => (m === m.toUpperCase() ? g.toUpperCase() : g.toLowerCase())),
      })),
    };
  }
  return null;
}

/** Player id variable the game's commands use: {steamid}, {eosid}… — {player} otherwise. */
function idVariable(game: GameId) {
  return VARIABLES.find((v) => v.key !== "{player}" && v.games?.includes(game))?.key ?? "{player}";
}

/** No library templates yet (DayZ, 7 Days to Die, Valheim, Palworld, Hytale): a generic agent pack to edit. */
function fallbackPack(game: GameId): StarterPack {
  const who = idVariable(game);
  return {
    id: "pack-generic",
    title: "VIP через агент PayMC",
    plugin: "PayMC Agent",
    description: "Универсальная команда агента: группа vip на срок. Поменяйте на команду своего мода или плагина.",
    review: "проверьте команду",
    items: [7, 30, 90].map((d, j) => ({
      id: `pack-generic-${j}`,
      name: `VIP · ${pluralize(d, ["день", "дня", "дней"])}`,
      price: [99, 249, 549][j],
      command: `paymc grant ${who} vip ${d}d`,
    })),
  };
}

/** Starter packs for a game: curated for the top games, generated from the template library otherwise. */
export function starterPacks(game: GameId): StarterPack[] {
  const curated = game === "minecraft" ? MC : game === "rust" ? RUST : game === "gta5" ? GTA : null;
  if (curated) return curated.filter((p): p is StarterPack => p !== null);
  const packs = templatesFor(game)
    .map((t, i) => generated(t, i))
    .filter((p): p is StarterPack => p !== null)
    .slice(0, 3);
  return packs.length ? packs : [fallbackPack(game)];
}

/* ───────────── Connection: per-game agent and console details ───────────── */

export interface GameSetup {
  /** what we call the agent in this game */
  label: string;
  /** agent file and where it goes; null — the game has no agent, RCON only */
  agent: { file: string; dir: string } | null;
  /** name of the no-install channel */
  rconLabel: string;
  rconPort: string;
  /** where the owner finds the RCON password */
  rconHint: string;
}

const RCON_CFG = "Пароль из server.cfg (rcon_password)";

export const GAME_SETUP: Record<GameId, GameSetup> = {
  minecraft: { label: "Плагин", agent: { file: "PayMC-2.4.1.jar", dir: "plugins" }, rconLabel: "RCON", rconPort: "25575", rconHint: "Пароль из server.properties (rcon.password)" },
  rust: { label: "Плагин", agent: { file: "PayMC.cs", dir: "oxide/plugins (или carbon/plugins)" }, rconLabel: "WebRCON", rconPort: "28016", rconHint: "Пароль из параметра запуска +rcon.password" },
  gta5: { label: "Ресурс", agent: { file: "paymc-2.4.1.zip", dir: "packages (RAGE:MP) или resources (alt:V)" }, rconLabel: "HTTP API", rconPort: "443", rconHint: "" },
  ark: { label: "Плагин", agent: { file: "PayMC-2.4.1.zip", dir: "ShooterGame/Binaries/Win64/ArkApi/Plugins" }, rconLabel: "RCON", rconPort: "27020", rconHint: "Пароль из GameUserSettings.ini (ServerAdminPassword)" },
  unturned: { label: "Плагин", agent: { file: "PayMC.dll", dir: "Rocket/Plugins (или OpenMod plugins)" }, rconLabel: "RCON", rconPort: "27115", rconHint: "Пароль из Rocket.config.xml (RCON Password)" },
  gmod: { label: "Аддон", agent: { file: "paymc-2.4.1.zip", dir: "garrysmod/addons" }, rconLabel: "RCON", rconPort: "27015", rconHint: RCON_CFG },
  cs2: { label: "Плагин", agent: { file: "PayMC-2.4.1.zip", dir: "addons/counterstrikesharp/plugins" }, rconLabel: "RCON", rconPort: "27015", rconHint: RCON_CFG },
  dayz: { label: "Мод", agent: { file: "@PayMC.zip", dir: "корень сервера, в запуск -servermod=@PayMC" }, rconLabel: "BattlEye RCON", rconPort: "2305", rconHint: "Пароль из BEServer_x64.cfg (RConPassword)" },
  scum: { label: "Агент", agent: null, rconLabel: "RCON", rconPort: "27015", rconHint: "Пароль RCON из ServerSettings.ini" },
  samp: { label: "Инклюд", agent: { file: "paymc.inc", dir: "pawno/include (или qawno/include)" }, rconLabel: "RCON", rconPort: "7777", rconHint: RCON_CFG },
  "7dtd": { label: "Мод", agent: { file: "PayMC-2.4.1.zip", dir: "Mods" }, rconLabel: "Telnet", rconPort: "8081", rconHint: "Пароль из serverconfig.xml (TelnetPassword)" },
  pz: { label: "Агент", agent: null, rconLabel: "RCON", rconPort: "27015", rconHint: "Пароль из servertest.ini (RCONPassword)" },
  valheim: { label: "Мод", agent: { file: "PayMC.dll", dir: "BepInEx/plugins" }, rconLabel: "RCON", rconPort: "2458", rconHint: "Пароль из BepInEx/config мода RCON" },
  palworld: { label: "Агент", agent: null, rconLabel: "RCON", rconPort: "25575", rconHint: "Пароль из PalWorldSettings.ini (AdminPassword)" },
  terraria: { label: "Плагин", agent: { file: "PayMC.dll", dir: "ServerPlugins" }, rconLabel: "REST API", rconPort: "7878", rconHint: "Токен из tshock/config.json (ApplicationRestTokens)" },
  hytale: { label: "Плагин", agent: { file: "PayMC-2.4.1.jar", dir: "plugins" }, rconLabel: "RCON", rconPort: "5520", rconHint: "Пароль RCON из config.json сервера" },
};

export const MIGRATION_SOURCES = [
  { id: "easydonate", label: "EasyDonate", hint: "по API-ключу магазина", key: "API-ключ магазина", where: "Настройки магазина → API" },
  { id: "trademc", label: "TradeMC", hint: "по токену из настроек", key: "Токен", where: "Настройки → Интеграции → токен" },
  { id: "gamestores", label: "GameStores", hint: "экспорт товаров и истории", key: "Ключ API", where: "Панель → Настройки → API" },
  { id: "tebex", label: "Tebex", hint: "пакеты, категории, промокоды", key: "Secret key", where: "Webstore → Integrations → API Keys" },
  { id: "csv", label: "CSV-файл", hint: "name, price, command", key: null, where: null },
] as const;

export type MigrationSource = (typeof MIGRATION_SOURCES)[number]["id"];

export function migrationLog(source: MigrationSource, game: GameId): { text: string; tone: "info" | "ok" | "warn" }[] {
  const label = MIGRATION_SOURCES.find((s) => s.id === source)?.label ?? source;
  const plugin = game === "minecraft" ? "LuckPerms" : game === "rust" ? "Oxide" : "шаблонами PayMC";
  return [
    { text: source === "csv" ? "Читаем products.csv — 24 строки, кодировка UTF-8" : `Подключаемся к ${label} по ключу магазина…`, tone: "info" },
    { text: "Найдено 24 товара в 5 категориях, 3 скидки", tone: "ok" },
    { text: `Команды выдачи: 31 → 29 сопоставлены с ${plugin}, 2 оставили как есть`, tone: "ok" },
    { text: "Промокоды: 4 перенесены вместе с лимитами и сроками", tone: "ok" },
    { text: source === "csv" ? "История покупок: в CSV её нет — начнём с нуля" : "История: 5 512 заказов и 1 180 игроков — для LTV и сегментов", tone: source === "csv" ? "warn" : "ok" },
    { text: "2 товара могут нарушать правила игры — отметили для проверки", tone: "warn" },
    { text: "Готово за 4,2 с. Старый магазин отключите после первой продажи здесь", tone: "ok" },
  ];
}
