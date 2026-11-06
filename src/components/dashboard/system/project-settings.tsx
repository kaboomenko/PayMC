"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Check, CircleAlert, FlaskConical, Globe, Lock, PauseCircle, RotateCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatDateShort, formatTime } from "@/lib/format";
import { DAY, NOW_MS } from "@/lib/mock/now";
import type { GameId } from "@/lib/mock/types";
import { GameChip } from "@/components/dashboard/game-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, inputBase } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { Note, SaveBar, SettingRow, SettingsSection, useSaveShortcut } from "./settings-ui";
import type { ProjectInfo } from "./settings-types";

type OwnerStatus = "self_employed" | "ip" | "ooo";

interface Form {
  name: string;
  slug: string;
  game: GameId;
  tz: string;
  lang: string;
  status: OwnerStatus;
  inn: string;
}

/** ИНН check digits: 10 digits for companies, 12 for individuals / ИП / самозанятых. */
function innError(inn: string, status: OwnerStatus): string | null {
  const d = inn.replace(/\D/g, "");
  const need = status === "ooo" ? 10 : 12;
  if (d.length !== need) return `ИНН ${status === "ooo" ? "организации" : "физлица"} — ${need} цифр, сейчас ${d.length}`;
  const n = d.split("").map(Number);
  const check = (w: number[]) => (w.reduce((a, k, i) => a + k * n[i], 0) % 11) % 10;
  if (need === 10) return check([2, 4, 10, 3, 5, 9, 4, 6, 8]) === n[9] ? null : "Контрольная цифра не сходится — проверьте ИНН";
  const ok = check([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === n[10] && check([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === n[11];
  return ok ? null : "Контрольные цифры не сходятся — проверьте ИНН";
}

function slugError(slug: string) {
  if (slug.length < 3) return "Минимум 3 символа";
  if (slug.length > 32) return "Максимум 32 символа";
  if (!/^[a-z0-9-]+$/.test(slug)) return "Только латиница в нижнем регистре, цифры и дефис";
  if (slug.startsWith("-") || slug.endsWith("-")) return "Дефис не может быть первым или последним";
  if (["admin", "api", "www", "paymc", "shop"].includes(slug)) return "Этот адрес зарезервирован";
  return null;
}

const TEST_TOKENS = ["PMC-7F2K", "PMC-Q4M9", "PMC-X2C7", "PMC-H8T3"];

const TIMEZONES = [
  { value: "msk", label: "Москва · UTC+3" },
  { value: "kgd", label: "Калининград · UTC+2" },
  { value: "ekb", label: "Екатеринбург · UTC+5" },
  { value: "nsk", label: "Новосибирск · UTC+7" },
  { value: "ala", label: "Алматы · UTC+5" },
];

export function ProjectSettings({ project }: { project: ProjectInfo }) {
  const initial = React.useMemo<Form>(
    () => ({ name: project.name, slug: project.slug, game: project.game, tz: "msk", lang: "ru", status: "self_employed", inn: "770712345633" }),
    [project],
  );
  const [saved, setSaved] = React.useState<Form>(initial);
  const [form, setForm] = React.useState<Form>(initial);
  const [testSeq, setTestSeq] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Test payments live behind a private 24-hour link for the team, never as a store-wide switch:
  // a global «no charge» mode would hand real items to every player online.
  const storeHost = project.domain ?? `${saved.slug}.paymc.ru`;
  const testToken = TEST_TOKENS[testSeq % TEST_TOKENS.length];
  const testUntil = NOW_MS + DAY;

  function rotateTestLink() {
    const prev = testSeq;
    setTestSeq((n) => n + 1);
    toast.success("Тестовая ссылка перевыпущена", {
      description: "Старая перестала работать, новая действует 24 часа",
      action: { label: "Отменить", onClick: () => setTestSeq(prev) },
    });
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const errors = {
    name: form.name.trim().length < 2 ? "Название не может быть короче 2 символов" : null,
    slug: slugError(form.slug),
    inn: innError(form.inn, form.status),
  };
  const valid = !errors.name && !errors.slug && !errors.inn;

  function save() {
    if (!valid || !dirty) return;
    const prev = saved;
    setSaved(form);
    toast.success("Настройки проекта сохранены", {
      description: form.slug !== prev.slug ? `Витрина теперь на ${form.slug}.paymc.ru — старый адрес перенаправляет 30 дней` : undefined,
      action: { label: "Отменить", onClick: () => (setSaved(prev), setForm(prev)) },
    });
  }
  useSaveShortcut(dirty && valid, save);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <SettingsSection title="Основное" description="Как проект называется и где живёт витрина.">
          <SettingRow
            title="Название проекта"
            htmlFor="p-name"
            description="Видно игрокам на витрине, в чеках и в сообщениях бота."
            control={
              <div className="w-full sm:w-72">
                <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} />
                {errors.name ? <p className="mt-1 text-xs text-bad">{errors.name}</p> : null}
              </div>
            }
          />
          <SettingRow
            title="Адрес витрины"
            htmlFor="p-slug"
            description="Старый адрес продолжит работать как редирект ещё 30 дней после смены."
            control={
              <div className="w-full sm:w-72">
                <div className="relative flex">
                  <input
                    id="p-slug"
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value.toLowerCase().trim())}
                    aria-invalid={!!errors.slug}
                    aria-describedby="p-slug-msg"
                    spellCheck={false}
                    className={cn(inputBase, "h-9 rounded-r-none pr-2 pl-3 font-mono text-[13px]")}
                  />
                  <span className="flex h-9 shrink-0 items-center rounded-r-md border border-l-0 border-line bg-surface-3 px-2.5 font-mono text-[12.5px] text-fg-3">
                    .paymc.ru
                  </span>
                </div>
                <p id="p-slug-msg" className={cn("mt-1 text-xs", errors.slug ? "text-bad" : "text-fg-3")}>
                  {errors.slug ?? (
                    <span className="flex items-center gap-1">
                      <Check className="size-3 text-ok" />
                      {form.slug === saved.slug ? "Текущий адрес" : "Свободен"}
                    </span>
                  )}
                </p>
              </div>
            }
          />
          <SettingRow
            title="Свой домен"
            description="Игроки видят ваш адрес, SSL-сертификат выпускаем и продлеваем сами."
            control={
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[13px] text-fg">{project.domain ?? "не подключён"}</span>
                {project.domain ? (
                  <>
                    <Badge tone="ok">
                      <Check />
                      CNAME
                    </Badge>
                    <Badge tone="ok">
                      <Lock />
                      SSL до 4 фев
                    </Badge>
                  </>
                ) : null}
              </div>
            }
          >
            {project.domain ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-line-soft bg-[#070a10] py-1 pr-1 pl-3 font-mono text-[12px]">
                <span className="min-w-0 truncate text-fg-3">
                  <span className="text-fg-4">CNAME</span> <span className="text-fg-2">shop</span> <span className="text-fg-4">→</span>{" "}
                  <span className="text-ice-300">{form.slug}.paymc.ru</span>
                </span>
                <CopyButton value={`${form.slug}.paymc.ru`} label="Скопировать значение CNAME" />
              </div>
            ) : null}
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="Игра и регион" description="Влияет на команды выдачи, переменные и формат времени в отчётах.">
          <SettingRow
            title="Игра"
            htmlFor="p-game"
            description="Определяет библиотеку команд и идентификатор игрока: для Minecraft — UUID."
            control={
              <div className="w-full sm:w-72">
                <Select value={form.game} onValueChange={(v) => set("game", v as GameId)}>
                  <SelectTrigger id="p-game">
                    <span className="flex items-center gap-2">
                      <GameChip game={form.game} size={18} />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {project.games.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          />
          <SettingRow
            title="Часовой пояс"
            htmlFor="p-tz"
            description="Для отчётов, сводки дня и расписания акций. Выплаты всегда в 12:00 МСК."
            control={
              <div className="w-full sm:w-72">
                <Select value={form.tz} onValueChange={(v) => set("tz", v)}>
                  <SelectTrigger id="p-tz">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          />
          <SettingRow
            title="Язык витрины"
            htmlFor="p-lang"
            description="Кабинет остаётся на русском."
            control={
              <div className="w-full sm:w-72">
                <Select value={form.lang} onValueChange={(v) => set("lang", v)}>
                  <SelectTrigger id="p-lang">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="kk" disabled>
                      Қазақша — скоро
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
          <SettingRow
            title="Валюта витрины"
            description="Цены и чеки в рублях. Тенге и белорусские рубли появятся вместе с Kaspi и ЕРИП."
            control={
              <div role="radiogroup" aria-label="Валюта" className="inline-flex gap-1">
                <span role="radio" aria-checked className="flex h-8 items-center gap-1.5 rounded-md border border-azure-500/60 bg-azure-500/10 px-3 font-mono text-[13px] text-fg">
                  ₽ <span className="text-[11px] text-fg-3">RUB</span>
                </span>
                {["₸", "Br"].map((c) => (
                  <span key={c} role="radio" aria-checked={false} aria-disabled className="flex h-8 items-center gap-1.5 rounded-md border border-line-soft px-3 font-mono text-[13px] text-fg-4">
                    {c} <span className="text-[11px]">скоро</span>
                  </span>
                ))}
              </div>
            }
          />
        </SettingsSection>

        <SettingsSection title="Юридические данные" description="Нужны для чеков и отчёта агента. Видны только владельцу и бухгалтеру.">
          <SettingRow
            title="Статус владельца"
            description={
              form.status === "self_employed"
                ? "Чеки самозанятого уходят в «Мой налог» через партнёрский доступ — без вашего участия."
                : "Чеки по 54-ФЗ — через облачную кассу PayMC, оборудование не нужно."
            }
            control={
              <div role="radiogroup" aria-label="Статус владельца" className="inline-flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
                {(
                  [
                    ["self_employed", "Самозанятый"],
                    ["ip", "ИП"],
                    ["ooo", "ООО"],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={form.status === v}
                    onClick={() => set("status", v)}
                    className={cn(
                      "h-7 rounded-md px-2.5 text-[12.5px] font-medium transition-colors",
                      form.status === v ? "bg-surface-4 text-fg shadow-raise" : "text-fg-3 hover:text-fg-2",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            }
          />
          <SettingRow
            title="ИНН"
            htmlFor="p-inn"
            description="Проверяем контрольные цифры сразу, до отправки в ФНС."
            control={
              <div className="w-full sm:w-72">
                <Input
                  id="p-inn"
                  inputMode="numeric"
                  value={form.inn}
                  onChange={(e) => set("inn", e.target.value.replace(/\D/g, "").slice(0, 12))}
                  aria-invalid={!!errors.inn}
                  className="font-mono tracking-[0.06em]"
                />
                <p className={cn("mt-1 flex items-center gap-1 text-xs", errors.inn ? "text-bad" : "text-fg-3")}>
                  {errors.inn ? (
                    <>
                      <CircleAlert className="size-3" />
                      {errors.inn}
                    </>
                  ) : (
                    <>
                      <Check className="size-3 text-ok" />
                      ИНН корректен · статус НПД подтверждён ФНС
                    </>
                  )}
                </p>
              </div>
            }
          />
        </SettingsSection>

        <SettingsSection title="Опасная зона" tone="danger">
          <SettingRow
            title="Приостановить магазин"
            description="Витрина покажет «технические работы», оплата и выдача остановятся. Уже оплаченные заказы будут выданы."
            control={
              <Switch
                checked={paused}
                onCheckedChange={(v) => {
                  setPaused(v);
                  toast(v ? "Магазин приостановлен" : "Магазин снова открыт", {
                    description: v ? "Игроки видят страницу техработ" : "Оплата и выдача работают",
                    action: { label: "Отменить", onClick: () => setPaused(!v) },
                  });
                }}
                aria-label="Приостановить магазин"
              />
            }
          />
          <SettingRow
            title="Удалить проект"
            description="Доступно после последней выплаты и закрытия отчётного периода. Чеки и отчёты агента храним 5 лет — по закону."
            control={
              <Button variant="danger-ghost" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Удалить
              </Button>
            }
          />
        </SettingsSection>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <section className="rounded-xl border border-line bg-surface shadow-raise">
          <div className="px-5 pt-4">
            <p className="flex items-center gap-1.5 label-mono text-fg-3">
              <FlaskConical className="size-3.5" />
              Тестовые платежи
            </p>
            <h2 className="mt-1.5 text-sm font-semibold text-fg">Проверьте магазин без денег</h2>
          </div>
          <p className="px-5 pt-2 text-[12.5px] leading-relaxed text-fg-3">
            Игроки на витрине платят как обычно — тестовые заказы проходят только по этой ссылке, для команды. Деньги не списываются, а команды выдачи
            выполняются на сервере по-настоящему: проверяйте на своём нике. Тестовые заказы не попадают в выплаты, чеки и аналитику.
          </p>
          <div className="mx-5 mt-3 rounded-lg border border-line-soft bg-surface-2/60 px-3 py-2.5">
            <p className="label-mono text-fg-4">Тестовая ссылка</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-mono text-[12.5px] text-fg-2">
                {storeHost}/?test=<span className="text-ice-300">{testToken}</span>
              </span>
              <CopyButton value={`https://${storeHost}/?test=${testToken}`} label="Скопировать тестовую ссылку" />
            </div>
            <p className="font-mono text-[11.5px] text-fg-4">
              действует до {formatDateShort(testUntil)}, {formatTime(testUntil)} · откроется только у вошедших в кабинет
            </p>
          </div>
          <div className="mx-5 mt-2 rounded-lg border border-line-soft bg-surface-2/60 px-3 py-2.5">
            <p className="label-mono text-fg-4">Тестовая карта</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-[13px] tracking-[0.08em] text-fg-2">2200 0000 0000 0053</span>
              <CopyButton value="2200000000000053" label="Скопировать номер тестовой карты" />
            </div>
            <p className="font-mono text-[11.5px] text-fg-4">любой срок · CVC 000 · 3-D Secure код 1234</p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line-soft px-5 py-2.5">
            <span className="text-[12px] text-fg-4">Ссылка утекла?</span>
            <Button variant="ghost" size="xs" onClick={rotateTestLink}>
              <RotateCw />
              Новая ссылка
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface px-5 py-4 shadow-raise">
          <p className="label-mono text-fg-3">Витрина</p>
          <div className="mt-2 flex items-center gap-2">
            <Globe className="size-4 shrink-0 text-fg-3" />
            <span className="min-w-0 truncate font-mono text-[13px] text-fg">{project.domain ?? `${saved.slug}.paymc.ru`}</span>
            <CopyButton value={`https://${project.domain ?? `${saved.slug}.paymc.ru`}`} label="Скопировать адрес витрины" className="ml-auto" />
          </div>
          <p className="mt-1 font-mono text-[11.5px] text-fg-4">{saved.slug}.paymc.ru · создан {formatDate(project.createdAt)}</p>
          <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
            <Link href={`/s/${project.slug}`}>
              Открыть витрину
              <ArrowUpRight />
            </Link>
          </Button>
        </section>

        {paused ? (
          <Note tone="warn" icon={<PauseCircle />}>
            Магазин на паузе с этой минуты. Онлайн-игроки увидят сообщение в чате, если включена кампания «Спасибо в чате».
          </Note>
        ) : null}
      </aside>

      <SaveBar open={dirty} message={valid ? "Есть несохранённые изменения" : "Исправьте ошибки в полях, чтобы сохранить"} onReset={() => setForm(saved)} onSave={save} saveDisabled={!valid} />

      <DeleteProjectDialog open={deleteOpen} onOpenChange={setDeleteOpen} name={saved.name} />
    </div>
  );
}

function DeleteProjectDialog({ open, onOpenChange, name }: { open: boolean; onOpenChange: (v: boolean) => void; name: string }) {
  const [value, setValue] = React.useState("");
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setValue("");
  }
  const match = value.trim() === name;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Удалить «{name}»?</DialogTitle>
          <DialogDescription>
            Сейчас удалить нельзя: сегодняшняя выплата ещё в пути, а ноябрьский отчётный период закроется 1&nbsp;декабря. Подтвердите — и проект удалится
            сам после закрытия периода.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Note tone="bad" icon={<CircleAlert />}>
            Витрина, товары, команды выдачи и история игроков удалятся без возможности восстановления. Активные привилегии на серверах останутся.
          </Note>
          <div>
            <label htmlFor="del-confirm" className="text-[13px] text-fg-2">
              Введите <span className="font-mono text-fg">{name}</span>, чтобы подтвердить
            </label>
            <Input id="del-confirm" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1.5 font-mono" autoComplete="off" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={!match}
            onClick={() => {
              onOpenChange(false);
              toast.error("Удаление запланировано на 1 декабря", { description: "Дождёмся последней выплаты и отчёта агента за ноябрь, затем удалим" });
            }}
          >
            Удалить 1 декабря
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
