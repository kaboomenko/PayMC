import type { Metadata } from "next";
import { Plus, Search, Send, Server } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { StatusDot } from "@/components/ui/status-dot";
import { Progress } from "@/components/ui/progress";
import { Sparkline } from "@/components/ui/sparkline";
import { Delta } from "@/components/ui/delta";
import { PixelAvatar, Avatar } from "@/components/ui/avatar";
import { CodeBlock } from "@/components/ui/code-block";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DesignInteractive } from "./interactive";

export const metadata: Metadata = { title: "Дизайн-система", robots: { index: false } };

const swatches = [
  ["canvas", "bg-canvas"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["surface-3", "bg-surface-3"],
  ["surface-4", "bg-surface-4"],
  ["azure-300", "bg-azure-300"],
  ["azure-400", "bg-azure-400"],
  ["azure-500", "bg-azure-500"],
  ["azure-700", "bg-azure-700"],
  ["ice-300", "bg-ice-300"],
  ["ice-400", "bg-ice-400"],
  ["ice-500", "bg-ice-500"],
  ["white", "bg-white"],
  ["ok", "bg-ok"],
  ["warn", "bg-warn"],
  ["bad", "bg-bad"],
] as const;

export default function DesignPage() {
  return (
    <main className="container-page py-14">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="label-mono text-fg-3">Design system · v0.1</span>
      </div>

      <section className="mt-12">
        <p className="label-mono text-fg-3">Типографика</p>
        <h1 className="mt-4 text-display">Донат, который <span className="text-fg-3">доходит</span></h1>
        <h2 className="mt-6 text-h1">Заголовок H1 — 60/1.02</h2>
        <h2 className="mt-4 text-h2">Заголовок H2 — выплаты каждый день</h2>
        <h3 className="mt-4 text-h3">Заголовок H3 — трассировка доставки</h3>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-fg-2">
          Основной текст 18/28. PayMC принимает платежи, за секунду выдаёт покупку на сервере и каждый день выплачивает
          деньги. <span className="text-fg">Акцентный фрагмент</span> и <span className="text-fg-3">приглушённый</span>.
        </p>
        <p className="mt-3 font-mono text-sm text-ice-300">lp user {"{player}"} parent addtemp vip 30d</p>
      </section>

      <section className="mt-14">
        <p className="label-mono text-fg-3">Цвета</p>
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
          {swatches.map(([name, cls]) => (
            <div key={name}>
              <div className={`h-14 rounded-md border border-line ${cls}`} />
              <p className="mt-1.5 font-mono text-[11px] text-fg-3">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Кнопки</CardTitle>
              <CardDescription>primary · white · secondary · outline · ghost · danger</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button variant="primary">
              <Plus /> Новый товар
            </Button>
            <Button variant="white" size="lg">
              Создать магазин
            </Button>
            <Button>Отмена</Button>
            <Button variant="outline">Документация</Button>
            <Button variant="ghost">Ещё</Button>
            <Button variant="danger" size="sm">
              Вернуть деньги
            </Button>
            <Button variant="secondary" size="icon" aria-label="Поиск">
              <Search />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Бейджи и статусы</CardTitle>
              <CardDescription>Тональность передаёт смысл, а не декор</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2.5">
            <Badge tone="ok" dot>Доставлено</Badge>
            <Badge tone="azure" dot>В очереди</Badge>
            <Badge tone="ice">Ждёт входа игрока</Badge>
            <Badge tone="warn" dot>Повтор 2/5</Badge>
            <Badge tone="bad" dot>Чарджбэк</Badge>
            <Badge>Черновик</Badge>
            <Badge tone="outline">MC 1.21</Badge>
            <Badge tone="white">NEW</Badge>
            <span className="inline-flex items-center gap-2 text-[13px] text-fg-2">
              <StatusDot tone="ok" /> online
            </span>
            <span className="inline-flex items-center gap-2 text-[13px] text-fg-2">
              <StatusDot tone="warn" /> деградация
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Поля</CardTitle>
              <CardDescription>Тёмные инпуты с внутренней тенью</CardDescription>
            </div>
            <Kbd>⌘K</Kbd>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Название товара" hint="Видно игрокам на витрине">
              <Input placeholder="VIP на 30 дней" />
            </Field>
            <Field label="Поиск" aside={<span className="text-xs text-fg-4">по нику, UUID, SteamID</span>}>
              <Input leading={<Search />} placeholder="Steve, 7656119…" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Метрика</CardTitle>
              <CardDescription>KPI-плитка со спарклайном</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[13px] text-fg-3">Выручка за 30 дней</p>
                <p className="mt-1 text-3xl font-semibold tracking-[-0.03em] nums">1 284 560 ₽</p>
                <Delta value={12.4} className="mt-1" />
              </div>
              <Sparkline data={[4, 6, 5, 8, 7, 9, 12, 10, 13, 12, 15, 17]} width={140} height={48} />
            </div>
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs text-fg-3">
                <span>Цель месяца: хостинг</span>
                <span className="nums">72 %</span>
              </div>
              <Progress value={72} tone="ice" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <CodeBlock
          title="Команды выдачи"
          code={`# LuckPerms — временная группа\nlp user {player} parent addtemp vip {days}d\neco give {player} {amount}\ncrates key give {player} legendary 1`}
        />
        <Card className="overflow-hidden">
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Игрок</TH>
                  <TH>Товар</TH>
                  <TH className="text-right">Сумма</TH>
                  <TH>Статус</TH>
                </TR>
              </THead>
              <TBody>
                {[
                  ["Steve_Pro", "VIP · 30 дней", "199 ₽", "ok"],
                  ["kotik228", "Кейс «Легенда» ×3", "297 ₽", "azure"],
                  ["d1ma_rust", "Набор «Старт»", "149 ₽", "warn"],
                ].map(([n, p, a, s]) => (
                  <TR key={n} interactive>
                    <TD>
                      <span className="flex items-center gap-2.5 text-fg">
                        <PixelAvatar name={n} size={22} /> {n}
                      </span>
                    </TD>
                    <TD>{p}</TD>
                    <TD className="text-right font-mono text-fg nums">{a}</TD>
                    <TD>
                      <Badge tone={s as "ok" | "azure" | "warn"} dot>
                        {s === "ok" ? "Доставлено" : s === "azure" ? "В очереди" : "Повтор 1/5"}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      </section>

      <section className="mt-6 flex flex-wrap items-center gap-6">
        <LogoMark size={48} />
        <LogoMark size={32} />
        <LogoMark size={16} />
        <Avatar name="Артём Ковалёв" size={32} />
        <Avatar name="Ника Л" size={32} />
        <PixelAvatar name="Notch_fan" size={32} />
        <PixelAvatar name="xXSniperXx" size={32} />
        <Server className="size-5 text-fg-3" />
        <Send className="size-5 text-fg-3" />
      </section>

      <DesignInteractive />
    </main>
  );
}
