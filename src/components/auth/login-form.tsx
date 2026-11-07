"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { AuthField, OrDivider, PasswordInput, SocialButtons, authInput, emailError } from "./fields";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [touched, setTouched] = React.useState<{ email?: boolean; password?: boolean }>({});
  const [busy, setBusy] = React.useState<string | null>(null);
  const [resetError, setResetError] = React.useState<string | null>(null);

  const eErr = emailError(email);
  const pErr = !password ? "Введите пароль" : password.length < 8 ? "В пароле минимум 8 символов" : null;

  function go(provider: string) {
    setBusy(provider);
    window.setTimeout(() => router.push("/dashboard"), 900);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setResetError(null);
    if (eErr || pErr) return;
    go("email");
  }

  function forgot() {
    if (eErr) {
      setTouched((t) => ({ ...t, email: true }));
      setResetError("Укажите email — пришлём ссылку для сброса");
      return;
    }
    setResetError(null);
    toast.success("Ссылка для сброса отправлена", { description: `${email.trim()} · действует 30 минут` });
  }

  return (
    <div>
      <p className="label-mono text-fg-3">Кабинет владельца</p>
      <h1 className="mt-3 font-display text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] text-fg">Вход в кабинет</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-fg-3">Пока вас не было, магазин продавал. Заказы, выплаты и сбои выдачи — в кабинете.</p>

      <form onSubmit={submit} noValidate className="mt-8 grid gap-4">
        <AuthField id="login-email" label="Email" error={(touched.email && eErr) || resetError}>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setResetError(null);
            }}
            onBlur={() => email && setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={!!((touched.email && eErr) || resetError)}
            aria-describedby={(touched.email && eErr) || resetError ? "login-email-err" : undefined}
            className={authInput}
            placeholder="you@arcticmc.ru"
          />
        </AuthField>
        <AuthField
          id="login-password"
          label="Пароль"
          error={touched.password ? pErr : null}
          aside={
            <button type="button" onClick={forgot} className="text-xs text-azure-300 transition-colors hover:text-azure-200">
              Забыли пароль?
            </button>
          }
        >
          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
            onBlur={() => password && setTouched((t) => ({ ...t, password: true }))}
            invalid={!!(touched.password && pErr)}
            autoComplete="current-password"
          />
        </AuthField>
        <Button type="submit" variant="primary" size="lg" className="mt-1 h-11 w-full" disabled={!!busy}>
          {busy === "email" ? (
            <>
              <Loader2 className="animate-spin" /> Входим…
            </>
          ) : (
            <>
              Войти <ArrowRight />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 grid gap-4">
        <OrDivider />
        <SocialButtons busy={busy === "email" ? null : busy} onPick={go} verb="Войти" />
      </div>

      <p className="mt-8 text-[13px] text-fg-3">
        Ещё нет магазина?{" "}
        <Link href="/signup" className="font-medium text-fg underline-offset-4 hover:underline">
          Создать за 10&nbsp;минут
        </Link>
      </p>
    </div>
  );
}
