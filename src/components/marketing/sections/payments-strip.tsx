/**
 * Compact strip right under the hero: which payment rails players can use today
 * and which ones are next. No heading — one quiet line with hairlines.
 */
const LIVE = ["СБП", "Мир", "SberPay", "T-Pay", "ЮMoney", "Баланс телефона"];
const SOON = ["Kaspi", "ЕРИП", "зарубежные карты"];

export function PaymentsStrip() {
  return (
    <section aria-label="Способы оплаты" className="relative border-y border-line-soft bg-surface/40">
      <div className="container-page flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:gap-6">
        <p className="flex shrink-0 items-center gap-2 text-[13px] text-fg-2">
          <span className="relative flex size-1.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-40 motion-reduce:hidden" />
            <span className="relative inline-flex size-1.5 rounded-full bg-ok" />
          </span>
          Игроки платят так, как привыкли
        </p>

        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Работают сейчас">
          {LIVE.map((m) => (
            <li
              key={m}
              className="inline-flex h-7 items-center rounded-md border border-line bg-surface-2/70 px-2.5 font-mono text-[12px] text-fg-2"
            >
              {m}
            </li>
          ))}
        </ul>

        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[12px] text-fg-4 lg:ml-auto">
          <span>скоро:</span>
          {SOON.map((m, i) => (
            <span key={m}>
              {m}
              {i < SOON.length - 1 ? "," : ""}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
