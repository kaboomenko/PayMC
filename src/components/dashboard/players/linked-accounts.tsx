"use client";

import type { LucideIcon } from "lucide-react";
import { Link2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

/**
 * Channels that work in Russia: Telegram first, VK second. Discord is blocked
 * in Russia — an old Discord link is mentioned, but nothing is sent there.
 */
export function LinkedAccounts({ name, telegram, vk, discord }: { name: string; telegram?: string; vk?: string; discord?: string }) {
  const invite = (service: "Telegram" | "ВКонтакте", command: string, via: string) =>
    toast.success(`Ссылка для привязки ${service} отправлена`, {
      description: `${name} увидит её в игровом чате при следующем входе: /link ${command} — ${via}`,
    });
  return (
    <ul className="divide-y divide-line-soft">
      <Channel
        icon={Send}
        label="Telegram"
        handle={telegram}
        linkedNote="уведомления о выдаче"
        primary
        onInvite={() => invite("Telegram", "tg", "откроет бота PayMC в Telegram")}
      />
      <Channel
        icon={MessageCircle}
        label="ВКонтакте"
        handle={vk}
        linkedNote={telegram ? "запасной канал" : "уведомления о выдаче"}
        primary={!telegram}
        onInvite={() => invite("ВКонтакте", "vk", "откроет бота PayMC во ВКонтакте")}
      />
      <li className="px-5 py-2.5 text-[11.5px] leading-relaxed text-fg-4">
        {discord ? (
          <>
            Discord <span className="font-mono text-fg-3">{discord}</span> тоже привязан, но заблокирован в России — уведомления уходят в Telegram или VK.
          </>
        ) : (
          "Discord заблокирован в России — уведомления о покупках уходят в Telegram или VK."
        )}
      </li>
    </ul>
  );
}

function Channel({
  icon: Icon,
  label,
  handle,
  linkedNote,
  primary = false,
  onInvite,
}: {
  icon: LucideIcon;
  label: string;
  handle?: string;
  linkedNote: string;
  /** the channel delivery notifications go to */
  primary?: boolean;
  onInvite: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <span className="flex min-w-0 items-center gap-3">
        <Icon className={cn("size-4 shrink-0", handle ? "text-ice-300" : "text-fg-4")} />
        <span className="min-w-0">
          <span className="block text-[13px] text-fg">{label}</span>
          <span className="block truncate font-mono text-[11.5px] text-fg-3">{handle ?? "не привязан"}</span>
        </span>
      </span>
      {handle ? (
        <span className={cn("shrink-0 text-[11.5px]", primary ? "text-ok" : "text-fg-3")}>{linkedNote}</span>
      ) : (
        <Button size="xs" variant="secondary" onClick={onInvite} aria-label={`Отправить игроку ссылку для привязки ${label}`}>
          <Link2 /> Пригласить
        </Button>
      )}
    </li>
  );
}
