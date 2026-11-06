import { COMMAND_LIBRARY, templatesFor } from "@/lib/command-library";
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
  pack("ranks", "VIP-статус", "gta.vip", "Через ресурс PayMC для RAGE:MP и alt:V", [
    ["VIP Silver", 299, (t) => t.replace("{days}", "30")],
    ["VIP Gold", 599, (t) => t.replace("{days}", "30")],
    ["VIP Platinum", 999, (t) => t.replace("{days}", "30")],
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

/** Starter packs for a game: curated for the top games, generated from the template library otherwise. */
export function starterPacks(game: GameId): StarterPack[] {
  const curated = game === "minecraft" ? MC : game === "rust" ? RUST : game === "gta5" ? GTA : null;
  if (curated) return curated.filter((p): p is StarterPack => p !== null);
  return templatesFor(game)
    .slice(0, 3)
    .map((t, i) => ({
      id: `pack-${i}`,
      title: t.title,
      plugin: t.plugin,
      description: t.description,
      items: (["S", "M", "L"] as const).map((size, j) => ({
        id: `pack-${i}-${j}`,
        name: `${t.title} · ${size}`,
        price: [99, 249, 499][j],
        command: t.template.replace("{amount}", String([1, 3, 10][j])).replace("{days}", "30"),
      })),
    }));
}

export const MIGRATION_SOURCES = [
  { id: "easydonate", label: "EasyDonate", hint: "по API-ключу магазина" },
  { id: "trademc", label: "TradeMC", hint: "по токену из настроек" },
  { id: "gamestores", label: "GameStores", hint: "экспорт товаров и истории" },
  { id: "tebex", label: "Tebex", hint: "пакеты, категории, промокоды" },
  { id: "csv", label: "CSV-файл", hint: "name, price, command" },
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
