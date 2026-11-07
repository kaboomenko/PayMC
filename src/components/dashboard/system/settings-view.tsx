"use client";

import * as React from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlTab } from "./url-state";
import { TabsScroller } from "./tabs-scroller";
import { ProjectSettings } from "./project-settings";
import { TeamSettings } from "./team-settings";
import { AntifraudSettings } from "./antifraud-settings";
import { NotificationsMatrix } from "./notifications-matrix";
import { SecuritySettings } from "./security-settings";
import { ImportFlow } from "./import-flow";
import { SETTINGS_TABS, type SettingsData, type SettingsTab } from "./settings-types";

const LABEL: Record<SettingsTab, string> = {
  project: "Проект",
  team: "Команда",
  antifraud: "Антифрод",
  notifications: "Уведомления",
  security: "Безопасность",
  import: "Импорт",
};

export function SettingsView({ data, initialTab }: { data: SettingsData; initialTab: SettingsTab }) {
  const [tab, setTab] = useUrlTab("tab", initialTab, SETTINGS_TABS);
  const no2fa = data.team.filter((m) => !m.twoFactor).length;

  return (
    <>
      <PageHeader title="Настройки" description="Проект, команда и доступы, защита от мошенничества, уведомления и переезд с другой платформы" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsScroller active={tab}>
          <TabsList className="w-max min-w-full">
            {SETTINGS_TABS.map((t) => (
              <TabsTrigger key={t} value={t}>
                {LABEL[t]}
                {t === "team" ? <span className="font-mono text-[11px] text-fg-4 nums">{data.team.length}</span> : null}
                {t === "security" && no2fa ? <span aria-label={`${no2fa} без 2FA`} className="size-1.5 rounded-full bg-warn" /> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </TabsScroller>
        <TabsContent value="project" className="pt-5">
          <ProjectSettings project={data.project} />
        </TabsContent>
        <TabsContent value="team" className="pt-5">
          <TeamSettings team={data.team} audit={data.audit} now={data.now} />
        </TabsContent>
        <TabsContent value="antifraud" className="pt-5">
          <AntifraudSettings blocked={data.blocked} now={data.now} />
        </TabsContent>
        <TabsContent value="notifications" className="pt-5">
          <NotificationsMatrix />
        </TabsContent>
        <TabsContent value="security" className="pt-5">
          <SecuritySettings team={data.team} now={data.now} />
        </TabsContent>
        <TabsContent value="import" className="pt-5">
          <ImportFlow data={data.importData} />
        </TabsContent>
      </Tabs>
    </>
  );
}
