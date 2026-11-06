import type { Tone } from "@/lib/mock/meta";
import type { CalendarEventKind } from "@/lib/mock/types";

/**
 * Calendar visuals per event kind, not per status tone. Price changes are filled
 * (wipe — ice, sale — azure), context without a price change is outlined (event — white,
 * holiday — dashed), seasons are flat grey. Status colours (ok / warn) stay out of the calendar.
 */
export const kindBar: Record<CalendarEventKind, string> = {
  wipe: "bg-ice-400/14 text-ice-200 ring-1 ring-inset ring-ice-400/30 hover:bg-ice-400/22",
  sale: "bg-azure-500/18 text-azure-200 ring-1 ring-inset ring-azure-400/30 hover:bg-azure-500/26",
  event: "bg-transparent text-fg ring-1 ring-inset ring-white/45 hover:bg-white/[0.06]",
  holiday: "border border-dashed border-fg-3/80 bg-transparent text-fg-2 hover:bg-white/[0.04]",
  season: "bg-white/[0.06] text-fg-2 ring-1 ring-inset ring-line-strong hover:bg-white/[0.09]",
};

/** Swatch for legends and lists — the same fill/outline as the bar, in miniature. */
export const kindSwatch: Record<CalendarEventKind, string> = {
  wipe: "bg-ice-400",
  sale: "bg-azure-400",
  event: "ring-1 ring-inset ring-white/80",
  holiday: "border border-dashed border-fg-2",
  season: "bg-fg-3/70",
};

/** Kraken Rust example wipes: hatched ice, so they never read as the project's own events. */
export const demoBar =
  "bg-[repeating-linear-gradient(135deg,rgb(85_207_255/0.16)_0_3px,transparent_3px_7px)] text-ice-200 ring-1 ring-inset ring-ice-400/35 hover:bg-ice-400/10";
export const demoSwatch = "bg-[repeating-linear-gradient(135deg,rgb(85_207_255/0.6)_0_1.5px,transparent_1.5px_3.5px)] ring-1 ring-inset ring-ice-400/60";

/** Dots for the wipe-cycle list (ice = wipes, neutral = no wipe). */
export const toneDot: Record<Tone, string> = {
  ice: "bg-ice-400",
  azure: "bg-azure-400",
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
  neutral: "bg-fg-3",
};
