import { TriangleAlert } from "lucide-react";
import { GAME_LIST } from "@/lib/games";
import { Section, SectionHeading } from "@/components/marketing/section";
import { GamesTable } from "@/components/marketing/landing-b/games-table";

export function GamesSection() {
  const ready = GAME_LIST.filter((g) => g.status === "ready").length;
  const beta = GAME_LIST.length - ready;
  return (
    <Section id="games">
      <SectionHeading
        eyebrow="Игры"
        title={`${GAME_LIST.length} игр.`}
        muted="Плагин, мод, ресурс или RCON"
        lead="Выдача — командами вашей же консоли: LuckPerms, Oxide, ArkShop, VIP Core. Если на сервере можно поставить агента — ставим агента, если нет — работаем по RCON."
        aside={
          <dl className="flex gap-6 border-l border-line pl-4 lg:mb-1">
            <div>
              <dt className="text-[12px] text-fg-3">Готово</dt>
              <dd className="font-mono text-[22px] font-medium text-fg nums">{ready}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-fg-3">В бете</dt>
              <dd className="font-mono text-[22px] font-medium text-fg nums">{beta}</dd>
            </div>
          </dl>
        }
      />
      <GamesTable />
      <p className="mt-4 flex max-w-3xl items-start gap-2.5 text-[13px] leading-relaxed text-fg-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
        <span>
          FiveM в списке нет намеренно: правила Cfx.re разрешают серверам продавать только через Tebex, сторонний магазин грозит блокировкой. Для GTA V RP
          работаем с RAGE:MP и alt:V — поможем перенести сборку.
        </span>
      </p>
    </Section>
  );
}
