import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { MigrateDemo } from "@/components/marketing/landing-a/migrate-demo";

const STEPS = [
  {
    title: "Подключите источник",
    text: "API-ключ или файл выгрузки. Доступ только на чтение — старый магазин продолжает принимать платежи.",
    time: "5 мин",
  },
  {
    title: "Проверьте соответствие команд",
    text: "Покажем команды, которые не узнали автоматически, и переменные, которых нет в вашей игре.",
    time: "10 мин",
  },
  {
    title: "Подключите сервер",
    text: "Плагин, мод или RCON. Тестовая выдача на ваш ник — прежде чем пойдут реальные заказы.",
    time: "10 мин",
  },
  {
    title: "Переключите ссылку на магазин",
    text: "Меню сервера, Telegram, VK. Купленные привилегии продолжают действовать с прежним сроком.",
    time: "1 мин",
  },
];

export function MigrateSection() {
  return (
    <Section id="migrate">
      <SectionHeading
        eyebrow="Переезд"
        title="Переезд за вечер."
        muted={"Товары, команды, промокоды и игроки\u00A0— с собой"}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
        <MigrateDemo />

        <div className="flex flex-col">
          <p className="label-mono text-fg-4">Как проходит переезд</p>
          <ol className="mt-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-x-4 pb-7 last:pb-0">
                {i < STEPS.length - 1 ? <span aria-hidden className="absolute top-8 bottom-1 left-[13.5px] w-px bg-line" /> : null}
                <span className="flex size-7 items-center justify-center rounded-full border border-line-strong bg-surface-2 font-mono text-[11px] text-fg-2 nums">
                  {i + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[15px] font-medium text-fg">{s.title}</p>
                    <span className="shrink-0 font-mono text-[11px] text-fg-4">≈ {s.time}</span>
                  </div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-fg-3">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line-soft pt-7">
            <Button asChild variant="white" size="lg">
              <Link href="/signup">
                Начать переезд <ArrowRight />
              </Link>
            </Button>
            <p className="text-[13px] text-fg-3">Около получаса работы. Перенос бесплатный.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
