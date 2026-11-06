import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignChannel } from "@/lib/mock/types";
import { channelMeta } from "@/lib/mock/meta";

/* ───────────── Variables ───────────── */

export const KNOWN_VARS = ["player", "product", "discount", "link"] as const;
export type VarKey = (typeof KNOWN_VARS)[number];
export type PreviewVars = Record<VarKey, string>;

export const SAMPLE_VARS: PreviewVars = {
  player: "kotik228",
  product: "Frost",
  discount: "10 %",
  link: "shop.arcticmc.ru/frost",
};

export const VAR_HINTS: Record<VarKey, string> = {
  player: "ник игрока",
  product: "товар из оффера",
  discount: "размер скидки",
  link: "ссылка на оффер",
};

const isKnown = (k: string): k is VarKey => (KNOWN_VARS as readonly string[]).includes(k);

/** Variables in braces that we can't fill: {nick}, {price} … */
export function unknownVars(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\{([^{}\s]*)\}/g)) if (!isKnown(m[1])) out.add(`{${m[1]}}`);
  return [...out];
}

export function fillVars(text: string, vars: PreviewVars) {
  return text.replace(/\{(player|product|discount|link)\}/g, (_, k: VarKey) => vars[k]);
}

/** Renders a template with variables filled in; links underlined, unknown variables flagged. */
export function Filled({ text, vars, linkClassName }: { text: string; vars: PreviewVars; linkClassName?: string }) {
  const parts = text.split(/(\{[^{}\s]*\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\{([^{}\s]*)\}$/.exec(p);
        if (!m) return <React.Fragment key={i}>{p}</React.Fragment>;
        if (m[1] === "link")
          return (
            <span key={i} className={cn("underline decoration-1 underline-offset-2", linkClassName)}>
              {vars.link}
            </span>
          );
        if (isKnown(m[1])) return <React.Fragment key={i}>{vars[m[1]]}</React.Fragment>;
        return (
          <span key={i} className="text-bad underline decoration-wavy decoration-1 underline-offset-2">
            {p}
          </span>
        );
      })}
    </>
  );
}

/* ───────────── Minecraft-like HUD pieces ───────────── */

const mcText = "font-mono text-white [text-shadow:1.5px_1.5px_0_rgb(0_0_0/0.7)]";

export function MinecraftChat({
  message,
  vars,
  prefix = "[ArcticMC]",
  context = true,
  className,
}: {
  message: string;
  vars: PreviewVars;
  prefix?: string;
  /** show a couple of real-looking chat lines before the campaign message */
  context?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[3px] bg-black/55 px-2 py-1.5 text-[12px] leading-[1.5]", mcText, className)}>
      {context ? (
        <>
          <p className="truncate text-fg-2">
            <span className="text-fg-3">&lt;Steve_Pro&gt;</span> кто на спавн? иду в шахту
          </p>
          <p className="truncate text-fg-2">
            <span className="text-fg-3">&lt;d1ma_rust&gt;</span> +, жду у портала
          </p>
        </>
      ) : null}
      <p className="break-words">
        <span className="text-ice-300">{prefix}</span>{" "}
        <Filled text={message} vars={vars} linkClassName="text-ice-200" />
      </p>
    </div>
  );
}

export function BossBar({ text, pct, className }: { text: string; pct: number; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <p className={cn("max-w-full truncate text-center text-[11.5px]", mcText)}>{text}</p>
      <div className="relative h-[6px] w-[min(300px,82%)] bg-azure-950 ring-1 ring-black/70">
        <div className="h-full bg-azure-400" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} aria-hidden className="absolute top-0 h-full w-px bg-black/55" style={{ left: `${(i + 1) * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

export function TitleOverlay({ title, subtitle, className }: { title: string; subtitle?: string; className?: string }) {
  return (
    <div className={cn("px-3 text-center", className)}>
      <p className={cn("text-[clamp(20px,3.6vw,30px)] leading-tight font-bold tracking-[-0.01em] [text-shadow:2.5px_2.5px_0_rgb(0_0_0/0.6)]", mcText)}>
        {title || "Заголовок титра"}
      </p>
      {subtitle ? <p className={cn("mt-1 text-[12.5px] text-ice-200", mcText)}>{subtitle}</p> : null}
    </div>
  );
}

const HOTBAR_ITEMS: (string | null)[] = ["sword", "pick", null, "food", null, null, "block", null, null];

function Hotbar() {
  return (
    <div className="flex items-center gap-px rounded-[2px] bg-black/50 p-px ring-1 ring-black/70">
      {HOTBAR_ITEMS.map((it, i) => (
        <span
          key={i}
          className={cn(
            "relative flex size-[18px] items-center justify-center bg-white/[0.06] ring-1 ring-white/10 sm:size-5",
            i === 0 && "ring-2 ring-white/80",
          )}
        >
          {it === "sword" ? <span className="h-3 w-[3px] rotate-45 bg-ice-300" /> : null}
          {it === "pick" ? <span className="h-[3px] w-3 bg-fg-2 shadow-[0_3px_0_-1px_rgb(124_136_157)]" /> : null}
          {it === "food" ? <span className="size-2 rounded-[1px] bg-warn/80" /> : null}
          {it === "block" ? <span className="size-2.5 bg-azure-300/80 shadow-[inset_0_-3px_0_rgb(13_26_61/0.6)]" /> : null}
        </span>
      ))}
    </div>
  );
}

export function ActionBar({ text, vars }: { text: string; vars: PreviewVars }) {
  return (
    <p className={cn("max-w-full truncate px-2 text-center text-[11.5px] text-ice-200", mcText)}>
      <Filled text={text} vars={vars} />
    </p>
  );
}

/** Snowy pixel hills — ArcticMC is a winter server. Deterministic, crisp edges. */
function PixelLandscape() {
  const cols = 40;
  const back = Array.from({ length: cols }, (_, x) => Math.round(13 + 5 * Math.sin(x / 4.2) + 2 * Math.sin(x / 1.7)));
  const front = Array.from({ length: cols }, (_, x) => Math.round(7 + 3 * Math.sin(x / 3.1 + 2) + 1.5 * Math.cos(x / 1.3)));
  const stars = [
    [12, 4], [31, 9], [58, 3], [77, 12], [96, 6], [118, 2], [133, 10], [149, 5], [22, 15], [104, 16],
  ];
  return (
    <svg viewBox="0 0 160 40" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" shapeRendering="crispEdges" aria-hidden>
      {stars.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={0.8} height={0.8} fill="#edf1f8" opacity={i % 3 === 0 ? 0.55 : 0.28} />
      ))}
      {back.map((h, x) => (
        <g key={`b${x}`}>
          <rect x={x * 4} y={40 - h} width={4} height={h} fill="#162d6a" opacity={0.55} />
          <rect x={x * 4} y={40 - h} width={4} height={1} fill="#b9d4ff" opacity={0.3} />
        </g>
      ))}
      {front.map((h, x) => (
        <g key={`f${x}`}>
          <rect x={x * 4} y={40 - h} width={4} height={h} fill="#1b2231" />
          <rect x={x * 4} y={40 - h} width={4} height={1.4} fill="#edf1f8" opacity={0.6} />
        </g>
      ))}
    </svg>
  );
}

function Placeholder({ channel, onEnable, className }: { channel: CampaignChannel; onEnable?: (c: CampaignChannel) => void; className?: string }) {
  if (!onEnable) return null;
  return (
    <button
      type="button"
      onClick={() => onEnable(channel)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[3px] border border-dashed border-white/20 bg-black/20 px-2 py-1 font-mono text-[10.5px] text-fg-3 transition-colors hover:border-ice-300/60 hover:text-ice-200 focus-visible:outline-ice-300",
        className,
      )}
    >
      <Plus className="size-3" />
      {channelMeta[channel].label} выключен — включить
    </button>
  );
}

export interface GameScreenProps {
  channels: CampaignChannel[];
  message: string;
  title: string;
  subtitle: string;
  bossbarText: string;
  bossbarPct: number;
  vars: PreviewVars;
  onEnable?: (c: CampaignChannel) => void;
  className?: string;
}

/**
 * What the player actually sees: bossbar on top, title in the middle,
 * chat bottom-left, actionbar over the hotbar — one composited game screen.
 */
export function GameScreen({ channels, message, title, subtitle, bossbarText, bossbarPct, vars, onEnable, className }: GameScreenProps) {
  const on = (c: CampaignChannel) => channels.includes(c);
  return (
    <div
      className={cn(
        "relative isolate flex min-h-[340px] flex-col overflow-hidden rounded-lg border border-line-strong bg-[linear-gradient(to_bottom,#05070b,#0e121b_55%,#141a26)] sm:min-h-[380px]",
        className,
      )}
    >
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[46%]">
        <PixelLandscape />
      </div>

      {/* top: bossbar */}
      <div className="flex min-h-12 justify-center px-3 pt-3">
        {on("bossbar") ? (
          <BossBar text={fillVars(bossbarText, vars)} pct={bossbarPct} className="w-full" />
        ) : (
          <Placeholder channel="bossbar" onEnable={onEnable} className="self-start" />
        )}
      </div>

      {/* middle: title + crosshair */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4">
        {on("title") ? (
          <TitleOverlay title={fillVars(title, vars)} subtitle={fillVars(subtitle, vars)} />
        ) : (
          <Placeholder channel="title" onEnable={onEnable} />
        )}
        <span aria-hidden className="relative block size-3 opacity-70">
          <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white" />
          <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-white" />
        </span>
      </div>

      {/* bottom: chat (left) + actionbar/hotbar (center) */}
      <div className="flex flex-col gap-2 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
        <div className="max-w-full sm:max-w-[82%]">
          {on("chat") ? <MinecraftChat message={message} vars={vars} /> : <Placeholder channel="chat" onEnable={onEnable} />}
        </div>
        <div className="flex flex-col items-center gap-1.5">
          {on("actionbar") ? <ActionBar text={message} vars={vars} /> : <Placeholder channel="actionbar" onEnable={onEnable} />}
          <Hotbar />
        </div>
      </div>
    </div>
  );
}

/* ───────────── Messengers ───────────── */

const MESSENGER: Record<"telegram" | "vk" | "discord", { sender: string; button: string; badge: string }> = {
  telegram: { sender: "ArcticMC · бот", button: "Открыть оффер", badge: "Telegram" },
  vk: { sender: "Сообщество ArcticMC", button: "Перейти в магазин", badge: "VK" },
  discord: { sender: "ArcticMC#bot", button: "Открыть оффер", badge: "Discord" },
};

export function MessengerBubble({
  kind,
  message,
  vars,
  time = "18:04",
  note,
  className,
}: {
  kind: "telegram" | "vk" | "discord";
  message: string;
  vars: PreviewVars;
  time?: string;
  note?: React.ReactNode;
  className?: string;
}) {
  const meta = MESSENGER[kind];
  return (
    <div className={cn("rounded-lg border border-line bg-[#080b11] p-3", className)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="label-mono text-[10px] text-fg-4">{meta.badge}</span>
        {note ? <span className="text-[11px] text-fg-4">{note}</span> : null}
      </div>
      <div className="flex items-end gap-2">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-azure-600 font-mono text-[10px] font-semibold text-white ring-1 ring-white/10"
        >
          AM
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "rounded-xl rounded-bl-sm bg-surface-3 px-3 py-2 ring-1 ring-line",
              kind === "discord" && "rounded-md border-l-2 border-azure-400",
            )}
          >
            <p className="text-[12px] font-medium text-ice-300">{meta.sender}</p>
            <p className="mt-0.5 text-[13px] leading-snug break-words text-fg">
              <Filled text={message} vars={vars} linkClassName="text-azure-300" />
            </p>
            <p className="mt-1 text-right font-mono text-[10px] text-fg-4">{time}</p>
          </div>
          <div className="mt-1 rounded-md bg-white/[0.06] py-1.5 text-center text-[12px] font-medium text-fg-2 ring-1 ring-line">
            {meta.button} ↗
          </div>
        </div>
      </div>
    </div>
  );
}
