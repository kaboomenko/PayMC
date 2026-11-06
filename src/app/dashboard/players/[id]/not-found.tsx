import Link from "next/link";
import { UserRoundX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function PlayerNotFound() {
  return (
    <div className="rounded-xl border border-line bg-surface shadow-raise">
      <EmptyState
        icon={<UserRoundX />}
        title="Такого игрока нет в базе"
        description="Игрок появляется здесь после первого входа на сервер с плагином PayMC. Попробуйте найти его по нику или UUID."
        action={
          <Link
            href="/dashboard/players"
            className="inline-flex h-8 items-center rounded-md border border-line bg-surface-2 px-3 text-[13px] font-medium text-fg shadow-raise transition-colors hover:border-line-strong hover:bg-surface-3"
          >
            Ко всем игрокам
          </Link>
        }
      />
    </div>
  );
}
