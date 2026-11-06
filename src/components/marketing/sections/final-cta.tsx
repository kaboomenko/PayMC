import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Section } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";

const FACTS = ["4,9 % без абонентской платы", "выплата каждый день в 12:00 МСК", "16 игр"];

export function FinalCta() {
  return (
    <Section className="pt-8 pb-24 sm:pt-10 sm:pb-28 lg:pt-12 lg:pb-32" divider={false}>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="max-w-2xl px-6 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
          <h2 className="text-h1 text-fg">
            Запустите магазин сегодня. <span className="text-fg-3">Первые продажи&nbsp;— уже вечером</span>
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
                <span className="size-1 bg-fg-4" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
