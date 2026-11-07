import Link from "next/link";
import { Send } from "lucide-react";
import { Section } from "@/components/marketing/section";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Кто принимает платежи и куда идут деньги?",
    a: "Платежи принимает банк-партнёр PayMC по схеме мультирасчётов: деньги игрока сразу делятся между вами и платформой, PayMC их у себя не держит. Условия — в публичной оферте, договор заключается онлайн при регистрации.",
  },
  {
    q: "Нужен ли статус самозанятого или ИП?",
    a: "Для выплат — да: самозанятый, ИП или ООО. Самозанятость оформляется в приложении «Мой налог» за 10 минут. Лимит НПД — 2,4 млн ₽ в год, кабинет показывает, сколько осталось. Собрать и проверить магазин можно и до оформления.",
  },
  {
    q: "Как работают чеки?",
    a: "Самозанятым чек на каждый платёж формируется сам — через партнёрский доступ к «Мой налог». Для ИП и ООО — облачная касса по 54-ФЗ: чек уходит игроку на почту сразу после оплаты. Касса и ОФД уже входят в ставку.",
  },
  {
    q: "Когда приходят выплаты и что, если банк отклонил перевод?",
    a: "Каждый день в 12:00 МСК — на карту или по СБП. Оплата картой проходит холд 24 часа, СБП — без холда. Если банк отклонил перевод, повторяем его через резервный банк и пишем вам в Telegram — деньги не зависают.",
  },
  {
    q: "Что, если сервер выключен или игрок не в сети?",
    a: "Выдача встаёт в очередь. Команды с пометкой «только онлайн» выполнятся, когда игрок зайдёт, а выключенный сервер заберёт очередь при запуске. Каждый шаг виден в трассе заказа.",
  },
  {
    q: "Как вы работаете с чарджбэками и спорами?",
    a: "Банк открыл спор — PayMC сам откатывает выдачу и собирает пакет доказательств: трассу заказа, IP, вход в игру после покупки, наигранные часы. Карта попадает в общий чёрный список и не пройдёт оплату в других проектах.",
  },
  {
    q: "Что с покупками детей?",
    a: "Включите родительский контроль: лимит трат в сутки и подтверждение родителя для покупок дороже 1 000 ₽. Пока родитель не подтвердил по ссылке, деньги не списываются и выдача не начинается.",
  },
  {
    q: "Какие игры поддерживаются и почему нет FiveM?",
    a: "16 игр: Minecraft, Rust, GTA V RP, ARK, Unturned, Garry's Mod, CS2, DayZ и другие — плагином, модом, ресурсом или по RCON. FiveM — нет: правила Cfx.re разрешают продавать только через Tebex. Для GTA V RP работаем с RAGE:MP и alt:V.",
  },
  {
    q: "Сколько это стоит? Есть абонентская плата?",
    a: "4,9 % с оборота, абонентской платы нет. От 500 тыс ₽ в месяц ставка сама снижается до 3,9 %, от 3 млн ₽ — до 2,9 %. Отдельно — только мгновенный вывод (+0,5 %) и платежи с баланса телефона (комиссия оператора + 2 п.п.).",
  },
  {
    q: "Где хранятся данные?",
    a: "На серверах в России, по 152-ФЗ. Данные карт не попадают ни к нам, ни к вам — их обрабатывает банк-партнёр в среде с сертификатом PCI DSS.",
  },
];

export function FaqSection() {
  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="label-mono text-fg-3">Вопросы</p>
            <h2 className="mt-5 text-h2 text-fg">
              Коротко <span className="text-fg-3">о&nbsp;главном</span>
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-fg-2">
              Не нашли ответ? Напишите в Telegram — наша цель: ответ за 15&nbsp;минут в рабочее время.
            </p>
            <Button asChild variant="secondary" size="md" className="mt-6">
              <Link href="https://t.me/paymc">
                <Send /> Написать в Telegram
              </Link>
            </Button>
            <p className="mt-3 font-mono text-[11.5px] text-fg-4">пн–пт · 10:00–22:00 МСК</p>
          </div>
        </div>
        <div className="lg:col-span-8">
          <Accordion type="single" collapsible defaultValue="q-0" className="border-t border-line">
            {FAQ.map((f, i) => (
              <AccordionItem key={f.q} value={`q-${i}`}>
                <AccordionTrigger>
                  <span className="flex items-baseline gap-4">
                    <span className="w-5 shrink-0 font-mono text-[12px] text-fg-4 nums">{String(i + 1).padStart(2, "0")}</span>
                    {f.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-9">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </Section>
  );
}
