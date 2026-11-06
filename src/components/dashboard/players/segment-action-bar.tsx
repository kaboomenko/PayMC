"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Megaphone, Send, ShieldAlert, TicketPercent } from "lucide-react";
import { formatMoneyCompact, formatNumber, formatPercent, plural, pluralize } from "@/lib/format";
import { segmentMeta } from "@/lib/mock/meta";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { SegmentFilter } from "./params";

export interface SegmentStats {
  count: number;
  ltv: number;
  ltvShare: number;
  avgAwayDays: number;
  telegram: number;
}

/** Context + one next step for the selected segment. */
export function SegmentActionBar({ segment, stats }: { segment: Exclude<SegmentFilter, "all">; stats: SegmentStats }) {
  const players = pluralize(stats.count, ["игрок", "игрока", "игроков"]);
  const facts: Record<typeof segment, string> = {
    whale: `${players} · ${formatMoneyCompact(stats.ltv)} LTV — ${formatPercent(stats.ltvShare)} всей выручки базы`,
    loyal: `${players} играют регулярно. Хороший момент для бонуса за активность.`,
    new: `${players} зашли впервые за 14 дней. Первая покупка обычно случается в первые 3 дня.`,
    at_risk: `${players} · в среднем не заходят ${formatNumber(Math.round(stats.avgAwayDays))} ${plural(Math.round(stats.avgAwayDays), ["день", "дня", "дней"])} · ${formatMoneyCompact(stats.ltv)} LTV под угрозой`,
    dormant: `${players} не заходят больше 45 дней. Вернуть получится не всех — зато дёшево.`,
    flagged: `${players} с флагами антифрода. Платежи с риском выше 80 мы отклоняем автоматически.`,
  };

  const link = (href: string, icon: React.ReactNode, label: string) => (
    <Button asChild size="sm" variant="primary">
      <Link href={href}>
        {icon}
        {label}
        <ArrowRight />
      </Link>
    </Button>
  );

  const action = {
    whale: (
      <Button
        size="sm"
        variant="primary"
        onClick={() =>
          toast.success(`Спасибо отправлено ${pluralize(stats.telegram, ["киту", "китам", "китам"])}`, {
            description: `В Telegram у ${formatNumber(stats.telegram)} из ${formatNumber(stats.count)}. Остальным — сообщением в чат при входе.`,
          })
        }
      >
        <Send /> Поблагодарить в Telegram
      </Button>
    ),
    loyal: link("/dashboard/promo?new=1&segment=loyal", <TicketPercent />, "Выдать промокод"),
    new: link("/dashboard/campaigns?new=1&segment=new", <Megaphone />, "Предложить первую покупку"),
    at_risk: link("/dashboard/campaigns?new=1&segment=at_risk", <Megaphone />, "Вернуть этих игроков кампанией"),
    dormant: link("/dashboard/campaigns?new=1&segment=dormant", <Megaphone />, "Позвать обратно"),
    flagged: link("/dashboard/settings?tab=antifraud", <ShieldAlert />, "Настроить антифрод"),
  }[segment];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-raise sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-fg">
          {segment === "flagged" ? "С флагами риска" : segmentMeta[segment].label}
          <span className="ml-2 text-[12.5px] font-normal text-fg-3">
            {segment === "flagged" ? "чарджбэки, VPN, много карт, чёрный список сети" : segmentMeta[segment].description}
          </span>
        </p>
        <p className="mt-0.5 text-[12.5px] text-fg-3">{facts[segment]}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
