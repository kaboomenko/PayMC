import type { GameId } from "@/lib/mock/types";

/**
 * Library of ready-made delivery commands for popular server plugins.
 * Owners pick "what to give" and PayMC fills the exact console command.
 * Variables: {player} {uuid} {steamid} {eosid} {staticid} {days} {amount} {custom}
 */
export interface CommandTemplate {
  id: string;
  game: GameId;
  plugin: string;
  title: string;
  description: string;
  template: string;
  /** typical example output from the server console */
  output: string;
  requireOnline?: boolean;
  /** dangerous commands get a warning in the editor */
  danger?: string;
}

export const VARIABLES: { key: string; label: string; example: string; games?: GameId[] }[] = [
  { key: "{player}", label: "Ник игрока", example: "kotik228" },
  { key: "{uuid}", label: "UUID игрока", example: "1f3a…c9e2", games: ["minecraft"] },
  { key: "{steamid}", label: "SteamID64", example: "76561198012345678", games: ["rust", "unturned", "gmod", "cs2", "dayz", "scum", "7dtd", "valheim", "palworld"] },
  { key: "{eosid}", label: "EOS ID", example: "0002a1f…", games: ["ark"] },
  { key: "{staticid}", label: "Static ID персонажа", example: "1042", games: ["gta5", "samp"] },
  { key: "{days}", label: "Срок в днях", example: "30" },
  { key: "{amount}", label: "Количество", example: "3" },
  { key: "{custom}", label: "Поле, которое заполняет игрок", example: "ICE" },
];

export const COMMAND_LIBRARY: CommandTemplate[] = [
  // ── Minecraft ──
  { id: "luckperms.parent.addtemp", game: "minecraft", plugin: "LuckPerms", title: "Группа на время", description: "Выдаёт привилегию на N дней. Повторная покупка продлевает срок.", template: "lp user {player} parent addtemp vip {days}d accumulate", output: "[LP] kotik228 now inherits permissions from vip for a duration of 30d." },
  { id: "luckperms.parent.add", game: "minecraft", plugin: "LuckPerms", title: "Группа навсегда", description: "Выдаёт привилегию без срока.", template: "lp user {player} parent add vip", output: "[LP] kotik228 now inherits permissions from vip in context global." },
  { id: "luckperms.permission.set", game: "minecraft", plugin: "LuckPerms", title: "Отдельное право", description: "Например, питомец, частицы или плащ.", template: "lp user {player} permission set pets.type.fox true", output: "[LP] Set pets.type.fox to true for kotik228 in context global." },
  { id: "luckperms.permission.settemp", game: "minecraft", plugin: "LuckPerms", title: "Право на время", description: "Временный доступ к команде или косметике.", template: "lp user {player} permission settemp essentials.fly true {days}d", output: "[LP] Set essentials.fly to true for kotik228 for a duration of 30d." },
  { id: "luckperms.meta.setprefix", game: "minecraft", plugin: "LuckPerms", title: "Свой префикс", description: "Игрок вводит текст префикса при покупке.", template: "lp user {player} meta setprefix 100 \"&b[{custom}]&r \"", output: "[LP] kotik228 had prefix set at priority 100." },
  { id: "playerpoints.give", game: "minecraft", plugin: "PlayerPoints", title: "Донат-валюта", description: "Начисляет поинты на баланс игрока.", template: "points give {player} {amount}", output: "[PlayerPoints] Successfully gave 1000 points to kotik228." },
  { id: "vault.eco.give", game: "minecraft", plugin: "EssentialsX", title: "Игровые деньги", description: "Пополняет баланс через Vault-экономику.", template: "eco give {player} {amount}", output: "$10,000 added to kotik228 account." },
  { id: "essentials.kit", game: "minecraft", plugin: "EssentialsX", title: "Набор предметов", description: "Выдаёт кит. Игрок должен быть онлайн.", template: "essentials:kit start {player}", output: "Kit start given to kotik228.", requireOnline: true },
  { id: "excellentcrates.key.give", game: "minecraft", plugin: "ExcellentCrates", title: "Ключи от кейса", description: "Виртуальные ключи — не займут инвентарь.", template: "excellentcrates key give {player} ice {amount}", output: "[ExcellentCrates] Given x3 ice key(s) to kotik228." },
  { id: "crazycrates.give", game: "minecraft", plugin: "CrazyCrates", title: "Ключи CrazyCrates", description: "Виртуальный ключ от кейса.", template: "crazycrates give virtual Ice {amount} {player}", output: "[CrazyCrates] You have given kotik228 3 Ice keys." },
  { id: "litebans.unban", game: "minecraft", plugin: "LiteBans", title: "Разбан", description: "Снимает бан на всех серверах сети.", template: "litebans:unban {player} --sender=PayMC", output: "[LiteBans] kotik228 has been unbanned by PayMC." },
  { id: "litebans.unmute", game: "minecraft", plugin: "LiteBans", title: "Размут", description: "Снимает блокировку чата.", template: "litebans:unmute {player} --sender=PayMC", output: "[LiteBans] kotik228 has been unmuted by PayMC." },
  { id: "cmi.money", game: "minecraft", plugin: "CMI", title: "Деньги CMI", description: "Для серверов на CMI вместо Essentials.", template: "cmi money give {player} {amount}", output: "[CMI] Added 10000 to kotik228 balance." },
  { id: "boosters.global", game: "minecraft", plugin: "Boosters", title: "Бустер для всех", description: "Общесерверный бонус — подходит для складчины.", template: "boosters activate xp 2 24h global", output: "[Boosters] Global XP booster x2 activated for 24h." },
  { id: "minecraft.op", game: "minecraft", plugin: "Vanilla", title: "Права оператора", description: "Полный доступ к серверу.", template: "op {player}", output: "Made kotik228 a server operator", danger: "Выдаёт полный доступ к серверу. Не продавайте это — и не храните такую команду в товаре." },
  // ── Rust ──
  { id: "oxide.usergroup.add", game: "rust", plugin: "Oxide / Carbon", title: "Группа (VIP)", description: "Добавляет игрока в группу прав Oxide.", template: "oxide.usergroup add {steamid} vip", output: "Player 'd1ma' added to group: vip" },
  { id: "oxide.usergroup.remove", game: "rust", plugin: "Oxide / Carbon", title: "Снять группу", description: "Для истечения срока или возврата.", template: "oxide.usergroup remove {steamid} vip", output: "Player 'd1ma' removed from group: vip" },
  { id: "oxide.grant", game: "rust", plugin: "Oxide / Carbon", title: "Право плагина", description: "Например, доступ к /skin или телепорту.", template: "oxide.grant user {steamid} skins.use", output: "Player 'd1ma' granted permission 'skins.use'" },
  { id: "rust.giveto", game: "rust", plugin: "Rust", title: "Предмет в инвентарь", description: "Выдаёт предмет. Игрок должен быть онлайн.", template: "inventory.giveto {steamid} supply.signal {amount}", output: "[ServerVar] giving d1ma 2 x Supply Signal", requireOnline: true },
  { id: "rust.kits", game: "rust", plugin: "Kits", title: "Набор Kits", description: "Выдаёт набор из плагина Kits.", template: "kit give {steamid} vip", output: "Kit 'vip' given to d1ma", requireOnline: true },
  { id: "rust.economics", game: "rust", plugin: "Economics", title: "Баланс Economics", description: "Пополняет игровой баланс.", template: "deposit {steamid} {amount}", output: "Deposited 5000 to d1ma" },
  { id: "rust.serverrewards", game: "rust", plugin: "ServerRewards", title: "Очки ServerRewards", description: "Очки для внутреннего магазина.", template: "sr add {steamid} {amount}", output: "d1ma has been given 500 RP" },
  // ── ARK ──
  { id: "arkshop.addpoints", game: "ark", plugin: "ArkShop", title: "Очки магазина", description: "Начисляет очки ArkShop.", template: "AddPoints {eosid} {amount}", output: "Successfully added points" },
  { id: "arkshop.givekit", game: "ark", plugin: "ArkShop", title: "Набор ArkShop", description: "Выдаёт кит из конфигурации ArkShop.", template: "GiveKit {eosid} vip", output: "Successfully gave kit" },
  { id: "ark.permissions", game: "ark", plugin: "Permissions", title: "Группа прав", description: "Добавляет в группу плагина Permissions.", template: "Permissions.Add {eosid} VIP", output: "Successfully added" },
  // ── Unturned ──
  { id: "unturned.uconomy", game: "unturned", plugin: "Uconomy", title: "Деньги Uconomy", description: "Пополняет баланс игрока.", template: "pay {steamid} {amount}", output: "Paid 1000 to d1ma" },
  { id: "unturned.group", game: "unturned", plugin: "RocketMod", title: "Группа прав", description: "Добавляет в группу Rocket Permissions.", template: "p add {steamid} vip", output: "Added d1ma to group vip" },
  // ── Garry's Mod ──
  { id: "gmod.ulx.adduser", game: "gmod", plugin: "ULX", title: "Ранг ULX", description: "Назначает пользователю группу.", template: "ulx adduserid {steamid} vip", output: "Added d1ma to group vip" },
  { id: "gmod.darkrp.money", game: "gmod", plugin: "DarkRP", title: "Деньги DarkRP", description: "Пополняет кошелёк игрока.", template: "darkrp addmoney {steamid} {amount}", output: "Given $5000 to d1ma" },
  // ── CS2 ──
  { id: "cs2.vip", game: "cs2", plugin: "VIP Core", title: "VIP на время", description: "Выдаёт VIP-группу на N дней.", template: "css_vip_adduser {steamid} VIP {days}", output: "[VIP] Added VIP to d1ma for 30 days" },
  // ── GTA V RP ──
  { id: "gta.money", game: "gta5", plugin: "PayMC Resource", title: "Деньги на счёт", description: "Через ресурс PayMC для RAGE:MP / alt:V.", template: "paymc deliver --static {staticid} --money {amount}", output: "[RP] Static #1042: bank +50000$" },
  { id: "gta.vip", game: "gta5", plugin: "PayMC Resource", title: "VIP-статус", description: "VIP на N дней через ресурс PayMC.", template: "paymc deliver --static {staticid} --vip {days}d", output: "[RP] Static #1042: VIP until 06.12.2026" },
  { id: "gta.vehicle", game: "gta5", plugin: "PayMC Resource", title: "Автомобиль в гараж", description: "Выдаёт транспорт в гараж персонажа.", template: "paymc deliver --static {staticid} --vehicle {custom}", output: "[RP] Static #1042: vehicle added to garage" },
  // ── SA-MP / CRMP ──
  { id: "samp.donate", game: "samp", plugin: "Pawn include", title: "Донат-рубли", description: "Через инклюд PayMC и HTTP-коллбэк.", template: "givedonate {player} {amount}", output: "Игроку Ivan_Petrov начислено 500 донат-рублей" },
  // ── DayZ / SCUM / others ──
  { id: "scum.spawn", game: "scum", plugin: "RCON", title: "Предмет", description: "Спавн предмета у игрока.", template: "#SpawnItem {steamid} Weapon_AK47 {amount}", output: "Spawned 1 Weapon_AK47" },
  { id: "pz.additem", game: "pz", plugin: "RCON", title: "Предмет", description: "Выдаёт предмет игроку.", template: "additem \"{player}\" Base.Axe {amount}", output: "Item Base.Axe added to player" },
  { id: "terraria.give", game: "terraria", plugin: "TShock", title: "Предмет", description: "Выдаёт предмет через TShock.", template: "/give \"Zenith\" {player} {amount}", output: "Gave kotik228 1 Zenith" },
];

export function templatesFor(game: GameId) {
  return COMMAND_LIBRARY.filter((t) => t.game === game);
}

export function pluginsFor(game: GameId) {
  return [...new Set(templatesFor(game).map((t) => t.plugin))];
}

/** Variables used in a template that are not known for the given game. */
export function unknownVariables(template: string, game: GameId) {
  const used = template.match(/\{[a-z_]+\}/gi) ?? [];
  const known = new Set(VARIABLES.filter((v) => !v.games || v.games.includes(game)).map((v) => v.key));
  return [...new Set(used.filter((u) => !known.has(u)))];
}
