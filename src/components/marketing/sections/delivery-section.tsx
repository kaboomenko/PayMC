import { Section, SectionHeading } from "@/components/marketing/section";
import { DeliveryPanel } from "@/components/marketing/landing-a/delivery-panel";
import { buildDeliveryDemo } from "@/components/marketing/landing-a/delivery-data";
import { CommandBuilder } from "@/components/marketing/landing-a/command-builder";
import { COMMAND_LIBRARY } from "@/lib/command-library";
import { plural, typo } from "@/lib/format";

const SPECS = [
  {
    label: "Постоянное соединение",
    value: "WebSocket",
    text: "Агент на сервере держит соединение открытым — выдача без опроса раз в минуту.",
  },
  {
    label: "Офлайн-очередь",
    value: "при входе",
    text: "Игрок не в сети — выдадим, когда зайдёт. Даже если сервер за это время перезапустился.",
  },
  {
    label: "Автоповтор",
    value: "5 попыток",
    text: "Интервал растёт от 30\u00a0секунд до 5\u00a0минут. Не вышло — алерт в Telegram.",
  },
  {
    label: "Журнал как доказательство",
    value: "PDF для банка",
    text: "Трасса, IP, время входа на сервер — в пакете для спора с банком.",
  },
];

export function DeliverySection() {
  const demo = buildDeliveryDemo();
  return (
    <Section id="delivery">
      <SectionHeading
        index="01"
        eyebrow="Доставка"
        title="Выдача, которую можно проверить."
        muted={"Каждый шаг\u00A0— с временем и выводом консоли."}
        lead="Так выглядит раздел «Заказы» в кабинете. Выберите заказ — увидите, что происходило между оплатой и сообщением в чате. Офлайн-игрока и перегруженный сервер можно «починить» прямо здесь."
      />

      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -bottom-10 bg-grid lg:-inset-x-8 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_45%,#000_10%,transparent_75%)]"
        />
        <DeliveryPanel demo={demo} className="relative" />
      </div>

      <dl className="mt-10 grid gap-x-8 gap-y-7 border-t border-line-soft pt-8 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-x-0">
        {SPECS.map((s, i) => (
          <div key={s.label} className={i > 0 ? "lg:border-l lg:border-line-soft lg:pl-7" : "lg:pr-7"}>
            <dt className="label-mono text-fg-3">{s.label}</dt>
            <dd className="mt-3">
              <span className="font-mono text-[15px] text-fg">{s.value}</span>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-3">{typo(s.text)}</p>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-24 grid gap-10 lg:mt-28 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.6fr)] lg:gap-14">
        <div className="lg:pt-2">
          <p className="label-mono text-azure-300">Библиотека команд</p>
          <h3 className="mt-4 text-h3 text-fg">
            {COMMAND_LIBRARY.length} {plural(COMMAND_LIBRARY.length, ["готовая команда", "готовые команды", "готовых команд"])} для
            популярных плагинов.
          </h3>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-fg-2">
            Не нужно помнить синтаксис: выберите, что выдать — команда соберётся сама.
          </p>
          <ul className="mt-6 space-y-2.5 text-[13.5px] text-fg-3">
            <li className="flex gap-2.5">
              <span className="font-mono text-fg-4">01</span>
              <span>Переменные подставим сами: ник, UUID, SteamID64, EOS ID или Static ID.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="font-mono text-fg-4">02</span>
              <span>
                Опасные команды вроде{" "}
                <code className="rounded-xs bg-white/[0.06] px-1 font-mono text-[12px] text-fg-2">op</code> подсветим ещё в
                редакторе товара.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="font-mono text-fg-4">03</span>
              <span>Своя команда тоже подойдёт — проверим переменные до сохранения.</span>
            </li>
          </ul>
        </div>
        <CommandBuilder />
      </div>
    </Section>
  );
}
