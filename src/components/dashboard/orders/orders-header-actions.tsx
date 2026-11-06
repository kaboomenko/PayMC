"use client";

import * as React from "react";
import { Download, RotateCw } from "lucide-react";
import { formatNumber, plural } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function OrdersHeaderActions({
  issues,
  issuesNote,
  exportCount,
  exportLabel,
}: {
  issues: number;
  issuesNote: string;
  exportCount: number;
  exportLabel: string;
}) {
  const [retried, setRetried] = React.useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          toast.success(`Выгрузка готова: ${formatNumber(exportCount)} ${plural(exportCount, ["заказ", "заказа", "заказов"])}`, {
            description: `${exportLabel} · orders.csv, UTF-8 с BOM — Excel откроет без кракозябр`,
          })
        }
      >
        <Download /> Экспорт CSV
      </Button>
      <Button
        size="sm"
        variant={issues && !retried ? "primary" : "secondary"}
        disabled={!issues || retried}
        onClick={() => {
          setRetried(true);
          toast.success(`Повторная выдача: ${formatNumber(issues)} ${plural(issues, ["заказ", "заказа", "заказов"])}`, {
            description: issuesNote,
            action: { label: "Отменить", onClick: () => setRetried(false) },
          });
        }}
      >
        <RotateCw /> {retried ? "Повтор запущен" : `Повторить неудачные (${formatNumber(issues)})`}
      </Button>
    </>
  );
}
