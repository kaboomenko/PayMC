"use client";

import * as React from "react";
import type { OrderStatus } from "@/lib/mock/types";

/** One row of the player's purchase history (server rows + optimistic manual grants). */
export interface PlayerOrderRow {
  id: string;
  items: { name: string; qty: number }[];
  amount: number;
  status: OrderStatus;
  createdAt: string;
  serverName: string;
  manual?: { reason: string };
}

interface PlayerState {
  grants: PlayerOrderRow[];
  /** adds an optimistic manual grant, returns its id (MAN-0001…) */
  addGrant: (row: Omit<PlayerOrderRow, "id">) => string;
  removeGrant: (id: string) => void;
  blocked: boolean;
  setBlocked: (v: boolean) => void;
  limit: number | null;
  setLimit: (v: number | null) => void;
  limitOpen: boolean;
  setLimitOpen: (v: boolean) => void;
}

const Ctx = React.createContext<PlayerState | null>(null);

export function PlayerProvider({ children, initialLimit = null }: { children: React.ReactNode; initialLimit?: number | null }) {
  const [grants, setGrants] = React.useState<PlayerOrderRow[]>([]);
  const [blocked, setBlocked] = React.useState(false);
  const [limit, setLimit] = React.useState<number | null>(initialLimit);
  const [limitOpen, setLimitOpen] = React.useState(false);
  const seq = React.useRef(0);
  const addGrant = React.useCallback((row: Omit<PlayerOrderRow, "id">) => {
    seq.current += 1;
    const id = `MAN-${String(seq.current).padStart(4, "0")}`;
    setGrants((g) => [{ ...row, id }, ...g]);
    return id;
  }, []);
  const value = React.useMemo<PlayerState>(
    () => ({
      grants,
      addGrant,
      removeGrant: (id) => setGrants((g) => g.filter((r) => r.id !== id)),
      blocked,
      setBlocked,
      limit,
      setLimit,
      limitOpen,
      setLimitOpen,
    }),
    [grants, addGrant, blocked, limit, limitOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}
