import { cn } from "@/lib/utils";
import { Section } from "@/components/marketing/section";

const RELEASES = [
  { date: "04.11", title: "Импорт из других платформ", text: "Товары, команды и история покупок — из CSV или по API, за вечер" },
  { date: "28.10", title: "Складчина на бустеры и ивенты", text: "Игроки скидываются вместе, а если не соберут — взносы вернутся сами" },
  { date: "21.10", title: "Облачные чеки 54-ФЗ для ИП и ООО", text: "Чек уходит игроку на почту сразу после оплаты" },
  { date: "14.10", title: "Календарь вайпов и сезонов", text: "Скидки и кампании включаются по расписанию" },
  { date: "07.10", title: "Telegram-бот: сводка дня и алерты", text: "Выручка, сбои выдачи и выплаты — в личку или чат команды" },
];

export function ChangelogStrip() {
  return (
    <Section id="changelog" className="py-16 sm:py-20 lg:py-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="label-mono flex items-center gap-2 text-fg-3">
          Что нового
          <span className="h-px w-6 bg-line-strong" aria-hidden />
          <span className="text-fg-4">релиз каждую неделю</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center gap-2 rounded-full border border-line bg-surface px-3 text-[12.5px] text-fg-2">
            <span className="font-mono text-[11.5px] text-fg-3 nums">цель доступности 99,98&nbsp;%</span>
          </span>
        </div>
      </div>

      <ol className="relative mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
        <span aria-hidden className="absolute top-[5px] right-0 left-0 hidden h-px bg-line lg:block" />
        {RELEASES.map((r, i) => (
          <li key={r.date} className="relative grid grid-cols-[11px_1fr] gap-x-3 lg:block lg:pr-6">
            <span
              className={cn(
                "relative z-10 mt-1 block size-[11px] rounded-full border-2 lg:mt-0",
                i === 0 ? "border-azure-400 bg-azure-500" : "border-line-strong bg-canvas",
              )}
            />
            <div className="lg:mt-4">
              <p className="flex items-center gap-2 font-mono text-[12px] text-fg-3 nums">
                {r.date}
                {i === 0 ? <span className="text-fg-4">· последний релиз</span> : null}
              </p>
              <p className="mt-1 text-[14px] leading-snug font-medium text-fg">{r.title}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-fg-3">{r.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
