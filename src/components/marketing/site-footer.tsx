import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Продукт",
    links: [
      { label: "Трассировка выдачи", href: "/#delivery" },
      { label: "Кампании в игре", href: "/#growth" },
      { label: "Выплаты и сплит", href: "/#money" },
      { label: "Калькулятор", href: "/#calculator" },
      { label: "Цены", href: "/#pricing" },
      { label: "Что нового", href: "/#changelog" },
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
    title: "Попробовать",
    links: [
      { label: "Демо-кабинет", href: "/dashboard" },
      { label: "Демо-витрина", href: "/s/arctic" },
      { label: "Создать магазин", href: "/signup" },
      { label: "Переезд с другой площадки", href: "/#migrate" },
      { label: "Дизайн-система", href: "/design" },
    ],
  },
  {
    title: "Документы",
    links: [
      { label: "Оферта для владельцев", href: "/legal#offer" },
      { label: "Правила для игроков", href: "/legal#players" },
      { label: "Возвраты", href: "/legal#refunds" },
      { label: "Персональные данные", href: "/legal#privacy" },
      { label: "Реквизиты", href: "/legal#requisites" },
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
            href="/#changelog"
            className="mt-6 inline-flex h-8 items-center gap-2 rounded-full border border-line bg-surface/60 px-3 text-xs text-fg-2 transition-colors hover:border-line-strong"
          >
            Что нового
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
          <p>
            © 2026 PayMC · Данные хранятся в РФ ·{" "}
            <Link href="/legal#requisites" className="transition-colors hover:text-fg-2">
              реквизиты оператора
            </Link>
          </p>
          <p className="font-mono">СБП · Мир · SberPay · T-Pay · ЮMoney · баланс телефона</p>
        </div>
      </div>
    </footer>
  );
}
