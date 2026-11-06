import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliverySandbox } from "./delivery-sandbox";
import { PixelField } from "./pixel-field";

const FACTS = [
  { value: "< 1 с", label: "от оплаты до выдачи в игре" },
  { value: "12:00", label: "ежедневная выплата на карту или по СБП" },
  { value: "16 игр", label: "плагин, мод, ресурс или RCON" },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-28 pb-20 sm:pt-32 lg:pt-36 lg:pb-28">
      {/* background: payment pulse field + one restrained glow behind the product */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <PixelField className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_70%_60%_at_70%_45%,#000_20%,transparent_75%)]" />
        <div className="absolute top-[18%] right-[-10%] h-[520px] w-[760px] rounded-full bg-[radial-gradient(closest-side,rgb(51_119_255/0.16),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-canvas" />
      </div>

      <div className="container-page grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_540px] lg:gap-12 xl:gap-20">
        <div className="max-w-[640px]">
          <Link
            href="/#migrate"
            className="group inline-flex h-7 items-center gap-2 rounded-full border border-line bg-surface/70 pr-3 pl-1 text-[12.5px] text-fg-2 backdrop-blur transition-colors hover:border-line-strong"
          >
            <span className="rounded-full bg-azure-500/15 px-2 py-0.5 font-mono text-[10.5px] text-azure-200">04.11</span>
            Переезд с другой платформы за вечер
            <ArrowRight className="size-3.5 text-fg-3 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <h1 className="mt-6 text-display text-[clamp(2.75rem,5.5vw,4.6rem)] text-fg">
            Донат, который <span className="text-fg-3">доходит.</span>
          </h1>

          <p className="mt-6 max-w-[560px] text-[17px] leading-relaxed text-fg-2 sm:text-lg">
            Магазин для серверов Minecraft, Rust, GTA&nbsp;RP, ARK и&nbsp;ещё 12&nbsp;игр. Покупка приходит в&nbsp;игру
            за&nbsp;доли секунды — с&nbsp;трассировкой каждого шага. Деньги приходят вам каждый день, чеки самозанятого
            отправляются сами.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild variant="white" size="lg">
              <Link href="/signup">
                Создать магазин <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">
                Демо-кабинет <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <p className="mt-3 text-[13px] text-fg-3">Без абонентской платы и без привязки карты. Первый платёж — в тот же вечер.</p>

          <dl className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
            {FACTS.map((f) => (
              <div key={f.value} className="bg-canvas/90 p-4 backdrop-blur-sm">
                <dt className="font-mono text-[22px] font-medium tracking-[-0.02em] text-fg nums">{f.value}</dt>
                <dd className="mt-1.5 text-[12.5px] leading-snug text-fg-3">{f.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <DeliverySandbox className="w-full" />
      </div>
    </section>
  );
}
