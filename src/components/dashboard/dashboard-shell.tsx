"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dialog as D } from "radix-ui";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { NAV_FLAT } from "./nav";
import type { ShellData } from "./shell-types";

export function DashboardShell({ data, now, children }: { data: ShellData; now: number; children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // close the mobile menu when the route changes (state-during-render pattern, no effect)
  const [menuPath, setMenuPath] = React.useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  // ⌘K / Ctrl+K — palette; "g" + key — jump to section
  React.useEffect(() => {
    let gPressedAt = 0;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "g" || key === "п") {
        gPressedAt = performance.now();
        return;
      }
      if (gPressedAt && performance.now() - gPressedAt < 1200) {
        const item = NAV_FLAT.find((i) => i.key === key);
        gPressedAt = 0;
        if (item) {
          e.preventDefault();
          router.push(item.href);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-dvh w-[248px] shrink-0 border-r border-line-soft bg-canvas lg:block">
        <Sidebar data={data} onOpenPalette={() => setPaletteOpen(true)} />
      </div>

      {/* Mobile sidebar */}
      <D.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-50 bg-canvas/70 lg:hidden" />
          <D.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-line bg-canvas shadow-pop outline-none data-[state=open]:animate-[sheet-in-left_0.25s_var(--ease-snappy)] lg:hidden"
          >
            <D.Title className="sr-only">Навигация</D.Title>
            <Sidebar
              data={data}
              onOpenPalette={() => {
                setMenuOpen(false);
                setPaletteOpen(true);
              }}
              onNavigate={() => setMenuOpen(false)}
            />
          </D.Content>
        </D.Portal>
      </D.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar data={data} now={now} onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-6 pb-16 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} data={data} />
    </div>
  );
}
