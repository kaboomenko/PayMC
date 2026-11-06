import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Документы",
  description: "Оферта для владельцев магазинов, правила для игроков, возвраты, персональные данные и реквизиты PayMC.",
};

const DOCS: { id: string; title: string; updated: string; points: string[] }[] = [
  {
    id: "offer",
    title: "Оферта для владельцев магазинов",
    updated: "04.11.2026",
    points: [
      "PayMC предоставляет сервис магазина, приёма платежей через банк-партнёр и автоматической выдачи покупок на игровой сервер.",
      "Деньги игроков проходят через банк-партнёр по схеме мультирасчётов и не хранятся на счёте PayMC.",
      "Комиссия — 4,9 % с платежа, всё включено. Ставка снижается автоматически: 3,9 % при обороте от 500 тыс ₽ в месяц, 2,9 % — от 3 млн ₽. Отдельно и только по желанию: мгновенный вывод +0,5 %; платежи с баланса телефона — комиссия оператора + 2 п.п.",
      "Выплаты — ежедневно в 12:00 МСК на карту или по СБП. Платежи картой проходят холд 24 часа, платежи по СБП — без холда.",
      "Запрещено продавать то, что нарушает правила игры, законы РФ или права третьих лиц. Подсказки в редакторе товаров помогают это проверить.",
    ],
  },
  {
    id: "players",
    title: "Правила для игроков",
    updated: "04.11.2026",
    points: [
      "Покупку выдаёт владелец сервера через PayMC. Если игрок не в сети, выдача произойдёт при следующем входе на сервер.",
      "Чек об оплате формируется автоматически и отправляется на указанную почту.",
      "Покупатели младше 14 лет совершают покупки с согласия родителей. Владелец может включить лимит трат и подтверждение крупных покупок.",
    ],
  },
  {
    id: "refunds",
    title: "Возвраты",
    updated: "04.11.2026",
    points: [
      "Если покупка не выдана из-за технической ошибки, деньги возвращаются полностью тем же способом оплаты.",
      "Возврат инициирует владелец магазина в кабинете; выданное снимается командами отмены автоматически.",
      "Споры через банк рассматриваются по трассе выдачи: время оплаты, выполненные команды, время входа игрока на сервер.",
    ],
  },
  {
    id: "privacy",
    title: "Персональные данные",
    updated: "01.09.2026",
    points: [
      "Обрабатываем минимум данных: ник, игровой идентификатор, почту для чека (по желанию), технические данные платежа.",
      "Данные хранятся на серверах в РФ. Согласие на обработку — отдельным документом при оплате.",
      "Данные карт PayMC не получает и не хранит: их обрабатывает банк-партнёр с сертификацией PCI DSS.",
    ],
  },
];

export default function LegalPage() {
  return (
    <div className="container-page pt-32 pb-24">
      <p className="label-mono text-azure-300">Документы</p>
      <h1 className="mt-5 max-w-3xl text-h1">Коротко и по делу.</h1>
      <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-fg-2">
        Ниже — главные положения документов PayMC. Полные тексты публикуются вместе с запуском приёма платежей.
      </p>

      <div className="mt-14 grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Документы" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 border-l border-line">
            {[...DOCS, { id: "requisites", title: "Реквизиты" }].map((d) => (
              <li key={d.id}>
                <Link href={`#${d.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-[13.5px] text-fg-3 transition-colors hover:border-fg-3 hover:text-fg">
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-14">
          {DOCS.map((d) => (
            <section key={d.id} id={d.id} className="scroll-mt-24">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
                <h2 className="text-h3">{d.title}</h2>
                <span className="font-mono text-xs text-fg-4">редакция от {d.updated}</span>
              </div>
              <ol className="mt-5 space-y-3">
                {d.points.map((p, i) => (
                  <li key={i} className="grid grid-cols-[28px_1fr] text-[15px] leading-relaxed text-fg-2">
                    <span className="font-mono text-xs leading-7 text-fg-4">{String(i + 1).padStart(2, "0")}</span>
                    {p}
                  </li>
                ))}
              </ol>
            </section>
          ))}

          <section id="requisites" className="scroll-mt-24">
            <div className="border-b border-line pb-3">
              <h2 className="text-h3">Реквизиты</h2>
            </div>
            <dl className="mt-5 grid gap-x-8 gap-y-3 font-mono text-[13px] sm:grid-cols-[180px_1fr]">
              <dt className="text-fg-4">Оператор</dt>
              <dd className="text-fg-2">ООО «ПэйЭмСи» (реквизиты будут опубликованы при запуске)</dd>
              <dt className="text-fg-4">ИНН и ОГРН</dt>
              <dd className="text-fg-2">опубликуем при запуске приёма платежей</dd>
              <dt className="text-fg-4">Поддержка</dt>
              <dd className="text-fg-2">Telegram, ответ в рабочее время — до 15 минут</dd>
              <dt className="text-fg-4">Хранение данных</dt>
              <dd className="text-fg-2">Российская Федерация</dd>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
