import { Section, SectionHeading } from "@/components/marketing/section";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusDot } from "@/components/ui/status-dot";
import { getServer } from "@/lib/mock";
import { typo } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS = [
  { t: "00:00", title: "Регистрация", text: "Почта или Telegram. Без звонков менеджера и анкет." },
  { t: "00:02", title: "Подключение сервера", text: "Плагин или RCON. Проверяем ключ, версию ядра и пинг." },
  { t: "00:06", title: "Товары из шаблонов", text: "Привилегии, валюта, кейсы — команды LuckPerms и Vault уже прописаны." },
  { t: "00:10", title: "Ссылка в Telegram-канал", text: "arctic.paymc.ru — и ждите первый заказ." },
];

const COMMAND = "paymc connect pk_live_7Hq2…mX9";

const LOG: { t: string; text: string; tone?: "ok" | "cmd" | "dim" | "accent" }[] = [
  { t: "19:42:07", text: 'Done (3.412s)! For help, type "help"', tone: "dim" },
  { t: "19:42:31", text: COMMAND, tone: "cmd" },
  { t: "19:42:31", text: "[PayMC] Project key ok · ArcticMC" },
  { t: "19:42:32", text: "[PayMC] Connected: Paper 1.21.4 · ping 18 ms", tone: "ok" },
  { t: "19:42:32", text: "[PayMC] Hooks: LuckPerms 5.4 · PlayerPoints 3.2 · Vault" },
  { t: "19:42:32", text: "[PayMC] Test delivery: say PayMC test → ok (12 ms)" },
  { t: "19:42:33", text: "[PayMC] Queue empty. Waiting for the first order…", tone: "accent" },
];

const CHECKS = [
  ["Ключ проекта", "сервер привязан к вашему магазину, чужой ключ не подойдёт"],
  ["Ядро и версия", "Paper, Purpur, Folia, Velocity — от 1.16 до 1.21.4"],
  ["Плагины выдачи", "LuckPerms, Vault, PlayerPoints — шаблоны подставятся сами"],
  ["Тестовая команда", "выполняется в консоли, вы видите ответ сервера"],
];

export function SetupSection() {
  const srv = getServer("srv-survival");
  const consoleLabel = srv ? `Консоль · ${srv.name} · ${srv.platform}` : "Консоль сервера";
  return (
    <Section id="setup">
      <SectionHeading
        eyebrow="Подключение"
        title="Первый платёж — сегодня вечером."
        muted="Десять минут на всё"
        lead="Магазин собирается в тестовом режиме сразу. Принимать деньги можно, как только подключите самозанятость или ИП — это ещё пара минут в «Мой налог»."
      />

      {/* rail */}
      <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        <span aria-hidden className="absolute top-[7px] right-0 left-0 hidden h-px bg-line lg:block" />
        {STEPS.map((s, i) => (
          <li key={s.t} className="relative flex gap-4 lg:block lg:pr-8">
            <span
              className={cn(
                "relative z-10 mt-1 block size-[15px] shrink-0 rounded-full border-2 lg:mt-0",
                i === STEPS.length - 1 ? "border-fg-2 bg-canvas" : "border-line-strong bg-canvas",
              )}
            />
            <div className="lg:mt-5">
              <p className="font-mono text-[13px] text-fg-3 nums">{s.t}</p>
              <p className="mt-1 text-[16px] font-medium text-fg">{s.title}</p>
              <p className="mt-1 max-w-[260px] text-[13.5px] leading-relaxed text-fg-3">{typo(s.text)}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-14 grid gap-6 lg:mt-16 lg:grid-cols-12 lg:items-start lg:gap-12">
        {/* terminal */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-line-strong bg-[#070a10] shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)] lg:col-span-7">
          <div className="flex h-10 items-center justify-between border-b border-line-soft pr-1.5 pl-4">
            <span className="flex min-w-0 items-center gap-2.5">
              <StatusDot tone="ok" className="size-1.5 shrink-0" />
              <span className="label-mono truncate text-fg-4">{consoleLabel}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="hidden font-mono text-[11px] text-fg-4 sm:inline">{COMMAND}</span>
              <CopyButton value={COMMAND} label="Скопировать команду подключения" />
            </span>
          </div>
          <div className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-[1.75] sm:text-[12.5px]">
            {LOG.map((l, i) => (
              <p key={i} className="whitespace-pre">
                <span className="text-fg-4 select-none">[{l.t} INFO]: </span>
                {l.tone === "cmd" ? (
                  <span className="text-fg">
                    <span className="text-fg-4 select-none">&gt; </span>
                    {l.text}
                  </span>
                ) : (
                  <span className={cn(l.tone === "ok" ? "text-ok" : l.tone === "dim" ? "text-fg-3" : l.tone === "accent" ? "text-ice-300" : "text-fg-2")}>
                    {l.text}
                  </span>
                )}
              </p>
            ))}
            <p className="mt-0.5 text-fg">
              <span className="text-fg-4">&gt; </span>
              <span>▌</span>
            </p>
          </div>
        </div>

        <div className="lg:col-span-5">
          <p className="label-mono text-fg-4">Что проверяет paymc connect</p>
          <dl className="mt-4 divide-y divide-line-soft border-y border-line-soft">
            {CHECKS.map(([k, v]) => (
              <div key={k} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
                <dt className="text-[13.5px] font-medium text-fg">{k}</dt>
                <dd className="text-[13px] leading-snug text-fg-3">{typo(v)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[13px] leading-relaxed text-fg-3">
            Нет доступа к консоли? Хостинг с панелью Pterodactyl&nbsp;— ставим плагин через неё, RCON&nbsp;— просто впишите порт и&nbsp;пароль.
          </p>
        </div>
      </div>
    </Section>
  );
}
