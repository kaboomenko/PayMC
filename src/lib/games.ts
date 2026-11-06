import type { GameId } from "@/lib/mock/types";

export interface GameMeta {
  id: GameId;
  name: string;
  short: string;
  /** how PayMC connects to the server */
  integration: string;
  platforms: string[];
  /** player identity used in delivery commands */
  idLabel: "UUID" | "SteamID64" | "EOS ID" | "Static ID" | "Ник" | "Hytale ID";
  status: "ready" | "beta" | "soon";
  /** rules worth knowing before selling — shown as hints in the product editor */
  rules?: string;
}

export const GAMES: Record<GameId, GameMeta> = {
  minecraft: {
    id: "minecraft",
    name: "Minecraft",
    short: "MC",
    integration: "Плагин для Paper, Spigot, Purpur, Folia, Velocity и BungeeCord; мод для Fabric и Forge; Bedrock через Geyser",
    platforms: ["Paper", "Purpur", "Folia", "Velocity", "BungeeCord", "Fabric", "Forge", "Geyser"],
    idLabel: "UUID",
    status: "ready",
    rules: "Правила коммерческого использования Minecraft запрещают продавать игровое преимущество: можно продавать косметику, доступ к серверу и общесерверные бонусы.",
  },
  rust: {
    id: "rust",
    name: "Rust",
    short: "RS",
    integration: "Плагин для Oxide (uMod) и Carbon; запасной канал — WebRCON",
    platforms: ["Oxide", "Carbon", "WebRCON"],
    idLabel: "SteamID64",
    status: "ready",
    rules: "Facepunch ограничивает продажу предметов, дающих преимущество в бою, на серверах с официальным статусом.",
  },
  gta5: {
    id: "gta5",
    name: "GTA V RP",
    short: "GTA",
    integration: "Ресурс для RAGE:MP и alt:V с событием выдачи; HTTP API для своих движков",
    platforms: ["RAGE:MP", "alt:V"],
    idLabel: "Static ID",
    status: "ready",
    rules: "Серверы на FiveM обязаны продавать через Tebex по правилам Cfx.re — PayMC работает с RAGE:MP и alt:V.",
  },
  ark: {
    id: "ark",
    name: "ARK",
    short: "ARK",
    integration: "RCON + ArkShop / Permissions; плагин для ARK: Survival Ascended (AsaApi)",
    platforms: ["ArkApi", "AsaApi", "RCON"],
    idLabel: "EOS ID",
    status: "ready",
  },
  unturned: {
    id: "unturned",
    name: "Unturned",
    short: "UT",
    integration: "Плагин для RocketMod и OpenMod (Uconomy, Kits, Permissions)",
    platforms: ["RocketMod", "OpenMod"],
    idLabel: "SteamID64",
    status: "ready",
  },
  gmod: {
    id: "gmod",
    name: "Garry's Mod",
    short: "GM",
    integration: "Аддон для ULX/ULib и SAM; деньги DarkRP, PointShop 2",
    platforms: ["ULX", "SAM", "DarkRP", "PointShop 2"],
    idLabel: "SteamID64",
    status: "ready",
  },
  cs2: {
    id: "cs2",
    name: "Counter-Strike 2",
    short: "CS2",
    integration: "Плагин для CounterStrikeSharp, интеграция с VIP Core и системами админок",
    platforms: ["CounterStrikeSharp", "Metamod:Source"],
    idLabel: "SteamID64",
    status: "ready",
  },
  dayz: {
    id: "dayz",
    name: "DayZ",
    short: "DZ",
    integration: "Мод-агент для DayZ Server и BattlEye RCON",
    platforms: ["DayZ Server", "BattlEye RCON"],
    idLabel: "SteamID64",
    status: "ready",
    rules: "Монетизация серверов DayZ требует предварительного одобрения Bohemia Interactive.",
  },
  scum: {
    id: "scum",
    name: "SCUM",
    short: "SC",
    integration: "Выдача через RCON-бота и админ-команды #SpawnItem",
    platforms: ["RCON"],
    idLabel: "SteamID64",
    status: "ready",
  },
  "7dtd": {
    id: "7dtd",
    name: "7 Days to Die",
    short: "7D",
    integration: "Telnet/WebAPI + серверные моды (ServerTools)",
    platforms: ["Telnet", "WebAPI"],
    idLabel: "SteamID64",
    status: "ready",
  },
  pz: {
    id: "pz",
    name: "Project Zomboid",
    short: "PZ",
    integration: "RCON и серверный Lua-мод",
    platforms: ["RCON", "Lua"],
    idLabel: "Ник",
    status: "ready",
  },
  samp: {
    id: "samp",
    name: "SA-MP / CRMP",
    short: "SA",
    integration: "Pawn-инклюд и HTTP-коллбэк; RCON",
    platforms: ["SA-MP", "open.mp", "CRMP"],
    idLabel: "Ник",
    status: "ready",
  },
  valheim: {
    id: "valheim",
    name: "Valheim",
    short: "VH",
    integration: "Мод для BepInEx",
    platforms: ["BepInEx"],
    idLabel: "SteamID64",
    status: "beta",
  },
  palworld: {
    id: "palworld",
    name: "Palworld",
    short: "PW",
    integration: "REST API сервера и RCON",
    platforms: ["REST API", "RCON"],
    idLabel: "SteamID64",
    status: "beta",
  },
  terraria: {
    id: "terraria",
    name: "Terraria",
    short: "TR",
    integration: "Плагин для TShock",
    platforms: ["TShock"],
    idLabel: "Ник",
    status: "beta",
  },
  hytale: {
    id: "hytale",
    name: "Hytale",
    short: "HY",
    integration: "Серверный плагин — ранний доступ",
    platforms: ["Hytale Server"],
    idLabel: "Hytale ID",
    status: "beta",
  },
};

/** Ordered by popularity in RU/CIS server hosting */
export const GAME_LIST: GameMeta[] = (
  ["minecraft", "rust", "gta5", "ark", "unturned", "gmod", "cs2", "dayz", "scum", "samp", "7dtd", "pz", "valheim", "palworld", "terraria", "hytale"] as GameId[]
).map((id) => GAMES[id]);
