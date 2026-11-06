"use client";

import * as React from "react";
import { Bot, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import { NOW_MS } from "@/lib/mock/now";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Textarea } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { formatExact } from "@/components/dashboard/orders/format";

export interface PlayerNote {
  id: string;
  author: string | null; // null = PayMC (automatic)
  role?: string;
  text: string;
  at: string;
}

let noteSeq = 0;

export function PlayerNotes({ initial, me }: { initial: PlayerNote[]; me: string }) {
  const [notes, setNotes] = React.useState(initial);
  const [text, setText] = React.useState("");
  const add = () => {
    const value = text.trim();
    if (!value) return;
    noteSeq += 1;
    setNotes((n) => [{ id: `note-new-${noteSeq}`, author: me, role: "Владелец", text: value, at: new Date(NOW_MS).toISOString() }, ...n]);
    setText("");
  };
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="border-b border-line-soft px-5 py-4"
      >
        <label htmlFor="player-note" className="sr-only">
          Заметка об игроке
        </label>
        <Textarea
          id="player-note"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              add();
            }
          }}
          rows={2}
          placeholder="Заметка для команды: договорились о компенсации, просил не писать в Telegram…"
          className="min-h-16 text-[13px]"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1 text-[11px] text-fg-4">
            <Kbd>Ctrl</Kbd>
            <Kbd>
              <CornerDownLeft className="size-3" />
            </Kbd>
            <span className="ml-1">видят все, у кого есть доступ к игрокам</span>
          </p>
          <Button type="submit" size="xs" variant="secondary" disabled={!text.trim()}>
            Добавить
          </Button>
        </div>
      </form>
      <ol className="px-5 py-4">
        {notes.map((n, i) => (
          <li key={n.id} className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 pb-4 last:pb-0">
            {i < notes.length - 1 ? <span aria-hidden className="absolute top-7 bottom-1 left-[11.5px] w-px bg-line-soft" /> : null}
            {n.author ? (
              <Avatar name={n.author} size={24} />
            ) : (
              <span className="flex size-6 items-center justify-center rounded-full border border-line bg-surface-3 text-fg-3">
                <Bot className="size-3.5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2 text-[12px]">
                <span className={cn("font-medium", n.author ? "text-fg" : "text-fg-2")}>{n.author ?? "PayMC"}</span>
                {n.role ? <span className="text-fg-4">{n.role}</span> : null}
                <Tooltip content={formatExact(n.at)}>
                  <span className="text-fg-4 nums">{formatRelative(n.at, NOW_MS)}</span>
                </Tooltip>
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed whitespace-pre-line text-fg-2">{n.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
