"use client";

import { Link2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

/** Telegram first: Discord is blocked in Russia, so notifications default to Telegram. */
export function LinkedAccounts({ name, telegram, discord }: { name: string; telegram?: string; discord?: string }) {
  const sendLink = (service: string) =>
    toast.success(`Ссылка для привязки ${service} отправлена`, {
      description: `${name} увидит её в чате при следующем входе: /link ${service === "Telegram" ? "tg" : "ds"}`,
    });
  return (
    <ul className="divide-y divide-line-soft">
      <li className="flex items-center justify-between gap-3 px-5 py-3">
        <span className="flex min-w-0 items-center gap-3">
          <Send className={telegram ? "size-4 text-ice-300" : "size-4 text-fg-4"} />
          <span className="min-w-0">
            <span className="block text-[13px] text-fg">Telegram</span>
            <span className="block truncate font-mono text-[11.5px] text-fg-3">{telegram ?? "не привязан"}</span>
          </span>
        </span>
        {telegram ? (
          <span className="text-[11.5px] text-ok">уведомления о выдаче</span>
        ) : (
          <Button size="xs" variant="secondary" onClick={() => sendLink("Telegram")}>
            <Link2 /> Пригласить
          </Button>
        )}
      </li>
      <li className="flex items-center justify-between gap-3 px-5 py-3">
        <span className="flex min-w-0 items-center gap-3">
          <MessageCircle className={discord ? "size-4 text-azure-300" : "size-4 text-fg-4"} />
          <span className="min-w-0">
            <span className="block text-[13px] text-fg">Discord</span>
            <span className="block truncate font-mono text-[11.5px] text-fg-3">{discord ?? "не привязан"}</span>
          </span>
        </span>
        {discord ? (
          <span className="text-[11.5px] text-fg-4">только роль на сервере</span>
        ) : (
          <Button size="xs" variant="ghost" onClick={() => sendLink("Discord")}>
            <Link2 /> Пригласить
          </Button>
        )}
      </li>
      <li className="px-5 py-2.5 text-[11.5px] leading-relaxed text-fg-4">Discord в России работает с перебоями — уведомления о покупках по умолчанию уходят в Telegram.</li>
    </ul>
  );
}
