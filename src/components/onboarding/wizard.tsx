"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDashed,
  CornerDownRight,
  Download,
  FileSpreadsheet,
  Loader2,
  PackagePlus,
  Plug,
  Plus,
  Terminal,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, pluralize } from "@/lib/format";
import { GAMES, GAME_LIST } from "@/lib/games";
import type { GameId } from "@/lib/mock/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { inputBase } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { GameChip } from "@/components/dashboard/game-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { GAME_SETUP, MIGRATION_SOURCES, migrationLog, starterPacks, type MigrationSource, type PackItem, type StarterPack } from "./starter-packs";

/* ───────────── state ───────────── */

type ConnectStatus = "idle" | "waiting" | "ok";
type TaxStatus = "self" | "ip" | "ooo";

interface Member {
  id: string;
  name: string;
  pct: number;
}

const customOk = (it: PackItem) => it.name.trim().length > 0 && it.command.trim().length > 0;
const priceOk = (price: number) => price >= 10 && price <= 100_000;

const STEPS = [
  { key: "game", label: "Игра и проект" },
  { key: "server", label: "Подключение сервера" },
  { key: "products", label: "Товары" },
  { key: "payouts", label: "Выплаты и налоги" },
  { key: "done", label: "Готово" },
] as const;

const TAKEN = new Set(["arctic", "kraken", "neva", "admin", "shop", "www", "api", "pay"]);

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function slugify(v: string) {
  return v
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT[c] ?? c)
    .join("")
    .replace(/(mc|rp|rust)$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function slugError(slug: string) {
  if (slug.length < 3) return "Минимум 3 символа";
  if (!/^[a-z0-9-]+$/.test(slug)) return "Только латиница, цифры и дефис";
  if (/^-|-$/.test(slug)) return "Дефис не может быть первым или последним";
  if (TAKEN.has(slug)) return `${slug}.paymc.ru уже занят — попробуйте ${slug}-mc`;
  return null;
}

function keyFor(slug: string) {
  let h = 7;
  for (const c of slug || "store") h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  const abc = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 14; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    out += abc[h % abc.length];
  }
  return `pk_test_${out}`;
}

const field = cn(inputBase, "h-10 px-3 text-[14px]");

/* ───────────── wizard ───────────── */

export function OnboardingWizard({ initialGame }: { initialGame: GameId }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = React.useState(0);
  const [reached, setReached] = React.useState(0);
  const [touched, setTouched] = React.useState(false);

  // 1 — game & project
  const [game, setGame] = React.useState<GameId>(initialGame);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugEdited, setSlugEdited] = React.useState(false);

  // 2 — server
  const [mode, setMode] = React.useState<"plugin" | "rcon">(GAME_SETUP[initialGame].agent ? "plugin" : "rcon");
  const [connect, setConnect] = React.useState<ConnectStatus>("idle");
  const [connectLog, setConnectLog] = React.useState(0);
  const [rcon, setRcon] = React.useState({ host: "", port: GAME_SETUP[initialGame].rconPort, password: "" });

  // 3 — products
  const [prodMode, setProdMode] = React.useState<"starter" | "migrate">("starter");
  const [packs, setPacks] = React.useState<(StarterPack & { on: boolean })[]>(() => starterPacks(initialGame).map((p) => ({ ...p, on: true })));
  const [custom, setCustom] = React.useState<PackItem[]>([]);
  const [source, setSource] = React.useState<MigrationSource>("easydonate");
  const [sourceKey, setSourceKey] = React.useState("");
  const [csvFile, setCsvFile] = React.useState<string | null>(null);
  const [migration, setMigration] = React.useState<{ status: "idle" | "running" | "done"; lines: number }>({ status: "idle", lines: 0 });

  // 4 — payouts
  const [tax, setTax] = React.useState<TaxStatus>("self");
  const [payTo, setPayTo] = React.useState<"sbp" | "card">("sbp");
  const [phone, setPhone] = React.useState("");
  const [card, setCard] = React.useState("");
  const [split, setSplit] = React.useState(false);
  const [members, setMembers] = React.useState<Member[]>([
    { id: "me", name: "Вы", pct: 70 },
    { id: "m1", name: "Разработчик", pct: 30 },
  ]);

  // 5 — done
  const [test, setTest] = React.useState<{ status: "idle" | "running" | "done"; lines: number }>({ status: "idle", lines: 0 });

  const timers = React.useRef<number[]>([]);
  React.useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, reduce ? Math.min(ms, 60) : ms));

  const effectiveSlug = slugEdited ? slug : slugify(name);
  const sErr = slugError(effectiveSlug);
  const nErr = name.trim().length < 2 ? "Название проекта — как его знают игроки" : null;
  const meta = GAMES[game];
  const setup = GAME_SETUP[game];
  const connectorLabel = setup.label;
  const isHttpApi = game === "gta5";

  const pricesOk = packs.every((p) => !p.on || p.items.every((i) => priceOk(i.price))) && custom.every((i) => priceOk(i.price));
  const customComplete = custom.every(customOk);
  const activeItems = [...packs.filter((p) => p.on).flatMap((p) => p.items), ...custom.filter(customOk)];
  const sourceMeta = MIGRATION_SOURCES.find((s) => s.id === source) ?? MIGRATION_SOURCES[0];
  const sourceReady = sourceMeta.key ? sourceKey.trim().length >= 8 : csvFile !== null;
  const phoneDigits = phone.replace(/\D/g, "");
  const cardDigits = card.replace(/\D/g, "");
  const payErr = payTo === "sbp" ? (phoneDigits.length === 10 ? null : "Номер из 10 цифр после +7") : cardDigits.length === 16 ? null : "Номер карты — 16 цифр";
  const splitSum = members.reduce((a, m) => a + (Number.isFinite(m.pct) ? m.pct : 0), 0);
  const splitErr = split && splitSum !== 100 ? `Сумма долей ${splitSum} % — должно быть ровно 100 %` : null;

  const valid = [
    !nErr && !sErr,
    connect === "ok",
    prodMode === "starter" ? activeItems.length > 0 && pricesOk && customComplete : migration.status === "done",
    !payErr && !splitErr,
    true,
  ];

  /* side effects started by events (no effects that set state) */
  function startPluginWait() {
    setConnect("waiting");
    setConnectLog(1);
    later(() => setConnectLog(2), 900);
    later(() => setConnectLog(3), 2000);
    later(() => {
      setConnectLog(4);
      setConnect("ok");
    }, 3200);
  }

  function checkRcon() {
    if (!rcon.host.trim() || (!isHttpApi && !rcon.password)) {
      setTouched(true);
      return;
    }
    setConnect("waiting");
    later(() => setConnect("ok"), 1500);
  }

  function runMigration() {
    if (!sourceReady) {
      setTouched(true);
      return;
    }
    setMigration({ status: "running", lines: 0 });
    const total = migrationLog(source, game).length;
    for (let i = 1; i <= total; i++) later(() => setMigration({ status: i === total ? "done" : "running", lines: i }), i * 520);
  }

  function runTest() {
    setTest({ status: "running", lines: 0 });
    for (let i = 1; i <= 5; i++) later(() => setTest({ status: i === 5 ? "done" : "running", lines: i }), i * 380);
  }

  function chooseGame(g: GameId) {
    if (g === game) return;
    setGame(g);
    setPacks(starterPacks(g).map((p) => ({ ...p, on: true })));
    setRcon((r) => ({ ...r, port: GAME_SETUP[g].rconPort }));
    // a different game means a different agent — the old connection doesn't count
    setConnect("idle");
    setConnectLog(0);
    if (!GAME_SETUP[g].agent) setMode("rcon");
    else if (g === "gta5") setMode("plugin");
  }

  const customSeq = React.useRef(0);
  function addCustom() {
    customSeq.current += 1;
    const id = `custom-${customSeq.current}`;
    setCustom((all) => [...all, { id, name: "", price: 199, command: "" }]);
  }

  const go = React.useCallback(
    (to: number) => {
      if (to < 0 || to > STEPS.length - 1) return;
      setStep(to);
      setReached((r) => Math.max(r, to));
      setTouched(false);
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    },
    [reduce],
  );

  const next = React.useCallback(() => {
    if (step === STEPS.length - 1) {
      router.push("/dashboard");
      return;
    }
    if (!valid[step]) {
      setTouched(true);
      return;
    }
    if (step === 0) {
      if (!slugEdited) setSlug(effectiveSlug);
      if (connect === "idle" && mode === "plugin") startPluginWait();
    }
    go(step + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, valid, router, go, slugEdited, effectiveSlug, connect, mode]);

  // Enter = next (buttons, links and text areas keep their own Enter)
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "BUTTON" || t.tagName === "A" || t.tagName === "TEXTAREA" || t.getAttribute("role") === "radio" || t.getAttribute("role") === "switch")) return;
      e.preventDefault();
      next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next]);

  const current = STEPS[step];

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pb-32 sm:px-6 lg:px-8">
      <ProgressRail step={step} reached={reached} valid={valid} onGo={go} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <section aria-labelledby="ob-title" className="min-w-0">
          <p className="label-mono hidden text-fg-3 sm:block">
            Шаг {step + 1} из {STEPS.length}
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 ? (
                <StepShell title="Во что играют на сервере?" lead="От игры зависят плагин, шаблоны команд и правила монетизации. Игру можно добавить позже — для сети серверов.">
                  <div role="radiogroup" aria-label="Игра" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {GAME_LIST.map((g) => {
                      const on = g.id === game;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => chooseGame(g.id)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                            on ? "border-azure-400/60 bg-azure-500/[0.08]" : "border-line hover:border-line-strong",
                          )}
                        >
                          <GameChip game={g.id} size={28} />
                          <span className="min-w-0">
                            <span className={cn("block truncate text-[13px] font-medium", on ? "text-fg" : "text-fg-2")}>{g.name}</span>
                            <span className="block truncate text-[11px] text-fg-4">{g.status === "beta" ? "бета" : g.platforms.slice(0, 2).join(", ")}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {meta.rules ? (
                    <p className="mt-3 flex gap-2 rounded-md border border-warn/20 bg-warn-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-fg-2">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warn" />
                      {meta.rules}
                    </p>
                  ) : null}

                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <Labeled id="ob-name" label="Название проекта" error={touched ? nErr : null}>
                      <input
                        id="ob-name"
                        value={name}
                        onChange={(e) => setName(e.target.value.slice(0, 32))}
                        placeholder="ArcticMC"
                        autoFocus
                        aria-invalid={!!(touched && nErr)}
                        className={field}
                      />
                    </Labeled>
                    <Labeled
                      id="ob-slug"
                      label="Адрес магазина"
                      error={(touched || slugEdited || name) && effectiveSlug ? sErr : touched ? sErr : null}
                      hint={!sErr ? "Свой домен подключите в «Витрине» — за 5 минут" : undefined}
                    >
                      <div className={cn(field, "flex items-center gap-0 p-0 focus-within:border-azure-500/70 focus-within:shadow-[0_0_0_3px_rgb(51_119_255/0.18)]")}>
                        <input
                          id="ob-slug"
                          value={effectiveSlug}
                          onChange={(e) => {
                            setSlugEdited(true);
                            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24));
                          }}
                          spellCheck={false}
                          placeholder="arcticmc"
                          aria-invalid={!!(touched && sErr)}
                          className="h-full min-w-0 flex-1 bg-transparent pl-3 font-mono text-[14px] text-fg outline-none placeholder:text-fg-4"
                        />
                        <span className="shrink-0 pr-3 font-mono text-[13px] text-fg-3">.paymc.ru</span>
                      </div>
                    </Labeled>
                  </div>
                  <div className="mt-4 flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
                    <span className={cn("size-2 rounded-full", effectiveSlug && !sErr ? "bg-ok" : "bg-fg-4")} aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
                      <span className="text-fg-4">https://</span>
                      <span className="text-fg">{effectiveSlug || "ваш-проект"}</span>
                      <span className="text-fg-3">.paymc.ru</span>
                    </span>
                    <span className={cn("text-xs", effectiveSlug && !sErr ? "text-ok" : "text-fg-4")}>{effectiveSlug && !sErr ? "свободен" : "проверим"}</span>
                  </div>
                </StepShell>
              ) : null}

              {step === 1 ? (
                <StepShell
                  title="Подключите сервер"
                  lead={
                    setup.agent
                      ? `${meta.integration}. Выдача через ${connectorLabel.toLowerCase()} — за доли секунды, ${setup.rconLabel} — без установки.`
                      : `${meta.integration}. Для ${meta.name} ставить ничего не нужно — PayMC выдаёт покупки через ${setup.rconLabel}.`
                  }
                >
                  {setup.agent ? (
                    <Segmented
                      value={mode}
                      onChange={(v) => {
                        setMode(v);
                        setConnect("idle");
                        setConnectLog(0);
                        if (v === "plugin") startPluginWait();
                      }}
                      options={[
                        { value: "plugin", label: <><Plug /> {connectorLabel}</> },
                        { value: "rcon", label: <><Terminal /> {setup.rconLabel}</> },
                      ]}
                    />
                  ) : null}
                  {mode === "plugin" && setup.agent ? (
                    <div className="mt-5 grid gap-4">
                      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-medium text-fg">PayMC Agent 2.4.1</p>
                          <p className="truncate text-xs text-fg-3">
                            <span className="font-mono">{setup.agent.file}</span> · {meta.platforms.slice(0, 4).join(" · ")} · 312 КБ
                          </p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => toast.success("Загрузка началась", { description: `${setup.agent?.file} · 312 КБ` })}>
                          <Download /> Скачать
                        </Button>
                      </div>
                      <CodeBlock
                        title="Консоль сервера"
                        code={`# 1. ${setup.agent.file} → ${setup.agent.dir}\n#    и перезапустите сервер\n# 2. Выполните в консоли:\npaymc connect ${keyFor(effectiveSlug)}`}
                      />
                      <ConnectConsole status={connect} lines={connectLog} slug={effectiveSlug} game={game} />
                    </div>
                  ) : isHttpApi ? (
                    <div className="mt-5 grid gap-4">
                      <Labeled
                        id="rc-host"
                        label="Адрес обработчика на вашем сервере"
                        error={touched && !rcon.host.trim() ? "Укажите URL, на который PayMC будет отправлять выдачу" : null}
                        hint="POST с телом заказа — ваш движок выдаёт покупку и отвечает 200"
                      >
                        <input id="rc-host" value={rcon.host} onChange={(e) => setRcon({ ...rcon, host: e.target.value.trim() })} placeholder="https://api.myrp.ru/paymc" className={cn(field, "font-mono")} />
                      </Labeled>
                      <div className="grid gap-1.5">
                        <p className="text-[13px] font-medium text-fg-2">Секрет подписи</p>
                        <div className="flex h-10 items-center gap-2 rounded-md border border-line bg-surface pr-1 pl-3">
                          <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg">{keyFor(`${effectiveSlug}-hook`).replace("pk_test_", "whsec_")}</span>
                          <CopyButton value={keyFor(`${effectiveSlug}-hook`).replace("pk_test_", "whsec_")} label="Скопировать секрет подписи" />
                        </div>
                        <p className="text-xs text-fg-3">Проверяйте заголовок X-PayMC-Signature (HMAC-SHA256) — так запросы не подделать.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button variant="secondary" onClick={checkRcon} disabled={connect === "waiting"}>
                          {connect === "waiting" ? <Loader2 className="animate-spin" /> : <Zap />} Отправить тестовый запрос
                        </Button>
                        {connect === "ok" ? (
                          <span className="flex items-center gap-1.5 font-mono text-[12px] text-ok">
                            <Check className="size-3.5" /> POST → 200 OK · 84 мс
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
                        <Labeled id="rc-host" label="Адрес сервера" error={touched && !rcon.host.trim() ? "Укажите IP или домен" : null}>
                          <input id="rc-host" value={rcon.host} onChange={(e) => setRcon({ ...rcon, host: e.target.value.trim() })} placeholder="play.example.ru" className={cn(field, "font-mono")} />
                        </Labeled>
                        <Labeled id="rc-port" label="Порт">
                          <input id="rc-port" value={rcon.port} inputMode="numeric" onChange={(e) => setRcon({ ...rcon, port: e.target.value.replace(/\D/g, "").slice(0, 5) })} className={cn(field, "font-mono")} />
                        </Labeled>
                      </div>
                      <Labeled
                        id="rc-pass"
                        label={`Пароль ${setup.rconLabel}`}
                        error={touched && !rcon.password ? setup.rconHint : null}
                        hint={`${setup.rconHint}. Храним зашифрованным, видят только владельцы`}
                      >
                        <input id="rc-pass" type="password" value={rcon.password} onChange={(e) => setRcon({ ...rcon, password: e.target.value })} className={cn(field, "font-mono")} autoComplete="off" />
                      </Labeled>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button variant="secondary" onClick={checkRcon} disabled={connect === "waiting"}>
                          {connect === "waiting" ? <Loader2 className="animate-spin" /> : <Zap />} Проверить подключение
                        </Button>
                        {connect === "ok" ? (
                          <span className="flex items-center gap-1.5 font-mono text-[12px] text-ok">
                            <Check className="size-3.5" /> {game === "minecraft" ? "list → There are 0 of a max of 100 players online" : `${setup.rconLabel} отвечает · 0 игроков онлайн`}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </StepShell>
              ) : null}

              {step === 2 ? (
                <StepShell title="Что будете продавать" lead="Начните с готовых наборов — цены и команды поправите в любой момент. Уже продаёте на другой платформе? Перенесём всё вместе с историей.">
                  <Segmented
                    value={prodMode}
                    onChange={setProdMode}
                    options={[
                      { value: "starter", label: "Стартовые наборы" },
                      { value: "migrate", label: "Переехать с другой платформы" },
                    ]}
                  />
                  {prodMode === "starter" ? (
                    <div className="mt-5 grid gap-3">
                      {packs.length === 0 && custom.length === 0 ? (
                        <EmptyState
                          className="rounded-lg border border-dashed border-line py-10"
                          icon={<PackagePlus />}
                          title={`Для ${meta.name} готовых наборов пока нет`}
                          description="Добавьте товар вручную — название, цену и команду выдачи — или перенесите каталог с другой платформы."
                          action={
                            <div className="flex flex-wrap justify-center gap-2">
                              <Button size="sm" variant="secondary" onClick={addCustom}>
                                <Plus /> Добавить товар вручную
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setProdMode("migrate")}>
                                Переехать с другой платформы
                              </Button>
                            </div>
                          }
                        />
                      ) : null}
                      {packs.map((p) => (
                        <div key={p.id} className={cn("rounded-lg border bg-surface transition-colors", p.on ? "border-line" : "border-dashed border-line opacity-70")}>
                          <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-fg">
                                {p.title} <Badge tone="outline">{p.plugin}</Badge>
                                {p.review ? <Badge tone="warn">{p.review}</Badge> : null}
                              </p>
                              <p className="mt-0.5 text-xs text-fg-3">{p.description}</p>
                            </div>
                            <Switch checked={p.on} onCheckedChange={(v) => setPacks((all) => all.map((x) => (x.id === p.id ? { ...x, on: v } : x)))} aria-label={`Добавить «${p.title}»`} />
                          </label>
                          {p.on ? (
                            <ul className="divide-y divide-line-soft border-t border-line-soft">
                              {p.items.map((it) => {
                                const bad = it.price < 10 || it.price > 100_000;
                                return (
                                  <li key={it.id} className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-3 px-4 py-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-[13px] text-fg-2">{it.name}</p>
                                      <p className="truncate font-mono text-[11px] text-fg-4">
                                        <span className="select-none">$ </span>
                                        {it.command}
                                      </p>
                                    </div>
                                    <div>
                                      <div className={cn(inputBase, "flex h-8 items-center pr-2", bad && "border-bad/60")}>
                                        <input
                                          value={Number.isFinite(it.price) ? String(it.price) : ""}
                                          inputMode="numeric"
                                          aria-label={`Цена «${it.name}»`}
                                          aria-invalid={bad}
                                          onChange={(e) => {
                                            const v = Number(e.target.value.replace(/\D/g, "").slice(0, 6));
                                            setPacks((all) => all.map((x) => (x.id === p.id ? { ...x, items: x.items.map((y) => (y.id === it.id ? { ...y, price: v } : y)) } : x)));
                                          }}
                                          className="h-full w-full min-w-0 bg-transparent pl-2.5 text-right font-mono text-[13px] text-fg outline-none"
                                        />
                                        <span className="pl-1 text-[12px] text-fg-4">₽</span>
                                      </div>
                                      {bad ? <p className="mt-0.5 text-right text-[11px] text-bad">от 10 ₽</p> : null}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                      {custom.length > 0 ? (
                        <div className="rounded-lg border border-line bg-surface">
                          <p className="px-4 pt-3 text-[14px] font-medium text-fg">Свои товары</p>
                          <p className="px-4 text-xs text-fg-3">Команда выполняется на сервере как есть. Переменные: {"{player}"}, {"{days}"}, {"{amount}"}.</p>
                          <ul className="mt-2 divide-y divide-line-soft border-t border-line-soft">
                            {custom.map((it) => {
                              const bad = !priceOk(it.price);
                              const update = (patch: Partial<PackItem>) => setCustom((all) => all.map((x) => (x.id === it.id ? { ...x, ...patch } : x)));
                              return (
                                <li key={it.id} className="grid grid-cols-[minmax(0,1fr)_96px_32px] items-start gap-2 px-4 py-2.5">
                                  <div className="grid min-w-0 gap-1.5">
                                    <input
                                      value={it.name}
                                      onChange={(e) => update({ name: e.target.value.slice(0, 48) })}
                                      placeholder="Название, например VIP · 30 дней"
                                      aria-label="Название товара"
                                      aria-invalid={touched && !it.name.trim()}
                                      className={cn(inputBase, "h-8 px-2.5 text-[13px]", touched && !it.name.trim() && "border-bad/60")}
                                    />
                                    <input
                                      value={it.command}
                                      onChange={(e) => update({ command: e.target.value.slice(0, 160) })}
                                      placeholder="команда выдачи, например paymc grant {player} vip 30d"
                                      spellCheck={false}
                                      aria-label="Команда выдачи"
                                      aria-invalid={touched && !it.command.trim()}
                                      className={cn(inputBase, "h-8 px-2.5 font-mono text-[12px]", touched && !it.command.trim() && "border-bad/60")}
                                    />
                                  </div>
                                  <div className={cn(inputBase, "flex h-8 items-center pr-2", bad && "border-bad/60")}>
                                    <input
                                      value={Number.isFinite(it.price) ? String(it.price) : ""}
                                      inputMode="numeric"
                                      aria-label="Цена"
                                      aria-invalid={bad}
                                      onChange={(e) => update({ price: Number(e.target.value.replace(/\D/g, "").slice(0, 6)) })}
                                      className="h-full w-full min-w-0 bg-transparent pl-2.5 text-right font-mono text-[13px] text-fg outline-none"
                                    />
                                    <span className="pl-1 text-[12px] text-fg-4">₽</span>
                                  </div>
                                  <Button variant="ghost" size="icon-sm" aria-label="Удалить товар" onClick={() => setCustom((all) => all.filter((x) => x.id !== it.id))}>
                                    <Trash2 />
                                  </Button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}
                      {packs.length > 0 || custom.length > 0 ? (
                        <div>
                          <Button size="sm" variant="ghost" onClick={addCustom}>
                            <Plus /> Добавить товар вручную
                          </Button>
                        </div>
                      ) : null}
                      {touched && !customComplete ? <p className="text-xs text-bad">Заполните название и команду у своих товаров — или удалите пустые строки.</p> : null}
                      {touched && customComplete && activeItems.length === 0 ? (
                        <p className="text-xs text-bad">Включите хотя бы один набор, добавьте товар вручную — или переезжайте с другой платформы.</p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4">
                      <div role="radiogroup" aria-label="Откуда переезжаем" className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                        {MIGRATION_SOURCES.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            role="radio"
                            aria-checked={source === s.id}
                            disabled={migration.status === "running"}
                            onClick={() => {
                              setSource(s.id);
                              setSourceKey("");
                              setMigration({ status: "idle", lines: 0 });
                            }}
                            className={cn(
                              "rounded-lg border p-2.5 text-left transition-colors disabled:opacity-60",
                              source === s.id ? "border-azure-400/60 bg-azure-500/[0.08]" : "border-line hover:border-line-strong",
                            )}
                          >
                            <span className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
                              {s.id === "csv" ? <FileSpreadsheet className="size-3.5 text-fg-3" /> : null}
                              {s.label}
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-fg-4">{s.hint}</span>
                          </button>
                        ))}
                      </div>
                      {sourceMeta.key ? (
                        <Labeled
                          id="ob-src-key"
                          label={`${sourceMeta.key} ${sourceMeta.label}`}
                          error={touched && !sourceReady && migration.status === "idle" ? `Вставьте ${sourceMeta.key.toLowerCase()} — без него ${sourceMeta.label} не отдаст товары` : null}
                          hint={`Где взять: ${sourceMeta.where}. Нужен только доступ на чтение`}
                        >
                          <input
                            id="ob-src-key"
                            value={sourceKey}
                            onChange={(e) => setSourceKey(e.target.value.trim().slice(0, 96))}
                            disabled={migration.status !== "idle"}
                            spellCheck={false}
                            autoComplete="off"
                            placeholder="вставьте ключ"
                            aria-invalid={!!(touched && !sourceReady)}
                            className={cn(field, "font-mono text-[13px] disabled:opacity-60")}
                          />
                        </Labeled>
                      ) : (
                        <div className="grid gap-1.5">
                          <label
                            htmlFor="ob-csv"
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-4 transition-colors hover:border-line-strong",
                              touched && !csvFile ? "border-bad/60" : "border-line",
                              migration.status !== "idle" && "pointer-events-none opacity-60",
                            )}
                          >
                            <Upload className="size-4 shrink-0 text-fg-3" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] text-fg">{csvFile ?? "Выберите CSV-файл"}</span>
                              <span className="block text-xs text-fg-3">{csvFile ? "Готово к импорту · заменить — нажмите ещё раз" : "Колонки name, price, command · UTF-8 · до 5 МБ"}</span>
                            </span>
                          </label>
                          <input
                            id="ob-csv"
                            type="file"
                            accept=".csv,text/csv"
                            className="sr-only"
                            onChange={(e) => setCsvFile(e.target.files?.[0]?.name ?? null)}
                          />
                          {touched && !csvFile ? <p className="text-xs text-bad">Выберите файл — без него переносить нечего</p> : null}
                        </div>
                      )}
                      <div className="overflow-hidden rounded-lg border border-line bg-[#070a10]">
                        <div className="flex h-10 items-center justify-between border-b border-line-soft px-3">
                          <span className="label-mono text-fg-3">Импорт · {sourceMeta.label}</span>
                          {migration.status === "idle" ? (
                            <Button size="xs" variant="primary" onClick={runMigration} aria-disabled={!sourceReady}>
                              Начать импорт
                            </Button>
                          ) : migration.status === "running" ? (
                            <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-ice-300">
                              <Loader2 className="size-3 animate-spin" /> переносим…
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-ok">
                              <Check className="size-3.5" /> перенесено
                            </span>
                          )}
                        </div>
                        <ol className="min-h-[188px] px-3.5 py-3 font-mono text-[12px] leading-[1.75]" aria-live="polite">
                          {migration.status === "idle" ? (
                            <li className="text-fg-4">Товары, команды, промокоды и история покупок. Старый магазин продолжит работать, пока вы не отключите его.</li>
                          ) : (
                            migrationLog(source, game)
                              .slice(0, migration.lines)
                              .map((l, i) => (
                                <li key={i} className={cn("flex gap-2 animate-fade-up", l.tone === "ok" ? "text-fg-2" : l.tone === "warn" ? "text-warn" : "text-fg-3")}>
                                  <span className={cn("w-3 shrink-0", l.tone === "ok" ? "text-ok" : l.tone === "warn" ? "text-warn" : "text-fg-4")}>
                                    {l.tone === "ok" ? "✓" : l.tone === "warn" ? "!" : "→"}
                                  </span>
                                  {l.text}
                                </li>
                              ))
                          )}
                        </ol>
                      </div>
                      {touched && migration.status === "idle" ? <p className="text-xs text-bad">Запустите импорт или вернитесь к стартовым наборам.</p> : null}
                    </div>
                  )}
                </StepShell>
              ) : null}

              {step === 3 ? (
                <StepShell title="Выплаты и налоги" lead="Деньги приходят каждый день в 12:00 МСК. Чеки отправляем сами — выберите, как вы работаете.">
                  <div role="radiogroup" aria-label="Налоговый статус" className="grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        { v: "self", t: "Самозанятый", d: "Чеки НПД отправляем в «Мой налог» через партнёрский доступ. Следим за лимитом 2,4 млн ₽ в год." },
                        { v: "ip", t: "ИП", d: "Облачная касса 54-ФЗ: чек каждому игроку, ОФД и фискальный накопитель не нужны." },
                        { v: "ooo", t: "ООО", d: "Облачная касса 54-ФЗ и ежемесячный отчёт агента с закрывающими документами." },
                      ] as const
                    ).map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        role="radio"
                        aria-checked={tax === o.v}
                        onClick={() => setTax(o.v)}
                        className={cn("flex flex-col justify-start rounded-lg border p-3.5 text-left transition-colors", tax === o.v ? "border-azure-400/60 bg-azure-500/[0.08]" : "border-line hover:border-line-strong")}
                      >
                        <span className="flex items-center justify-between">
                          <span className="text-[14px] font-medium text-fg">{o.t}</span>
                          <span className={cn("flex size-4 items-center justify-center rounded-full border", tax === o.v ? "border-azure-400 bg-azure-500" : "border-line-strong")}>
                            {tax === o.v ? <Check className="size-2.5 text-white" strokeWidth={3} /> : null}
                          </span>
                        </span>
                        <span className="mt-1.5 block text-[12px] leading-relaxed text-fg-3">{o.d}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[13px] font-medium text-fg">Куда выплачивать</p>
                      <Segmented
                        value={payTo}
                        onChange={setPayTo}
                        options={[
                          { value: "sbp", label: "СБП по номеру" },
                          { value: "card", label: "Карта" },
                        ]}
                      />
                    </div>
                    {payTo === "sbp" ? (
                      <Labeled id="ob-phone" label="Телефон, привязанный к банку" error={touched ? payErr : null} hint="Банк выберете при первой выплате — СБП покажет список">
                        <div className={cn(field, "flex items-center p-0 focus-within:border-azure-500/70")}>
                          <span className="pl-3 font-mono text-[14px] text-fg-3">+7</span>
                          <input
                            id="ob-phone"
                            value={formatPhone(phoneDigits)}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            inputMode="tel"
                            autoComplete="tel-national"
                            placeholder="900 000-00-00"
                            aria-invalid={!!(touched && payErr)}
                            className="h-full min-w-0 flex-1 bg-transparent px-2 font-mono text-[14px] text-fg outline-none placeholder:text-fg-4"
                          />
                        </div>
                      </Labeled>
                    ) : (
                      <Labeled id="ob-card" label="Номер карты" error={touched ? payErr : null} hint={cardDigits.startsWith("2") ? "Мир — выплаты без комиссии" : "Мир, Visa и Mastercard российских банков"}>
                        <input
                          id="ob-card"
                          value={cardDigits.replace(/(\d{4})(?=\d)/g, "$1 ")}
                          onChange={(e) => setCard(e.target.value.replace(/\D/g, "").slice(0, 16))}
                          inputMode="numeric"
                          autoComplete="cc-number"
                          placeholder="2200 0000 0000 0000"
                          aria-invalid={!!(touched && payErr)}
                          className={cn(field, "font-mono")}
                        />
                      </Labeled>
                    )}
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-fg-3">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-ok" />
                      Если банк не примет перевод, повторим через резервный банк в тот же день. Карточные платежи — с холдом 24 ч, СБП — без холда.
                    </p>
                  </div>

                  <div className="mt-8 rounded-lg border border-line bg-surface">
                    <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                      <span>
                        <span className="block text-[13.5px] font-medium text-fg">Делить выплаты с командой</span>
                        <span className="block text-xs text-fg-3">Каждый получает свою долю на свою карту, чеки — от своего имени</span>
                      </span>
                      <Switch checked={split} onCheckedChange={setSplit} aria-label="Делить выплаты с командой" />
                    </label>
                    {split ? (
                      <div className="border-t border-line-soft px-4 py-3">
                        <ul className="grid gap-2">
                          {members.map((m) => (
                            <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_96px_32px] items-center gap-2">
                              <input
                                value={m.name}
                                disabled={m.id === "me"}
                                aria-label="Имя участника"
                                onChange={(e) => setMembers((all) => all.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))}
                                className={cn(inputBase, "h-8 px-2.5 text-[13px]")}
                              />
                              <div className={cn(inputBase, "flex h-8 items-center pr-2")}>
                                <input
                                  value={String(m.pct)}
                                  inputMode="numeric"
                                  aria-label={`Доля: ${m.name}`}
                                  onChange={(e) => setMembers((all) => all.map((x) => (x.id === m.id ? { ...x, pct: Number(e.target.value.replace(/\D/g, "").slice(0, 3)) } : x)))}
                                  className="h-full w-full min-w-0 bg-transparent pl-2.5 text-right font-mono text-[13px] text-fg outline-none"
                                />
                                <span className="pl-1 text-[12px] text-fg-4">%</span>
                              </div>
                              {m.id === "me" ? (
                                <span />
                              ) : (
                                <Button variant="ghost" size="icon-sm" aria-label={`Убрать ${m.name}`} onClick={() => setMembers((all) => all.filter((x) => x.id !== m.id))}>
                                  <Trash2 />
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 flex items-center justify-between">
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={members.length >= 6}
                            onClick={() => setMembers((all) => [...all, { id: `m${all.length + 1}-${all.length * 7}`, name: "Модератор", pct: 0 }])}
                          >
                            <Plus /> Участник
                          </Button>
                          <span className={cn("font-mono text-[12px] nums", splitErr ? "text-bad" : "text-ok")}>Итого {splitSum} %</span>
                        </div>
                        {touched && splitErr ? <p className="mt-1 text-xs text-bad">{splitErr}</p> : null}
                      </div>
                    ) : null}
                  </div>
                </StepShell>
              ) : null}

              {step === 4 ? (
                <StepShell title="Магазин готов" lead="Проверьте всё на тестовой покупке — деньги не списываются, команда уходит на ваш сервер по-настоящему.">
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                    <span className="size-2 rounded-full bg-ok" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-mono text-[15px] text-fg">{effectiveSlug}.paymc.ru</span>
                    <CopyButton value={`https://${effectiveSlug}.paymc.ru`} label="Скопировать ссылку на магазин" />
                    <Button asChild size="sm" variant="secondary">
                      <Link href="/s/arctic" target="_blank" rel="noopener" title="Витрина демо-проекта ArcticMC — ваша будет выглядеть так же">
                        Пример витрины
                      </Link>
                    </Button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-lg border border-line bg-[#070a10]">
                    <div className="flex h-11 items-center justify-between gap-3 border-b border-line-soft px-3">
                      <span className="flex items-center gap-2">
                        <Badge tone="warn">тестовый режим</Badge>
                        <span className="hidden text-xs text-fg-3 sm:inline">{activeItems[0]?.name ?? "Товар"} · игрок TestPlayer</span>
                      </span>
                      <Button size="xs" variant={test.status === "done" ? "secondary" : "primary"} onClick={runTest} disabled={test.status === "running"}>
                        {test.status === "running" ? <Loader2 className="animate-spin" /> : <Zap />}
                        {test.status === "done" ? "Ещё раз" : "Провести тестовую покупку"}
                      </Button>
                    </div>
                    <TestTrace lines={test.lines} status={test.status} command={(activeItems[0]?.command ?? "say test").replace("{player}", "TestPlayer").replace("{steamid}", "76561198000000000").replace("{staticid}", "1042").replace("{eosid}", "0002a1f").replace("{days}", "30")} />
                  </div>

                  <ul className="mt-6 grid gap-2">
                    <CheckItem done label={`Проект «${name.trim() || "Без названия"}»`} meta={`${meta.name} · ${effectiveSlug}.paymc.ru`} />
                    <CheckItem done label="Сервер подключён" meta={mode === "plugin" ? `${connectorLabel} PayMC 2.4.1` : `${setup.rconLabel} · ${rcon.host || "сервер"}`} />
                    <CheckItem
                      done
                      label={prodMode === "starter" ? pluralize(activeItems.length, ["товар", "товара", "товаров"]) : "24 товара перенесены"}
                      meta={prodMode === "starter" && activeItems.length ? `от ${formatMoney(Math.min(...activeItems.map((i) => i.price)))} до ${formatMoney(Math.max(...activeItems.map((i) => i.price)))}` : MIGRATION_SOURCES.find((s) => s.id === source)?.label}
                    />
                    <CheckItem done label="Выплаты в 12:00 МСК" meta={`${payTo === "sbp" ? `СБП · +7 ${formatPhone(phoneDigits)}` : `карта •• ${cardDigits.slice(-4)}`} · ${tax === "self" ? "чеки НПД" : "касса 54-ФЗ"}`} />
                    <CheckItem done={test.status === "done"} label="Тестовая покупка" meta={test.status === "done" ? "выдано за 0,3 с" : "займёт 2 секунды"} />
                    <CheckItem label="Свой домен" meta="в «Витрине», когда будете готовы" href="/dashboard/storefront" />
                    <CheckItem label="Уведомления о покупках в Telegram" meta="в «Интеграциях»" href="/dashboard/integrations" />
                  </ul>
                </StepShell>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </section>

        <Summary
          step={step}
          game={game}
          name={name}
          slug={effectiveSlug}
          slugOk={!sErr}
          connect={connect}
          mode={mode}
          connectorLabel={connectorLabel}
          rconLabel={setup.rconLabel}
          products={step < 2 ? 0 : prodMode === "starter" ? activeItems.length : migration.status === "done" ? 24 : 0}
          payout={step >= 3 && !payErr ? (payTo === "sbp" ? `СБП · +7 ${formatPhone(phoneDigits)}` : `Карта •• ${cardDigits.slice(-4)}`) : null}
          tax={tax}
        />
      </div>

      {/* nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0}>
            <ArrowLeft /> Назад
          </Button>
          <span className="ml-auto hidden items-center gap-1.5 text-xs text-fg-4 sm:flex">
            <Kbd>Enter</Kbd> {step === STEPS.length - 1 ? "открыть кабинет" : "дальше"}
          </span>
          <Button variant={step === STEPS.length - 1 ? "white" : "primary"} onClick={next} className="ml-auto sm:ml-0" aria-disabled={!valid[step]}>
            {step === STEPS.length - 1 ? "Открыть кабинет" : step === 1 && connect !== "ok" ? "Ждём сервер…" : "Дальше"}
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatPhone(d: string) {
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean);
  if (parts.length <= 1) return parts.join("");
  return `${parts[0]} ${parts[1]}${parts[2] ? `-${parts[2]}` : ""}${parts[3] ? `-${parts[3]}` : ""}`;
}

/* ───────────── parts ───────────── */

function StepShell({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 id="ob-title" className="mt-2 font-display text-[28px] leading-[1.08] font-semibold tracking-[-0.035em] text-fg sm:text-[34px]">
        {title}
      </h1>
      <p className="mt-2 max-w-[620px] text-[14px] leading-relaxed text-fg-3">{lead}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Labeled({ id, label, error, hint, children }: { id: string; label: string; error?: string | null; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-fg-2">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-bad">{error}</p> : hint ? <p className="text-xs text-fg-3">{hint}</p> : null}
    </div>
  );
}

function ProgressRail({ step, reached, valid, onGo }: { step: number; reached: number; valid: boolean[]; onGo: (i: number) => void }) {
  return (
    <nav aria-label="Шаги настройки" className="pt-6 sm:pt-8">
      <p className="mb-2 text-[12.5px] text-fg-3 sm:hidden">
        Шаг {step + 1} из {STEPS.length} · <span className="text-fg">{STEPS[step].label}</span>
      </p>
      <ol className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {STEPS.map((s, i) => {
          const done = i < step || (i <= reached && i !== step && valid[i]);
          const can = i <= reached;
          return (
            <li key={s.key}>
              <button
                type="button"
                disabled={!can}
                onClick={() => onGo(i)}
                aria-current={i === step ? "step" : undefined}
                className="group block w-full text-left disabled:cursor-not-allowed"
              >
                <span className="block h-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <span
                    className={cn(
                      "block h-full rounded-full transition-[width,background-color] duration-300 ease-[var(--ease-snappy)]",
                      i < step ? "w-full bg-azure-500" : i === step ? "w-1/2 bg-azure-400" : "w-0",
                    )}
                  />
                </span>
                <span className="mt-2 hidden items-center gap-1.5 text-[12px] sm:flex">
                  <span className={cn("font-mono nums", i === step ? "text-azure-300" : done ? "text-ok" : "text-fg-4")}>
                    {done && i !== step ? <Check className="size-3" strokeWidth={3} /> : `0${i + 1}`}
                  </span>
                  <span className={cn("truncate transition-colors", i === step ? "text-fg" : can ? "text-fg-3 group-hover:text-fg-2" : "text-fg-4")}>{s.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const CONSOLE = (game: GameId) => [
  { t: `> paymc connect pk_test_…`, c: "text-fg-2" },
  { t: `[PayMC] Agent 2.4.1 · ${game === "minecraft" ? "Paper 1.21.4" : game === "rust" ? "Oxide 2.0.6" : GAMES[game].platforms[0]}`, c: "text-fg-3" },
  { t: "[PayMC] Соединяемся с gw.paymc.ru:443 …", c: "text-fg-3" },
  { t: "[PayMC] Подключено · рукопожатие 18 мс · очередь пуста", c: "text-ok" },
];

function ConnectConsole({ status, lines, slug, game }: { status: ConnectStatus; lines: number; slug: string; game: GameId }) {
  const rows = CONSOLE(game).slice(0, lines);
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-[#070a10]">
      <div className="flex h-10 items-center justify-between border-b border-line-soft px-3">
        <span className="label-mono text-fg-3">Статус · {slug || "проект"}</span>
        {status === "ok" ? (
          <span className="flex items-center gap-1.5 text-[12.5px] text-ok">
            <Check className="size-3.5" /> Сервер на связи
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[12.5px] text-ice-300">
            <Loader2 className="size-3.5 animate-spin" /> Ждём подключения…
          </span>
        )}
      </div>
      <div className="min-h-[124px] px-3.5 py-3 font-mono text-[12px] leading-[1.75]" aria-live="polite">
        {rows.length === 0 ? <p className="text-fg-4">Выполните команду в консоли — статус обновится сам.</p> : null}
        {rows.map((r) => (
          <p key={r.t} className={cn("animate-fade-up truncate", r.c)}>
            {r.t}
          </p>
        ))}
        {status !== "ok" ? <span className="animate-blink text-fg-4">▌</span> : null}
      </div>
    </div>
  );
}

function TestTrace({ lines, status, command }: { lines: number; status: "idle" | "running" | "done"; command: string }) {
  const steps = [
    { t: "Тестовый платёж", d: "СБП · 0 ₽ списано", ms: "0 мс" },
    { t: "Вебхук принят", d: "подпись проверена", ms: "+31 мс" },
    { t: "Команда у агента", d: "очередь пуста", ms: "+47 мс" },
    { t: "Выполнено на сервере", cmd: command, ms: "+188 мс" },
    { t: "Выдано за 0,3 с", d: "сервер подтвердил выдачу", ms: "+34 мс" },
  ];
  if (status === "idle") {
    return <p className="px-3.5 py-6 text-[13px] text-fg-4">Нажмите «Провести тестовую покупку» — покажем путь заказа до сервера.</p>;
  }
  return (
    <ol className="px-3.5 pt-3 pb-1" aria-live="polite">
      {steps.slice(0, lines).map((s, i) => (
        <li key={s.t} className="relative grid animate-fade-up grid-cols-[18px_1fr_auto] gap-x-2.5 pb-2.5">
          {i < lines - 1 ? <span aria-hidden className="absolute top-[20px] bottom-0 left-[8.5px] w-px bg-line" /> : null}
          <span className="relative z-10 mt-[3px] flex size-[18px] items-center justify-center rounded-full border border-ok/30 bg-ok-soft text-ok">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] leading-6 text-fg">{s.t}</p>
            {s.d ? <p className="-mt-0.5 text-[11.5px] text-fg-3">{s.d}</p> : null}
            {s.cmd ? (
              <div className="mt-1 overflow-hidden rounded-md border border-line-soft bg-black/30 px-2.5 py-1.5 font-mono text-[11.5px]">
                <p className="truncate text-fg-2">
                  <span className="text-fg-4 select-none">$ </span>
                  {s.cmd}
                </p>
                <p className="flex items-center gap-1 truncate text-ice-300/90">
                  <CornerDownRight className="size-3 shrink-0 text-fg-4" /> OK · TestPlayer
                </p>
              </div>
            ) : null}
          </div>
          <span className="pt-[3px] font-mono text-[11px] text-fg-4 nums">{s.ms}</span>
        </li>
      ))}
    </ol>
  );
}

function CheckItem({ done, label, meta, href }: { done?: boolean; label: string; meta?: string; href?: string }) {
  const body = (
    <>
      <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", done ? "border-ok/35 bg-ok-soft text-ok" : "border-line-strong text-fg-4")}>
        {done ? <Check className="size-3" strokeWidth={3} /> : <CircleDashed className="size-3" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[13.5px]", done ? "text-fg" : "text-fg-2")}>{label}</span>
        {meta ? <span className="block truncate text-xs text-fg-3">{meta}</span> : null}
      </span>
      {href ? <ArrowRight className="size-3.5 text-fg-4 transition-transform group-hover:translate-x-0.5" /> : null}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="group flex items-center gap-3 rounded-md border border-dashed border-line px-3 py-2.5 transition-colors hover:border-line-strong">
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5">{body}</div>
      )}
    </li>
  );
}

function Summary({
  step,
  game,
  name,
  slug,
  slugOk,
  connect,
  mode,
  connectorLabel,
  rconLabel,
  products,
  payout,
  tax,
}: {
  step: number;
  game: GameId;
  name: string;
  slug: string;
  slugOk: boolean;
  connect: ConnectStatus;
  mode: "plugin" | "rcon";
  connectorLabel: string;
  rconLabel: string;
  products: number;
  payout: string | null;
  tax: TaxStatus;
}) {
  const rows = [
    { k: "Игра", v: GAMES[game].name, ok: true },
    { k: "Проект", v: name.trim() || "—", ok: !!name.trim() },
    { k: "Адрес", v: slug ? `${slug}.paymc.ru` : "—", ok: !!slug && slugOk, mono: true },
    { k: "Сервер", v: connect === "ok" ? `на связи · ${mode === "plugin" ? connectorLabel.toLowerCase() : rconLabel}` : connect === "waiting" ? "ждём подключения" : "не подключён", ok: connect === "ok" },
    { k: "Товары", v: products ? pluralize(products, ["товар", "товара", "товаров"]) : "—", ok: products > 0 && step >= 2 },
    { k: "Выплаты", v: payout ?? "—", ok: !!payout },
    { k: "Чеки", v: tax === "self" ? "НПД через «Мой налог»" : "касса 54-ФЗ", ok: step >= 3 },
  ];
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 rounded-xl border border-line bg-surface shadow-raise">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <GameChip game={game} size={26} />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium text-fg">{name.trim() || "Новый магазин"}</p>
            <p className="truncate font-mono text-[11px] text-fg-4">{slug ? `${slug}.paymc.ru` : "адрес появится на шаге 1"}</p>
          </div>
        </div>
        <dl className="grid gap-2.5 px-4 py-3.5 text-[12.5px]">
          {rows.map((r) => (
            <div key={r.k} className="grid grid-cols-[72px_minmax(0,1fr)_14px] items-center gap-2">
              <dt className="text-fg-4">{r.k}</dt>
              <dd className={cn("truncate", r.ok ? "text-fg-2" : "text-fg-4", r.mono && "font-mono text-[11.5px]")}>{r.v}</dd>
              {r.ok ? <Check className="size-3 text-ok" strokeWidth={3} /> : <span />}
            </div>
          ))}
        </dl>
        <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-fg-3">
          4,9 % с оборота — эквайринг, чеки, выплаты и выдача включены. От 500 тыс ₽ в месяц ставка снижается сама.
        </p>
      </div>
    </aside>
  );
}
