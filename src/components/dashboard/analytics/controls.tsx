"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { formatDateNumeric, pluralize } from "@/lib/format";

type Period = "7" | "30" | "90";

const OPTIONS: { value: Period; label: string }[] = [
  { value: "7", label: "7 дней" },
  { value: "30", label: "30 дней" },
  { value: "90", label: "90 дней" },
];

/** Period lives in the URL (?period=) so the page is rendered on the server for every option. */
export function PeriodSwitch({ period }: { period: number }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [optimistic, setOptimistic] = React.useState<Period>(String(period) as Period);
  // keep in sync with the server value after navigation (state-during-render, no effect)
  const [seen, setSeen] = React.useState(period);
  if (seen !== period) {
    setSeen(period);
    setOptimistic(String(period) as Period);
  }
  return (
    <div className="flex items-center gap-2">
      {pending ? <Loader2 aria-label="Загружаем" className="size-3.5 animate-spin text-fg-3" /> : null}
      <Segmented
        value={optimistic}
        options={OPTIONS}
        onChange={(v) => {
          setOptimistic(v);
          startTransition(() => router.push(`/dashboard/analytics?period=${v}`, { scroll: false }));
        }}
      />
    </div>
  );
}

export interface CsvRow {
  date: string;
  revenue: number;
  orders: number;
  buyers: number;
  newBuyers: number;
  peakOnline: number;
  uniquePlayers: number;
  refunds: number;
}

/** Real export: builds the CSV in the browser from the rows already on the page. */
export function ExportCsvButton({ rows, period }: { rows: CsvRow[]; period: number }) {
  const onClick = () => {
    const head = ["Дата", "Выручка, ₽", "Заказы", "Покупатели", "Новые покупатели", "Пиковый онлайн", "Уникальные игроки", "Возвраты"];
    const lines = rows.map((r) => [formatDateNumeric(r.date), r.revenue, r.orders, r.buyers, r.newBuyers, r.peakOnline, r.uniquePlayers, r.refunds].join(";"));
    const csv = "﻿" + [head.join(";"), ...lines].join("\n");
    const name = `arcticmc-analytics-${period}d.csv`;
    try {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Скачали ${name}`, { description: `${pluralize(rows.length, ["строка", "строки", "строк"])} · разделитель «;» — откроется в Excel и Google Таблицах` });
    } catch {
      toast.error("Не получилось сохранить файл", { description: "Браузер запретил скачивание — попробуйте ещё раз" });
    }
  };
  return (
    <Button variant="secondary" size="sm" onClick={onClick}>
      <Download />
      Экспорт CSV
    </Button>
  );
}
