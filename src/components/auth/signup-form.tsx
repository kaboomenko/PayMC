"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_LIST } from "@/lib/games";
import type { GameId } from "@/lib/mock/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GameChip } from "@/components/dashboard/game-chip";
import { AuthField, PasswordInput, StrengthMeter, authInput, emailError } from "./fields";

const TOP_GAMES = GAME_LIST.slice(0, 8);
const SHORT_NAME: Partial<Record<GameId, string>> = { gta5: "GTA RP", gmod: "Garry’s Mod", cs2: "CS2" };

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [games, setGames] = React.useState<GameId[]>(["minecraft"]);
  const [consent, setConsent] = React.useState(false);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [busy, setBusy] = React.useState(false);

  const nErr = name.trim().length < 2 ? "Как к вам обращаться? Хватит имени" : null;
  const eErr = emailError(email);
  const pErr = password.length < 8 ? "Минимум 8 символов" : null;
  const gErr = games.length === 0 ? "Выберите хотя бы одну игру — подберём плагины и шаблоны" : null;
  const cErr = !consent ? "Без согласия с офертой магазин не создать" : null;
  const show = (k: string, err: string | null) => (touched[k] ? err : null);

  function toggleGame(id: GameId) {
    setGames((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, games: true, consent: true });
    if (nErr || eErr || pErr || gErr || cErr) return;
    setBusy(true);
    window.setTimeout(() => router.push(`/onboarding?game=${games[0]}`), 1000);
  }

  return (
    <div>
      <p className="label-mono text-[10.5px] text-azure-300">Новый магазин</p>
      <h1 className="mt-3 font-display text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] text-fg">Создайте магазин</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-fg-3">
        Около 10&nbsp;минут до первой продажи. Без абонентской платы: 4,9&nbsp;% с оборота, эквайринг и чеки включены.
      </p>

      <form onSubmit={submit} noValidate className="mt-8 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField id="su-name" label="Имя" error={show("name", nErr)}>
            <input
              id="su-name"
              value={name}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name && setTouched((t) => ({ ...t, name: true }))}
              aria-invalid={!!show("name", nErr)}
              aria-describedby={show("name", nErr) ? "su-name-err" : undefined}
              className={authInput}
              placeholder="Артём"
            />
          </AuthField>
          <AuthField id="su-email" label="Email" error={show("email", eErr)}>
            <input
              id="su-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => email && setTouched((t) => ({ ...t, email: true }))}
              aria-invalid={!!show("email", eErr)}
              aria-describedby={show("email", eErr) ? "su-email-err" : undefined}
              className={authInput}
              placeholder="you@arcticmc.ru"
            />
          </AuthField>
        </div>
        <AuthField id="su-password" label="Пароль" error={show("password", pErr)} hint={<StrengthMeter value={password} />}>
          <PasswordInput
            id="su-password"
            value={password}
            onChange={setPassword}
            onBlur={() => password && setTouched((t) => ({ ...t, password: true }))}
            invalid={!!show("password", pErr)}
            autoComplete="new-password"
          />
        </AuthField>

        <fieldset className="grid gap-2">
          <legend className="mb-2 flex w-full items-baseline justify-between text-[13px] font-medium text-fg-2">
            Во что играют на ваших серверах
            <span className="text-xs font-normal text-fg-4">можно несколько</span>
          </legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {TOP_GAMES.map((g) => {
              const on = games.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleGame(g.id)}
                  className={cn(
                    "relative flex flex-col items-start gap-1.5 rounded-md border px-2.5 py-2 text-left text-[12px] font-medium transition-colors",
                    on ? "border-azure-400/60 bg-azure-500/10 text-fg" : "border-line text-fg-3 hover:border-line-strong hover:text-fg-2",
                  )}
                >
                  <GameChip game={g.id} size={22} />
                  <span className="max-w-full truncate">{SHORT_NAME[g.id] ?? g.name}</span>
                  {on ? <Check className="absolute top-2 right-2 size-3 text-azure-300" strokeWidth={3} /> : null}
                </button>
              );
            })}
          </div>
          {show("games", gErr) ? <p className="text-xs text-bad">{gErr}</p> : null}
        </fieldset>

        <div className="grid gap-1.5">
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-fg-2">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              aria-invalid={!!show("consent", cErr)}
              className="mt-0.5"
              aria-label="Согласие с офертой и политикой"
            />
            <span>
              Принимаю{" "}
              <Link href="/legal#offer" target="_blank" rel="noopener" className="text-fg underline underline-offset-2 hover:text-azure-200">
                оферту
              </Link>{" "}
              и{" "}
              <Link href="/legal#privacy" target="_blank" rel="noopener" className="text-fg underline underline-offset-2 hover:text-azure-200">
                политику обработки персональных данных
              </Link>
            </span>
          </label>
          {show("consent", cErr) ? <p className="pl-6.5 text-xs text-bad">{cErr}</p> : null}
        </div>

        <Button type="submit" variant="primary" size="lg" className="mt-1 h-11 w-full" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="animate-spin" /> Создаём магазин…
            </>
          ) : (
            <>
              Создать магазин <ArrowRight />
            </>
          )}
        </Button>
      </form>

      <p className="mt-8 text-[13px] text-fg-3">
        Уже продаёте с PayMC?{" "}
        <Link href="/login" className="font-medium text-fg underline-offset-4 hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
