"use client";

import * as React from "react";
import { ArrowUpRight, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlFlag, useUrlTab } from "@/components/dashboard/system/url-state";
import { TabsScroller } from "@/components/dashboard/system/tabs-scroller";
import { FinanceOverview } from "./overview";
import { PayoutsTable } from "./payouts-table";
import { SplitEditor } from "./split-editor";
import { TaxesPanel } from "./taxes";
import { DocumentsPanel } from "./documents";
import { WithdrawDialog } from "./withdraw-dialog";
import { FINANCE_TABS, type FinanceData, type FinanceTab } from "./types";

const TAB_LABEL: Record<FinanceTab, string> = {
  overview: "Обзор",
  payouts: "Выплаты",
  split: "Распределение",
  taxes: "Чеки и налоги",
  documents: "Документы",
};

export function FinanceView({
  data,
  initialTab,
  initialPayoutOpen,
}: {
  data: FinanceData;
  initialTab: FinanceTab;
  initialPayoutOpen: boolean;
}) {
  const [tab, setTab] = useUrlTab("tab", initialTab, FINANCE_TABS);
  const [payoutOpen, setPayoutOpen] = useUrlFlag("payout", initialPayoutOpen);
  const [available, setAvailable] = React.useState(data.balance.available);
  const [members, setMembers] = React.useState(data.members);
  const nearLimit = data.tax.projected / data.tax.limit >= 0.95;

  const openTab = React.useCallback(
    (t: string) => {
      setTab(t);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setTab],
  );

  return (
    <>
      <PageHeader
        title="Финансы"
        description="Баланс, ежедневные выплаты в 12:00 МСК, распределение между командой и чеки самозанятого"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => openTab("documents")}>
              <FileSpreadsheet />
              Для бухгалтера
            </Button>
            <Button variant="primary" size="sm" onClick={() => setPayoutOpen(true)}>
              <ArrowUpRight />
              Вывести сейчас
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsScroller active={tab}>
          <TabsList className="w-max min-w-full">
            {FINANCE_TABS.map((t) => (
              <TabsTrigger key={t} value={t}>
                {TAB_LABEL[t]}
                {t === "taxes" && nearLimit ? <span aria-label="лимит НПД близко" className="size-1.5 rounded-full bg-warn" /> : null}
                {t === "payouts" ? <span className="font-mono text-[11px] text-fg-4 nums">{data.payouts.length}</span> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </TabsScroller>

        <TabsContent value="overview" className="pt-5">
          <FinanceOverview data={data} available={available} members={members} onWithdraw={() => setPayoutOpen(true)} onOpenTab={openTab} />
        </TabsContent>
        <TabsContent value="payouts" className="pt-5">
          <PayoutsTable payouts={data.payouts} members={members} />
        </TabsContent>
        <TabsContent value="split" className="pt-5">
          <SplitEditor members={members} lastPayout={data.payouts[0]} onSave={setMembers} />
        </TabsContent>
        <TabsContent value="taxes" className="pt-5">
          <TaxesPanel tax={data.tax} receipts={data.receipts} now={data.now} />
        </TabsContent>
        <TabsContent value="documents" className="pt-5">
          <DocumentsPanel />
        </TabsContent>
      </Tabs>

      <WithdrawDialog
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        available={available}
        members={members}
        onConfirm={(amount) => setAvailable((a) => Math.max(0, a - amount))}
      />
    </>
  );
}
