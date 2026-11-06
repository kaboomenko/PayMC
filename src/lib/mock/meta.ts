/**
 * Russian labels, tones and hints for every enum in the domain model.
 * Use these instead of hard-coding strings so the product speaks one language.
 */
import type {
  ActivityKind,
  CalendarEventKind,
  CampaignChannel,
  CampaignType,
  ConnectionKind,
  CreatorPlatform,
  EulaLevel,
  Integration,
  MemberRole,
  OrderStatus,
  PayoutStatus,
  PlayerFlag,
  PlayerSegment,
  ProductKind,
  ServerStatus,
  TraceStepKind,
} from "./types";

export type Tone = "ok" | "azure" | "ice" | "warn" | "bad" | "neutral";

export const orderStatusMeta: Record<OrderStatus, { label: string; tone: Tone; hint: string }> = {
  delivered: { label: "Выдано", tone: "ok", hint: "Команды выполнены, сервер подтвердил выдачу" },
  delivering: { label: "Выдаётся", tone: "azure", hint: "Агент на сервере выполняет команды" },
  awaiting_player: { label: "Ждёт входа", tone: "ice", hint: "Игрок офлайн — выдадим при входе на сервер" },
  retrying: { label: "Повтор", tone: "warn", hint: "Сервер не ответил, пробуем снова с нарастающим интервалом" },
  failed: { label: "Ошибка", tone: "bad", hint: "Автоповторы закончились — нужно действие владельца" },
  refunded: { label: "Возврат", tone: "neutral", hint: "Деньги вернули игроку, выданное снято" },
  chargeback: { label: "Чарджбэк", tone: "bad", hint: "Банк оспорил платёж, выданное снято автоматически" },
};

export const traceStepMeta: Record<TraceStepKind, { label: string }> = {
  payment: { label: "Оплата" },
  webhook: { label: "Вебхук" },
  queued: { label: "Очередь" },
  sent: { label: "Отправлено агенту" },
  executed: { label: "Выполнено" },
  confirmed: { label: "Подтверждено" },
  awaiting_player: { label: "Ждём игрока" },
  retry: { label: "Повтор" },
  error: { label: "Ошибка" },
  refund: { label: "Возврат" },
  receipt: { label: "Чек" },
};

export const productKindMeta: Record<ProductKind, { label: string; category: string }> = {
  rank: { label: "Привилегия", category: "Привилегии" },
  subscription: { label: "Подписка", category: "Подписка" },
  case: { label: "Кейс", category: "Кейсы" },
  currency: { label: "Валюта", category: "Валюта" },
  kit: { label: "Набор", category: "Наборы" },
  unban: { label: "Разбан", category: "Разбан" },
  cosmetic: { label: "Косметика", category: "Косметика" },
  pool: { label: "Складчина", category: "Складчина" },
};

export const eulaMeta: Record<EulaLevel, { label: string; tone: Tone; hint: string }> = {
  ok: { label: "Соответствует правилам", tone: "ok", hint: "Косметика, доступ или общесерверный бонус" },
  warn: { label: "Проверьте описание", tone: "warn", hint: "Может трактоваться как игровое преимущество" },
  risk: { label: "Риск по правилам игры", tone: "bad", hint: "Даёт преимущество за деньги — нарушает правила коммерческого использования" },
};

export const segmentMeta: Record<PlayerSegment, { label: string; tone: Tone; description: string }> = {
  whale: { label: "Киты", tone: "azure", description: "Потратили 5 000 ₽ и больше" },
  loyal: { label: "Активные", tone: "ok", description: "Играют регулярно — с покупками или без" },
  new: { label: "Новички", tone: "ice", description: "Впервые зашли меньше 14 дней назад" },
  at_risk: { label: "Под угрозой ухода", tone: "warn", description: "Покупали, но не заходят 14–45 дней" },
  dormant: { label: "Спящие", tone: "neutral", description: "Не заходят больше 45 дней" },
};

export const playerFlagMeta: Record<PlayerFlag, { label: string; tone: Tone; hint: string }> = {
  chargeback: { label: "Чарджбэк", tone: "bad", hint: "Оспаривал платёж через банк" },
  network_blacklist: { label: "Чёрный список сети", tone: "bad", hint: "Отмечен другими проектами PayMC за мошенничество" },
  vpn: { label: "VPN / прокси", tone: "warn", hint: "Платежи с анонимизирующих сетей" },
  many_cards: { label: "Много карт", tone: "warn", hint: "4 и более карт за 7 дней" },
  minor_suspect: { label: "Возможно, несовершеннолетний", tone: "warn", hint: "Включён дневной лимит трат" },
};

export const campaignTypeMeta: Record<CampaignType, { label: string; description: string }> = {
  abandoned_cart: { label: "Брошенная корзина", description: "Напомнить о неоплаченной покупке при следующем входе" },
  winback: { label: "Возврат игрока", description: "Позвать обратно тех, кто перестал заходить" },
  first_purchase: { label: "Первая покупка", description: "Предложить стартовый набор новичку" },
  rank_expiring: { label: "Истекает привилегия", description: "Предложить продление за 3 дня до конца" },
  wipe_day: { label: "День вайпа", description: "Акция в первые часы после вайпа или старта сезона" },
  playtime_milestone: { label: "Наигранные часы", description: "Мягкий оффер тем, кто много играет и ничего не купил" },
  purchase_broadcast: { label: "Благодарность в чате", description: "Объявить покупку на сервере — социальное доказательство" },
  goal_progress: { label: "Цель месяца", description: "Показывать прогресс сбора на сервер" },
};

export const channelMeta: Record<CampaignChannel, { label: string }> = {
  chat: { label: "Чат" },
  title: { label: "Титр на экране" },
  bossbar: { label: "Боссбар" },
  actionbar: { label: "Экшнбар" },
  discord: { label: "Discord" },
  telegram: { label: "Telegram" },
  vk: { label: "VK" },
};

export const creatorPlatformMeta: Record<CreatorPlatform, { label: string }> = {
  youtube: { label: "YouTube" },
  twitch: { label: "Twitch" },
  vk: { label: "VK Видео" },
  tiktok: { label: "TikTok" },
  telegram: { label: "Telegram" },
  kick: { label: "Kick" },
};

export const calendarKindMeta: Record<CalendarEventKind, { label: string; tone: Tone }> = {
  wipe: { label: "Вайп", tone: "ice" },
  sale: { label: "Распродажа", tone: "azure" },
  event: { label: "Ивент", tone: "neutral" },
  holiday: { label: "Праздник", tone: "neutral" },
  season: { label: "Сезон", tone: "neutral" },
};

export const payoutStatusMeta: Record<PayoutStatus, { label: string; tone: Tone }> = {
  paid: { label: "Выплачено", tone: "ok" },
  processing: { label: "В пути", tone: "azure" },
  scheduled: { label: "Запланировано", tone: "neutral" },
  failed: { label: "Не прошла", tone: "bad" },
};

export const memberRoleMeta: Record<MemberRole, { label: string; description: string }> = {
  owner: { label: "Владелец", description: "Полный доступ, выплаты и юридические данные" },
  admin: { label: "Администратор", description: "Товары, заказы, игроки, маркетинг" },
  developer: { label: "Разработчик", description: "Серверы, команды выдачи, API и вебхуки" },
  moderator: { label: "Модератор", description: "Заказы и игроки, без финансов" },
  accountant: { label: "Бухгалтер", description: "Финансы, чеки и выгрузки, только чтение остального" },
};

export const serverStatusMeta: Record<ServerStatus, { label: string; tone: Tone }> = {
  online: { label: "На связи", tone: "ok" },
  degraded: { label: "Медленно отвечает", tone: "warn" },
  offline: { label: "Нет связи", tone: "bad" },
};

export const connectionMeta: Record<ConnectionKind, { label: string; description: string }> = {
  plugin: { label: "Плагин", description: "Постоянное соединение, выдача за доли секунды" },
  mod: { label: "Мод", description: "Для Fabric, Forge, BepInEx" },
  rcon: { label: "RCON", description: "Без установки — по паролю RCON" },
  webrcon: { label: "WebRCON", description: "Для Rust без плагина" },
  resource: { label: "Ресурс", description: "Для RAGE:MP и alt:V" },
};

export const integrationCategoryMeta: Record<Integration["category"], { label: string }> = {
  community: { label: "Сообщество" },
  notifications: { label: "Уведомления" },
  analytics: { label: "Аналитика" },
  developer: { label: "Разработчикам" },
  tax: { label: "Налоги и чеки" },
  monitoring: { label: "Мониторинги серверов" },
};

export const activityKindMeta: Record<ActivityKind, { label: string; tone: Tone }> = {
  order: { label: "Заказ", tone: "azure" },
  delivery_failed: { label: "Сбой выдачи", tone: "warn" },
  awaiting_player: { label: "Ждёт игрока", tone: "ice" },
  payout: { label: "Выплата", tone: "ok" },
  chargeback: { label: "Чарджбэк", tone: "bad" },
  server_offline: { label: "Сервер недоступен", tone: "bad" },
  server_online: { label: "Сервер на связи", tone: "ok" },
  campaign: { label: "Кампания", tone: "azure" },
  member: { label: "Команда", tone: "neutral" },
  receipt: { label: "Чеки", tone: "neutral" },
  fraud_blocked: { label: "Антифрод", tone: "ice" },
};
