import type { Tone } from "@/lib/mock/meta";

/** Calendar bars / event chips per tone (ice = wipe, azure = sale, ok = event, warn = holiday, neutral = season). */
export const toneBar: Record<Tone, string> = {
  ice: "bg-ice-400/14 text-ice-200 ring-ice-400/30 hover:bg-ice-400/22",
  azure: "bg-azure-500/18 text-azure-200 ring-azure-400/30 hover:bg-azure-500/26",
  ok: "bg-ok/12 text-ok ring-ok/25 hover:bg-ok/18",
  warn: "bg-warn/12 text-warn ring-warn/25 hover:bg-warn/18",
  bad: "bg-bad/12 text-bad ring-bad/25 hover:bg-bad/18",
  neutral: "bg-white/[0.06] text-fg-2 ring-line-strong hover:bg-white/[0.09]",
};

export const toneDot: Record<Tone, string> = {
  ice: "bg-ice-400",
  azure: "bg-azure-400",
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
  neutral: "bg-fg-3",
};

export const toneText: Record<Tone, string> = {
  ice: "text-ice-300",
  azure: "text-azure-300",
  ok: "text-ok",
  warn: "text-warn",
  bad: "text-bad",
  neutral: "text-fg-2",
};
