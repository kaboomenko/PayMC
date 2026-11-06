import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Продукт",
    links: [
      { label: "Трассировка доставки", href: "/#delivery" },
      { label: "Кампании в игре", href: "/#growth" },
      { label: "Выплаты и сплит", href: "/#money" },
      { label: "Цены", href: "/#pricing" },
      { label: "Демо-магазин", href: "/s/arctic" },
      { label: "Что нового", href: "/changelog" },
    ],
  },
  {
    title: "Игры",
    links: [
      { label: "Minecraft", href: "/#games" },
      { label: "Rust", href: "/#games" },
      { label: "GTA V RP", href: "/#games" },
      { label: "ARK", href: "/#games" },
      { label: "Unturned", href: "/#games" },
      { label: "Все 16 игр", href: "/#games" },
    ],
  },
  {
    title: "Разработчикам",
    links: [
      { label: "Документация", href: "/docs" },
      { label: "REST API", href: "/docs" },
      { label: "Вебхуки", href: "/docs" },
      { label: "Плагин и моды", href: "/docs" },
      { label: "Статус систем", href: "/status" },
    ],
  },
  {
    title: "Компания",
    links: [
      { label: "Поддержка в Telegram", href: "https://t.me/paymc" },
      { label: "Партнёрская программа", href: "/#money" },
      { label: "Оферта", href: "/legal/offer" },
      { label: "Политика конфиденциальности", href: "/legal/privacy" },
      { label: "Правила для магазинов", href: "/legal/rules" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative border-t border-line-soft">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.2fr_2fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-fg-3">
            Донат-магазин для игровых серверов: приём платежей, мгновенная выдача в игре, ежедневные выплаты и чеки для
            самозанятых.
          </p>
          <Link
            href="/status"
            className="mt-6 inline-flex h-8 items-center gap-2 rounded-full border border-line bg-surface/60 px-3 text-xs text-fg-2 transition-colors hover:border-line-strong"
          >
            <span className="size-2 rounded-full bg-ok shadow-[0_0_8px_rgb(63_209_143/0.8)]" />
            Все системы работают
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="label-mono text-fg-4">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13.5px] text-fg-3 transition-colors hover:text-fg">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-line-soft">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-fg-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 PayMC. Реквизиты оператора и оферта — на странице «Оферта».</p>
          <p className="font-mono">СБП · Мир · SberPay · T-Pay · ЮMoney · Kaspi · ЕРИП</p>
        </div>
      </div>
    </footer>
  );
}
