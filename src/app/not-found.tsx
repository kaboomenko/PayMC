import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-grid mask-radial opacity-60" />
      <header className="container-page relative flex h-16 items-center">
        <Link href="/" aria-label="PayMC — на главную">
          <Logo />
        </Link>
      </header>
      <div className="container-page relative flex flex-1 flex-col justify-center pb-24">
        <div className="max-w-xl overflow-hidden rounded-xl border border-line bg-surface/90 font-mono text-[13px] shadow-pop">
          <div className="flex h-9 items-center border-b border-line-soft px-4 text-[11px] tracking-wider text-fg-4 uppercase">
            Трасса запроса
          </div>
          <div className="space-y-1.5 px-4 py-3.5 leading-relaxed">
            <p className="text-fg-3">
              <span className="text-ok">✓</span> Запрос принят
            </p>
            <p className="text-fg-3">
              <span className="text-ok">✓</span> Маршрут найден в очереди
            </p>
            <p className="text-bad">✕ Страница не найдена — 404</p>
            <p className="text-fg-4">Повторы не помогут: такой страницы нет.</p>
          </div>
        </div>
        <h1 className="mt-10 text-h1">
          Эта выдача не дошла. <span className="text-fg-3">Но остальные — доходят.</span>
        </h1>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="white" size="lg">
            <Link href="/">
              <ArrowLeft /> На главную
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">Демо-кабинет</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
