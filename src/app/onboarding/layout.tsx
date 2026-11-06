import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Настройка магазина",
  robots: { index: false },
};

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-canvas">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-grid mask-fade-b opacity-60" />
      <header className="relative border-b border-line-soft">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="PayMC — на главную" className="rounded-md outline-offset-4">
            <Logo />
          </Link>
          <div className="flex items-center gap-4 text-[13px]">
            <span className="hidden items-center gap-1.5 text-fg-4 sm:flex">
              около 10 минут, можно вернуться позже
            </span>
            <Link href="/dashboard" className="text-fg-3 transition-colors hover:text-fg">
              Пропустить
            </Link>
          </div>
        </div>
      </header>
      <div className="relative">{children}</div>
    </div>
  );
}
