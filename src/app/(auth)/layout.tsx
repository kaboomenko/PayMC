import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AuthVisual } from "@/components/auth/auth-visual";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <div className="flex min-w-0 flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="rounded-md outline-offset-4" aria-label="PayMC — на главную">
            <Logo />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-fg-3 transition-colors hover:text-fg">
            <ArrowLeft className="size-3.5" /> На главную
          </Link>
        </header>
        <main className="flex flex-1 items-center py-10 sm:py-14">
          <div className="w-full max-w-[408px]">{children}</div>
        </main>
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-4">
          <span>© 2026 PayMC</span>
          <Link href="/#faq" className="transition-colors hover:text-fg-2">
            Оферта
          </Link>
          <Link href="/#faq" className="transition-colors hover:text-fg-2">
            Политика конфиденциальности
          </Link>
          <span>Поддержка в Telegram: @paymc_support</span>
        </footer>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-line-soft bg-surface lg:block">
        <AuthVisual />
      </aside>
    </div>
  );
}
