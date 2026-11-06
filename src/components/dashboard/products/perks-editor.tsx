"use client";

import * as React from "react";
import { Reorder, useDragControls } from "motion/react";
import { ArrowDown, ArrowUp, GripVertical, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface Perk {
  id: string;
  text: string;
}

const MAX_PERKS = 8;

export function PerksEditor({
  perks,
  onChange,
  flagged,
  newId,
}: {
  perks: Perk[];
  onChange: (perks: Perk[]) => void;
  /** indexes flagged by the rules check */
  flagged: Set<number>;
  newId: () => string;
}) {
  const refs = React.useRef(new Map<string, HTMLInputElement>());
  const [focusId, setFocusId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!focusId) return;
    refs.current.get(focusId)?.focus();
  }, [focusId, perks]);

  const add = (after?: number) => {
    if (perks.length >= MAX_PERKS) return;
    const p = { id: newId(), text: "" };
    const next = [...perks];
    next.splice(after === undefined ? next.length : after + 1, 0, p);
    onChange(next);
    setFocusId(p.id);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= perks.length) return;
    const next = [...perks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      {perks.length ? (
        <Reorder.Group axis="y" values={perks} onReorder={onChange} className="space-y-1.5">
          {perks.map((p, i) => (
            <PerkRow
              key={p.id}
              perk={p}
              index={i}
              count={perks.length}
              flagged={flagged.has(i)}
              inputRef={(el) => {
                if (el) refs.current.set(p.id, el);
                else refs.current.delete(p.id);
              }}
              onText={(text) => onChange(perks.map((x) => (x.id === p.id ? { ...x, text } : x)))}
              onRemove={() => onChange(perks.filter((x) => x.id !== p.id))}
              onEnter={() => add(i)}
              onMove={(dir) => move(i, dir)}
            />
          ))}
        </Reorder.Group>
      ) : (
        <p className="rounded-md border border-dashed border-line-strong px-3 py-3 text-[12.5px] text-fg-3">
          Перки — это строки с галочками на карточке. Пишите, что игрок получит: «Префикс [Frost]», «Питомец на выбор».
        </p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <Button variant="ghost" size="xs" onClick={() => add()} disabled={perks.length >= MAX_PERKS}>
          <Plus /> Добавить пункт
        </Button>
        <span className="font-mono text-[11px] text-fg-4 nums">
          {perks.length} / {MAX_PERKS}
        </span>
      </div>
    </div>
  );
}

function PerkRow({
  perk,
  index,
  count,
  flagged,
  inputRef,
  onText,
  onRemove,
  onEnter,
  onMove,
}: {
  perk: Perk;
  index: number;
  count: number;
  flagged: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onText: (t: string) => void;
  onRemove: () => void;
  onEnter: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={perk}
      dragListener={false}
      dragControls={controls}
      className="group relative flex items-center gap-1.5 rounded-md bg-surface"
      whileDrag={{ scale: 1.01, boxShadow: "0 12px 30px -10px rgb(0 0 0 / 0.7)" }}
    >
      <button
        type="button"
        aria-label="Перетащить"
        tabIndex={-1}
        onPointerDown={(e) => controls.start(e)}
        className="flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center text-fg-4 hover:text-fg-2 active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </button>
      <div className="relative min-w-0 flex-1">
        <input
          ref={inputRef}
          value={perk.text}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            } else if (e.key === "Backspace" && !perk.text && count > 1) {
              e.preventDefault();
              onRemove();
            } else if (e.altKey && e.key === "ArrowUp") {
              e.preventDefault();
              onMove(-1);
            } else if (e.altKey && e.key === "ArrowDown") {
              e.preventDefault();
              onMove(1);
            }
          }}
          maxLength={60}
          placeholder="Например: питомец на выбор"
          aria-label={`Перк ${index + 1}`}
          aria-invalid={flagged || undefined}
          className={cn(
            "h-8 w-full rounded-md border bg-surface-2 pr-2 pl-2.5 text-[13px] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-fg-4 hover:border-line-strong focus:border-azure-500/70 focus:shadow-[0_0_0_3px_rgb(51_119_255/0.18)]",
            flagged ? "border-bad/50" : "border-line",
          )}
        />
      </div>
      <div className="flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <Button variant="ghost" size="icon-xs" aria-label="Выше" disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Ниже" disabled={index === count - 1} onClick={() => onMove(1)}>
          <ArrowDown />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label={`Удалить перк ${index + 1}`} onClick={onRemove}>
          <X />
        </Button>
      </div>
    </Reorder.Item>
  );
}
