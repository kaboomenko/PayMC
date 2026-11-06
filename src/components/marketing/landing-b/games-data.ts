import type { GameId } from "@/lib/mock/types";

/**
 * How each game connects and what the owner actually types.
 * `agent` — plugin / mod / resource / addon on the server; `rcon` — remote console (RCON, WebRCON, Telnet, REST).
 */
export const GAME_INSTALL: Record<GameId, { via: ("agent" | "rcon")[]; snippet: string; title: string }> = {
  minecraft: {
    via: ["agent"],
    title: "Paper · Purpur · Folia · Velocity",
    snippet: [
      "# 1. Скачайте PayMC.jar в папку /plugins и перезапустите сервер",
      "$ wget -O plugins/PayMC.jar https://get.paymc.ru/paper",
      "# 2. В консоли сервера:",
      "> paymc connect pk_live_7Hq2…mX9",
    ].join("\n"),
  },
  rust: {
    via: ["agent", "rcon"],
    title: "Oxide · Carbon",
    snippet: ["# 1. Положите PayMC.cs в oxide/plugins (или carbon/plugins)", "> oxide.reload PayMC", "# 2. Подключите проект:", "> paymc.connect pk_live_7Hq2…mX9"].join("\n"),
  },
  gta5: {
    via: ["agent"],
    title: "RAGE:MP · alt:V",
    snippet: [
      "# 1. Ресурс paymc: packages/ (RAGE:MP) или resources/ (alt:V)",
      "> paymc connect pk_live_7Hq2…mX9",
      "# 2. Выдача приходит событием на сервер:",
      "mp.events.add('paymc:deliver', (staticId, items) => giveItems(staticId, items))",
    ].join("\n"),
  },
  ark: {
    via: ["rcon", "agent"],
    title: "RCON · ArkShop",
    snippet: [
      "# GameUserSettings.ini — включите RCON",
      "RCONEnabled=True",
      "RCONPort=27020",
      "# Укажите RCON-порт и пароль в кабинете: Серверы → Подключить → RCON",
    ].join("\n"),
  },
  unturned: {
    via: ["agent"],
    title: "RocketMod · OpenMod",
    snippet: ["# RocketMod: Rocket/Plugins/PayMC.dll", "$ openmod install PayMC", "> paymc connect pk_live_7Hq2…mX9"].join("\n"),
  },
  gmod: {
    via: ["agent"],
    title: "ULX · SAM · DarkRP",
    snippet: ["# Распакуйте аддон в garrysmod/addons/paymc", "> paymc_connect pk_live_7Hq2…mX9", "# деньги DarkRP и PointShop 2 — готовые шаблоны команд"].join("\n"),
  },
  cs2: {
    via: ["agent"],
    title: "CounterStrikeSharp",
    snippet: ["# addons/counterstrikesharp/plugins/PayMC", "> css_paymc_connect pk_live_7Hq2…mX9", "# VIP Core: выдача групп без перезапуска карты"].join("\n"),
  },
  dayz: {
    via: ["agent", "rcon"],
    title: "Мод-агент · BattlEye RCON",
    snippet: ["# Запуск сервера с модом:", "-servermod=@PayMC", "# BEServer_x64.cfg", "RConPort 2306"].join("\n"),
  },
  scum: {
    via: ["rcon"],
    title: "RCON-бот",
    snippet: ["# Укажите IP, RCON-порт и пароль в кабинете", "# Шаблон выдачи:", "#SpawnItem {steamid} Weapon_AK47 {amount}"].join("\n"),
  },
  "7dtd": {
    via: ["rcon", "agent"],
    title: "Telnet · ServerTools",
    snippet: ["# serverconfig.xml", '<property name="TelnetEnabled" value="true"/>', '<property name="TelnetPort" value="8081"/>', "# Порт и пароль — в кабинете"].join("\n"),
  },
  pz: {
    via: ["rcon", "agent"],
    title: "RCON · Lua-мод",
    snippet: ["# servertest.ini", "RCONPort=27015", "RCONPassword=********", "# Lua-мод PayMC — для выдачи предметов офлайн-игрокам"].join("\n"),
  },
  samp: {
    via: ["agent", "rcon"],
    title: "Pawn · open.mp",
    snippet: ["#include <paymc>", "", "public OnPayMCDeliver(playerid, const product[], amount)", "{", "    return GiveDonate(playerid, product, amount);", "}"].join("\n"),
  },
  valheim: {
    via: ["agent"],
    title: "BepInEx",
    snippet: ["# BepInEx/plugins/PayMC.dll", "> paymc connect pk_live_7Hq2…mX9", "# бета: выдача предметов и ролей"].join("\n"),
  },
  palworld: {
    via: ["rcon"],
    title: "REST API · RCON",
    snippet: ["# PalWorldSettings.ini", "RESTAPIEnabled=True,RESTAPIPort=8212", "RCONEnabled=True,RCONPort=25575", "# Адрес и пароль администратора — в кабинете"].join("\n"),
  },
  terraria: {
    via: ["agent"],
    title: "TShock 5",
    snippet: ["# ServerPlugins/PayMC.dll", "> /paymc connect pk_live_7Hq2…mX9", "# группы TShock и предметы — готовые шаблоны"].join("\n"),
  },
  hytale: {
    via: ["agent"],
    title: "Hytale Server",
    snippet: ["# Ранний доступ: plugins/paymc.jar", "> paymc connect pk_live_7Hq2…mX9", "# API сервера ещё меняется — обновляем плагин сами"].join("\n"),
  },
};
