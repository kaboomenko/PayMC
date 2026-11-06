import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { Section, SectionHeading } from "@/components/marketing/section";
import { DiffBlock, type DiffPair } from "@/components/marketing/landing-a/diff-block";

const PAIRS: DiffPair[] = [
  {
    scope: "выдача",
    before: "Плагин опрашивает сайт **раз в минуту** — игрок ждёт и пишет «где донат?»",
    after: "Агент на постоянном соединении: выдача **меньше чем за секунду**, с трассой каждого шага",
  },
  {
    scope: "рестарт",
    before: "Сервер перезагружался — **покупка потерялась**, игрок пишет в поддержку",
    after: "Задание ждёт в очереди и **выполнится при входе** игрока",
  },
  {
    scope: "выплаты",
    before: "Выплата **раз в неделю**, после ручной проверки",
    after: "**Каждый день в 12:00** на карту или по СБП, резервный банк — если основной не принял",
  },
  {
    scope: "налоги",
    before: "Чеки самозанятого **вбиваете руками**",
    after: "Чек на каждый платёж — в «Мой налог» **автоматически**",
  },
  {
    scope: "команда",
    before: "Делите деньги с разработчиком **переводом в конце месяца**",
    after: "Сплит: каждому **своя доля прямо в выплате**",
  },
  {
    scope: "вайпы",
    before: "Акции к вайпу **запускаете ночью вручную**",
    after: "Скидка **стартует сама** по расписанию вайпов",
  },
  {
    scope: "комиссия",
    before: "Комиссия **7–12 %** плюс оплата выплат",
    after: "**4,9 %** — всё включено, без абонентки",
  },
];

export function DiffSection() {
  return (
    <Section divider={false}>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:gap-14 xl:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            className="mb-0 lg:mb-0"
            eyebrow="Где теряются деньги"
            title={"Донат на сервере обычно устроен так\u00A0—"}
            muted="и вот что меняется"
          />
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-fg-2">
            Каждая мелочь отъедает пару процентов выручки или вечер в неделю: потерянная выдача, ручные чеки, перевод
            разработчику, ночной запуск акции. Мы собрали это в одну систему, где каждое действие видно в журнале.
          </p>
          <Link
            href="/#delivery"
            className="group mt-7 inline-flex items-center gap-1.5 rounded-sm text-[13.5px] text-azure-300 transition-colors hover:text-azure-200"
          >
            Посмотреть, как проходит заказ
            <ArrowDown className="size-3.5 transition-transform duration-200 group-hover:translate-y-0.5" />
          </Link>
        </div>

        <DiffBlock pairs={PAIRS} />
      </div>
    </Section>
  );
}
