"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog as D } from "radix-ui";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const MARKETING_NAV = [
  { href: "/#delivery", label: "Доставка" },
  { href: "/#growth", label: "Рост продаж" },
  { href: "/#money", label: "Деньги" },
  { href: "/#games", label: "Игры" },
  { href: "/#pricing", label: "Цены" },
  { href: "/docs", label: "Документация" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "border-b border-line-soft bg-canvas/75 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center gap-8">
        <Link href="/" aria-label="PayMC — на главную" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Основная навигация" className="hidden items-center gap-1 lg:flex">
          {MARKETING_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-[13.5px] text-fg-2 transition-colors hover:bg-white/[0.04] hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Войти</Link>
          </Button>
          <Button asChild variant="white" size="sm" className="hidden sm:inline-flex">
            <Link href="/signup">
              Создать магазин <ArrowRight />
            </Link>
          </Button>
          <D.Root open={open} onOpenChange={setOpen}>
            <D.Trigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Открыть меню">
                <Menu />
              </Button>
            </D.Trigger>
            <D.Portal>
              <D.Overlay className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm lg:hidden" />
              <D.Content
                aria-describedby={undefined}
                className="fixed inset-x-0 top-0 z-50 border-b border-line bg-surface p-4 shadow-pop outline-none data-[state=open]:animate-[fade-up_0.2s_var(--ease-snappy)] lg:hidden"
              >
                <D.Title className="sr-only">Меню</D.Title>
                <div className="flex items-center justify-between">
                  <Logo />
                  <D.Close asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Закрыть меню">
                      <X />
                    </Button>
                  </D.Close>
                </div>
                <nav className="mt-4 grid">
                  {MARKETING_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex h-12 items-center border-b border-line-soft text-[15px] text-fg-2"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button asChild variant="secondary" size="lg">
                    <Link href="/login">Войти</Link>
                  </Button>
                  <Button asChild variant="white" size="lg">
                    <Link href="/signup">Создать магазин</Link>
                  </Button>
                </div>
              </D.Content>
            </D.Portal>
          </D.Root>
        </div>
      </div>
    </header>
  );
}
