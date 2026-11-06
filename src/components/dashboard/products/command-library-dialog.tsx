"use client";

import * as React from "react";
import { CornerDownRight, Plus, Search, ShieldX, TriangleAlert, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { pluralize } from "@/lib/format";
import { COMMAND_LIBRARY, unknownVariables, type CommandTemplate } from "@/lib/command-library";
import { GAMES } from "@/lib/games";
import type { GameId } from "@/lib/mock/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { HighlightLine } from "@/components/ui/code-block";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GameChip } from "@/components/dashboard/game-chip";

export function CommandLibraryDialog({
  open,
  onOpenChange,
  game,
  onPick,
  onBlank,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: GameId;
  onPick: (t: CommandTemplate) => void;
  onBlank: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [allGames, setAllGames] = React.useState(false);

  const q = query.trim().toLowerCase();
  const list = COMMAND_LIBRARY.filter(
    (t) =>
      (allGames || t.game === game) &&
      (!q || `${t.title} ${t.description} ${t.plugin} ${t.template}`.toLowerCase().includes(q)),
  );
  // group: game → plugin (project game first)
  const groups: { key: string; game: GameId; plugin: string; items: CommandTemplate[] }[] = [];
  for (const t of [...list].sort((a, b) => Number(b.game === game) - Number(a.game === game))) {
    const key = `${t.game}:${t.plugin}`;
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(t);
    else groups.push({ key, game: t.game, plugin: t.plugin, items: [t] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(760px,calc(100dvh-2rem))] max-w-2xl flex-col">
        <DialogHeader className="shrink-0 border-b border-line-soft">
          <DialogTitle>Библиотека команд</DialogTitle>
          <DialogDescription>
            Выберите, что выдать, — синтаксис плагина подставим сами. Переменные в фигурных скобках заполнятся при покупке.
          </DialogDescription>
          <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="LuckPerms, ключи, разбан…"
              aria-label="Поиск по библиотеке"
              leading={<Search />}
              className="flex-1 [&_input]:h-8 [&_input]:text-[13px]"
            />
            <label className="flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-line bg-surface-2 px-2.5 text-[12.5px] text-fg-2 select-none">
              <Switch size="sm" checked={allGames} onCheckedChange={setAllGames} aria-label="Показать шаблоны всех игр" />
              Все игры
            </label>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {groups.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title="Шаблонов не нашли"
              description={allGames ? "Попробуйте другое слово или впишите команду вручную." : "Включите «Все игры» или впишите команду вручную — проверим переменные сами."}
              className="py-10"
            />
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <section key={g.key} aria-label={`${g.plugin} · ${GAMES[g.game].name}`}>
                  <div className="mb-2 flex items-center gap-2">
                    {allGames ? <GameChip game={g.game} size={18} /> : null}
                    <h3 className="label-mono text-fg-3">{g.plugin}</h3>
                    {allGames ? <span className="text-[11px] text-fg-4">{GAMES[g.game].name}</span> : null}
                    <span className="h-px flex-1 bg-line-soft" />
                  </div>
                  <ul className="space-y-2">
                    {g.items.map((t) => (
                      <TemplateCard key={t.id} t={t} game={game} onPick={onPick} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 justify-between">
          <span className="text-xs text-fg-4">{pluralize(list.length, ["шаблон", "шаблона", "шаблонов"])}</span>
          <Button variant="ghost" size="sm" onClick={onBlank}>
            <Plus /> Своя команда
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ t, game, onPick }: { t: CommandTemplate; game: GameId; onPick: (t: CommandTemplate) => void }) {
  const foreign = unknownVariables(t.template, game);
  const otherGame = t.game !== game;
  return (
    <li
      className={cn(
        "group rounded-lg border bg-surface-2/50 p-3 transition-colors",
        t.danger ? "border-bad/30" : "border-line hover:border-line-strong hover:bg-surface-2",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[13px] font-medium text-fg">{t.title}</p>
            {t.requireOnline ? (
              <Badge tone="ice">
                <UserRound /> Нужен онлайн
              </Badge>
            ) : null}
            {otherGame ? <Badge tone="outline">{GAMES[t.game].name}</Badge> : null}
          </div>
          <p className="mt-0.5 text-xs text-fg-3">{t.description}</p>
        </div>
        <Button
          variant={t.danger ? "ghost" : "secondary"}
          size="xs"
          disabled={!!t.danger}
          onClick={() => onPick(t)}
          aria-label={`Добавить шаблон «${t.title}»`}
        >
          {t.danger ? "Недоступно" : (
            <>
              <Plus /> Добавить
            </>
          )}
        </Button>
      </div>
      <div className="mt-2.5 overflow-hidden rounded-md border border-line-soft bg-[#06080c] px-2.5 py-1.5 font-mono text-[11.5px] leading-[1.6]">
        <p className="break-all text-fg-2">
          <span className="text-fg-4 select-none">$ </span>
          <HighlightLine line={t.template} />
        </p>
        <p className="flex items-start gap-1 text-fg-4">
          <CornerDownRight className="mt-[3px] size-3 shrink-0" />
          <span className="break-all">{t.output}</span>
        </p>
      </div>
      {t.danger ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-bad">
          <ShieldX className="mt-px size-3.5 shrink-0" /> {t.danger}
        </p>
      ) : foreign.length ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-warn">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          {foreign.join(", ")} нет в {GAMES[game].name} — после добавления подсветим и предложим замену
        </p>
      ) : null}
    </li>
  );
}
