"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { OverviewPeriod } from "./types";

const PeriodContext = React.createContext<{ period: OverviewPeriod; setPeriod: (p: OverviewPeriod) => void } | null>(null);

/** Client-side period switch for the overview: both KPI sets are precomputed on the server. */
export function PeriodProvider({ children, initial = "30" }: { children: React.ReactNode; initial?: OverviewPeriod }) {
  const [period, setPeriod] = React.useState<OverviewPeriod>(initial);
  const value = React.useMemo(() => ({ period, setPeriod }), [period]);
  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod() {
  const ctx = React.useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used inside <PeriodProvider>");
  return ctx;
}

const OPTIONS: { value: OverviewPeriod; label: string }[] = [
  { value: "7", label: "7 дней" },
  { value: "30", label: "30 дней" },
];

export function OverviewActions() {
  const { period, setPeriod } = usePeriod();
  return (
    <>
      <div aria-label="Период" className="contents">
        <Segmented value={period} onChange={setPeriod} options={OPTIONS} />
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          toast.success("Сводка отправлена в Telegram", {
            description: "@arcticmc_paybot · 3 получателя: выручка, заказы, сбои выдачи",
          })
        }
      >
        <Send />
        Сводка в Telegram
      </Button>
    </>
  );
}
