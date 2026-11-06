import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Section } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { PixelField } from "@/components/marketing/hero/pixel-field";

const FACTS = ["4,9 % без абонентской платы", "выплата каждый день в 12:00 МСК", "16 игр"];

export function FinalCta() {
  return (
    <Section className="pt-8 pb-24 sm:pt-10 sm:pb-28 lg:pt-12 lg:pb-32" divider={false}>
      <div className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface">
        <div aria-hidden className="absolute inset-0 -z-10">
          <PixelField
            burstOrigin={{ x: 0.78, y: 0.5 }}
            className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_60%_90%_at_85%_50%,#000_10%,transparent_70%)]"
          />
          <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-surface via-surface/80 to-transparent" />
        </div>
        <div className="max-w-2xl px-6 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
          <h2 className="text-h1 text-fg">
            Запустите магазин сегодня. <span className="text-fg-3">Первые продажи — уже вечером.</span>
          </h2>
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
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px] text-fg-3">
            {FACTS.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="size-1 bg-azure-400" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
