import {
  BarChart3,
  CalendarRange,
  FlaskConical,
  Handshake,
  LayoutGrid,
  Megaphone,
  Package,
  PanelsTopLeft,
  Plug,
  Receipt,
  Server,
  Settings,
  TicketPercent,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** keyboard chord after "g" */
  key?: string;
  /** small hint shown in command palette */
  hint?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Продажи",
    items: [
      { href: "/dashboard", label: "Обзор", icon: LayoutGrid, key: "h", hint: "Пульс проекта" },
      { href: "/dashboard/analytics", label: "Аналитика", icon: BarChart3, key: "a", hint: "Выручка × онлайн, когорты, прогноз" },
      { href: "/dashboard/orders", label: "Заказы", icon: Receipt, key: "o", hint: "Трассировка доставки" },
      { href: "/dashboard/players", label: "Игроки", icon: Users, key: "i", hint: "Профили, LTV, риски" },
    ],
  },
  {
    label: "Магазин",
    items: [
      { href: "/dashboard/products", label: "Товары", icon: Package, key: "p", hint: "Каталог и команды выдачи" },
      { href: "/dashboard/storefront", label: "Витрина", icon: PanelsTopLeft, key: "v", hint: "Конструктор магазина" },
      { href: "/dashboard/servers", label: "Серверы", icon: Server, key: "s", hint: "Подключение и очередь команд" },
    ],
  },
  {
    label: "Рост",
    items: [
      { href: "/dashboard/campaigns", label: "Кампании в игре", icon: Megaphone, key: "c", hint: "Брошенные корзины, возврат игроков" },
      { href: "/dashboard/promo", label: "Промокоды", icon: TicketPercent, hint: "Скидки и лимиты" },
      { href: "/dashboard/creators", label: "Партнёры", icon: Handshake, hint: "Коды блогеров и выплаты им" },
      { href: "/dashboard/calendar", label: "Календарь акций", icon: CalendarRange, key: "k", hint: "Вайпы, сезоны, распродажи" },
      { href: "/dashboard/experiments", label: "A/B-тесты", icon: FlaskConical, hint: "Цены и витрина" },
    ],
  },
  {
    label: "Деньги",
    items: [{ href: "/dashboard/finance", label: "Финансы", icon: Wallet, key: "f", hint: "Баланс, выплаты, сплит, чеки" }],
  },
  {
    label: "Система",
    items: [
      { href: "/dashboard/integrations", label: "Интеграции", icon: Plug, hint: "Discord, Telegram, API" },
      { href: "/dashboard/settings", label: "Настройки", icon: Settings, key: ",", hint: "Проект, команда, антифрод" },
    ],
  },
];

export const NAV_FLAT = NAV.flatMap((g) => g.items);

export function findNavItem(pathname: string) {
  const exact = NAV_FLAT.find((i) => i.href === pathname);
  if (exact) return exact;
  return [...NAV_FLAT]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => i.href !== "/dashboard" && pathname.startsWith(i.href));
}
