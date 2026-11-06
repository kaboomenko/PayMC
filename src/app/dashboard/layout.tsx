import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { buildShellData } from "@/components/dashboard/shell-data";
import { NOW_MS } from "@/lib/mock";

export const metadata: Metadata = {
  title: { default: "Кабинет", template: "%s · Кабинет PayMC" },
  robots: { index: false },
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <DashboardShell data={buildShellData()} now={NOW_MS}>
      {children}
    </DashboardShell>
  );
}
