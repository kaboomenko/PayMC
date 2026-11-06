import { Check, CornerDownRight } from "lucide-react";
import { PixelAvatar } from "@/components/ui/avatar";

const STEPS = [
  { title: "Платёж подтверждён", detail: "СБП · Т-Банк · 299 ₽", ms: "0 мс" },
  { title: "Вебхук принят", detail: "подпись проверена", ms: "+38 мс" },
  { title: "Команда у агента", detail: "Выживание · Paper 1.21.4", ms: "+54 мс" },
  {
    title: "Выполнено на сервере",
    cmd: "lp user kotik228 parent addtemp frost 30d",
    out: "[LP] kotik228 now inherits permissions from frost for 30d.",
    ms: "+246 мс",
  },
  { title: "Выдано за 0,4 с", detail: "сервер подтвердил, чек НПД отправлен", ms: "+62 мс" },
];

const FACTS = [
  { v: "4,9 %", l: "всё включено, без абонентской платы" },
  { v: "12:00", l: "выплата каждый день на карту или СБП" },
  { v: "0,4 с", l: "цель для выдачи игроку онлайн" },
];

/** Right column of the auth screens: a real fragment of the product, not a slogan. */
export function AuthVisual() {
  return (
    <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-surface" />

      <div className="relative flex items-center justify-end">
        <span className="label-mono flex items-center gap-1.5 text-[10px] text-fg-4">
          <span className="size-1.5 rounded-full bg-ok" /> все системы работают
        </span>
      </div>

      <div className="relative mx-auto w-full max-w-[460px]">
        <p className="label-mono text-[10.5px] text-azure-300">Так выглядит каждая покупка</p>
        <div className="mt-3 overflow-hidden rounded-xl border border-line-strong bg-canvas/90 shadow-pop">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <PixelAvatar name="kotik228" size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-fg">
                kotik228 <span className="text-fg-3">купил</span> Frost
              </p>
              <p className="font-mono text-[11px] text-fg-4">PMC-104871 · ArcticMC</p>
            </div>
            <span className="rounded-sm bg-ok-soft px-1.5 py-1 font-mono text-[11px] text-ok">выдано</span>
          </div>
          <ol className="px-4 pt-3.5 pb-2">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="relative grid animate-fade-up grid-cols-[18px_1fr_auto] gap-x-2.5 pb-3"
                style={{ animationDelay: `${180 + i * 140}ms` }}
              >
                {i < STEPS.length - 1 ? <span aria-hidden className="absolute top-[20px] bottom-0 left-[8.5px] w-px bg-line" /> : null}
                <span className="relative z-10 mt-[3px] flex size-[18px] items-center justify-center rounded-full border border-ok/30 bg-ok-soft text-ok">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] leading-6 text-fg">{s.title}</p>
                  {s.detail ? <p className="-mt-0.5 truncate text-[11.5px] text-fg-3">{s.detail}</p> : null}
                  {s.cmd ? (
                    <div className="mt-1 overflow-hidden rounded-md border border-line-soft bg-[#06080c] px-2.5 py-1.5 font-mono text-[11px] leading-[1.6]">
                      <p className="truncate text-fg-2">
                        <span className="text-fg-4 select-none">$ </span>
                        {s.cmd}
                      </p>
                      <p className="flex items-start gap-1 truncate text-ice-300/90">
                        <CornerDownRight className="mt-[3px] size-3 shrink-0 text-fg-4" />
                        <span className="truncate">{s.out}</span>
                      </p>
                    </div>
                  ) : null}
                </div>
                <span className="pt-[3px] font-mono text-[11px] text-fg-4 nums">{s.ms}</span>
              </li>
            ))}
          </ol>
          <div className="border-t border-line bg-[#06080c] px-4 py-2.5 font-mono text-[11.5px]">
            <span className="text-ice-300">[ArcticMC]</span> <span className="text-fg-2">kotik228 поддержал сервер: Frost. Спасибо!</span>
          </div>
        </div>
      </div>

      <dl className="relative grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {FACTS.map((f) => (
          <div key={f.v} className="bg-surface/95 p-4">
            <dt className="font-mono text-[20px] font-medium tracking-[-0.02em] text-fg nums">{f.v}</dt>
            <dd className="mt-1 text-[12px] leading-snug text-fg-3">{f.l}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
