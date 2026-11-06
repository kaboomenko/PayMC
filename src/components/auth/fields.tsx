"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2, MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBase } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailError(v: string) {
  if (!v.trim()) return "Укажите email";
  if (!EMAIL_RE.test(v.trim())) return "Похоже, в адресе опечатка";
  return null;
}

/** Labelled field with inline error and an optional slot on the right of the label. */
export function AuthField({
  id,
  label,
  error,
  hint,
  aside,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  hint?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-fg-2">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-xs text-bad">
          {error}
        </p>
      ) : hint ? (
        <div className="text-xs text-fg-3">{hint}</div>
      ) : null}
    </div>
  );
}

export const authInput = cn(inputBase, "h-10 px-3 text-[14px]");

export function PasswordInput({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  autoComplete: "current-password" | "new-password";
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-err` : undefined}
        className={cn(authInput, "pr-11", !show && value && "tracking-[0.12em]")}
        placeholder="Не меньше 8 символов"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Скрыть пароль" : "Показать пароль"}
        aria-pressed={show}
        className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/** 0–4: length 8+, length 12+, letters+digits, mixed case or a symbol. */
export function passwordScore(v: string) {
  let s = 0;
  if (v.length >= 8) s++;
  if (v.length >= 12) s++;
  if (/[a-zа-я]/i.test(v) && /\d/.test(v)) s++;
  if ((/[a-zа-я]/.test(v) && /[A-ZА-Я]/.test(v)) || /[^a-zа-я0-9]/i.test(v)) s++;
  return v.length < 8 ? Math.min(s, 1) : s;
}

const LEVELS = [
  { label: "слишком короткий", tone: "bg-bad", text: "text-bad" },
  { label: "слабый", tone: "bg-bad", text: "text-bad" },
  { label: "так себе", tone: "bg-warn", text: "text-warn" },
  { label: "хороший", tone: "bg-azure-400", text: "text-azure-300" },
  { label: "надёжный", tone: "bg-ok", text: "text-ok" },
];

export function StrengthMeter({ value }: { value: string }) {
  const score = passwordScore(value);
  const lvl = LEVELS[score];
  const tip =
    value.length < 8
      ? `Ещё ${8 - value.length} — минимум 8 символов`
      : value.length < 12
        ? "12+ символов — заметно надёжнее"
        : !/\d/.test(value)
          ? "Добавьте цифру"
          : score < 4
            ? "Добавьте заглавную букву или символ"
            : "Отлично — такой пароль не подобрать";
  return (
    <div className="mt-0.5" aria-live="polite">
      <div className="grid grid-cols-4 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-1 rounded-full transition-colors duration-200", value && score >= i ? lvl.tone : "bg-white/[0.08]")} />
        ))}
      </div>
      {value ? (
        <p className="mt-1.5 flex justify-between gap-2 text-xs">
          <span className={lvl.text}>Пароль {lvl.label}</span>
          <span className="text-fg-3">{tip}</span>
        </p>
      ) : null}
    </div>
  );
}

export function SocialButtons({ busy, onPick, verb }: { busy: string | null; onPick: (p: "telegram" | "vk") => void; verb: string }) {
  return (
    <div className="grid gap-2">
      <div className="grid gap-2 min-[440px]:grid-cols-2">
        <Button variant="secondary" size="lg" className="h-10 text-[13.5px]" disabled={!!busy} onClick={() => onPick("telegram")}>
          {busy === "telegram" ? <Loader2 className="animate-spin" /> : <Send />}
          {verb} через Telegram
        </Button>
        <Button variant="secondary" size="lg" className="h-10 text-[13.5px]" disabled={!!busy} onClick={() => onPick("vk")}>
          {busy === "vk" ? <Loader2 className="animate-spin" /> : <MessageCircle />}
          {verb} через VK
        </Button>
      </div>
      <Button variant="outline" size="lg" className="h-10 justify-between border-dashed text-[13.5px] text-fg-3" disabled>
        <span>Steam</span>
        <span className="label-mono text-[10px]">скоро</span>
      </Button>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-fg-4" role="separator">
      <span className="h-px flex-1 bg-line" />
      или
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
