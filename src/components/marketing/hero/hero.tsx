import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliverySandbox } from "./delivery-sandbox";

/**
 * Hero: the headline on calm space, two actions, and the product itself —
 * a purchase the visitor can make and watch reach the game. No decoration:
 * the sandbox is the one bright element on the screen.
 */
export function Hero() {
  return (
    <section className="relative pt-28 pb-20 sm:pt-32 lg:pt-36 lg:pb-28">
      <div className="container-page grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_540px] lg:gap-12 xl:gap-20">
        <div className="max-w-[640px]">
          <Link
            href="/#migrate"
            className="group inline-flex h-7 items-center gap-2.5 rounded-full border border-line pr-3 pl-3 text-[13px] text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
          >
            <span className="font-mono text-xs text-fg-4 nums">04.11</span>
            Переезд с другой платформы за вечер
            <ArrowRight className="size-3.5 text-fg-3 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <h1 className="mt-6 text-display text-[clamp(2.75rem,5.5vw,4.6rem)] text-fg">
            Донат, который <span className="text-fg-3">доходит</span>
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
        </div>

        <DeliverySandbox className="w-full" />
      </div>
    </section>
  );
}
