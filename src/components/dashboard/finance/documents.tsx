"use client";

import * as React from "react";
import { Download, FileClock, FileSignature, FileSpreadsheet, FileText, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";

const PERIODS = [
  { value: "2026-11", label: "Ноябрь 2026", ready: false },
  { value: "2026-10", label: "Октябрь 2026", ready: true },
  { value: "2026-09", label: "Сентябрь 2026", ready: true },
  { value: "2026-q3", label: "III квартал 2026", ready: true },
  { value: "2026", label: "2026 год, с начала", ready: true },
] as const;

type Period = (typeof PERIODS)[number]["value"];

interface Doc {
  id: string;
  title: string;
  meta: string;
  icon: React.ComponentType<{ className?: string }>;
  formats: string[];
  signed?: boolean;
  periodic: boolean;
}

const DOCS: Doc[] = [
  { id: "agent", title: "Отчёт агента", meta: "Все платежи, комиссия, возвраты и выплаты за период", icon: FileSignature, formats: ["PDF"], signed: true, periodic: true },
  { id: "act", title: "Акт сверки взаиморасчётов", meta: "Начислено, удержано, выплачено — для бухгалтера и банка", icon: FileText, formats: ["PDF"], signed: true, periodic: true },
  { id: "export", title: "Выгрузка для бухгалтера", meta: "Платежи построчно: дата, сумма, способ, комиссия, номер чека", icon: FileSpreadsheet, formats: ["CSV", "XLSX"], periodic: true },
  { id: "receipts", title: "Реестр чеков «Мой налог»", meta: "Все чеки самозанятого с номерами и ссылками на проверку", icon: FileClock, formats: ["CSV"], periodic: true },
  { id: "offer", title: "Оферта PayMC", meta: "Редакция от 1 октября 2026 · агентская схема, ставка 4,9 % с автоматическим снижением", icon: FileText, formats: ["PDF"], periodic: false },
];

const SIZE: Record<string, string> = { PDF: "212 КБ", CSV: "1,4 МБ", XLSX: "880 КБ" };

export function DocumentsPanel() {
  const [period, setPeriod] = React.useState<Period>("2026-10");
  const [autoSend, setAutoSend] = React.useState(true);
  const current = PERIODS.find((p) => p.value === period)!;
  const docs = current.ready ? DOCS : DOCS.filter((d) => !d.periodic);

  function download(doc: Doc, format: string) {
    const name = `${doc.id}_${period}.${format.toLowerCase()}`;
    toast.promise(new Promise((resolve) => setTimeout(resolve, 900)), {
      loading: `Готовим ${doc.title.toLowerCase()} · ${format}`,
      success: `${name} — скачан`,
      error: "Не удалось сформировать файл",
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-surface shadow-raise">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-fg">Документы</h2>
            <p className="mt-0.5 text-[12.5px] text-fg-3">Отчёт агента и акт подписаны усиленной электронной подписью PayMC.</p>
          </div>
          <div className="w-full sm:w-[220px]">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger size="sm" aria-label="Период">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        <ul>
          {docs.map((d) => (
            <li key={d.id} className="flex flex-col gap-3 border-b border-line-soft px-5 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <d.icon className="mt-0.5 size-4 shrink-0 text-fg-3" />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-fg">
                    {d.title}
                    {d.periodic ? <span className="font-normal text-fg-3">· {current.label.toLowerCase()}</span> : null}
                    {d.signed ? <Badge tone="ok">подписан ЭП</Badge> : null}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-fg-3">{d.meta}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
                {d.formats.map((f) => (
                  <Button key={f} variant="secondary" size="xs" onClick={() => download(d, f)} aria-label={`Скачать ${d.title} в ${f}`}>
                    <Download />
                    {f}
                    <span className="font-mono text-[10.5px] text-fg-4">{SIZE[f]}</span>
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {!current.ready ? (
          <EmptyState
            className="border-t border-line-soft py-10"
            icon={<FileClock />}
            title="Отчёт за ноябрь появится 1 декабря"
            description="Документы формируются после закрытия месяца. Выгрузку платежей за текущий месяц можно взять в разделе «Заказы»."
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-5 py-4 shadow-raise sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-fg-3" />
          <div>
            <p className="text-[13px] font-medium text-fg">Отправлять бухгалтеру каждое 1-е число</p>
            <p className="mt-0.5 text-[12.5px] text-fg-3">
              Отчёт агента, акт сверки и выгрузка XLSX уйдут на <span className="font-mono text-fg-2">buh@arcticmc.ru</span> — Марина Ефимова, роль «Бухгалтер».
            </p>
          </div>
        </div>
        <Switch
          checked={autoSend}
          onCheckedChange={(v) => {
            setAutoSend(v);
            toast(v ? "Автоотправка включена" : "Автоотправка выключена", { description: v ? "Следующая — 1 декабря в 09:00" : "Документы останутся в кабинете" });
          }}
          aria-label="Отправлять документы бухгалтеру автоматически"
        />
      </section>
    </div>
  );
}
