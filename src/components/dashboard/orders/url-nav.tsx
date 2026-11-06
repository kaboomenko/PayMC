"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * URL-driven list pages (orders, players): every filter lives in the query
 * string and the server component re-renders the visible slice. This provider
 * runs those navigations inside transitions so the list can dim while the
 * server works, and so optimistic UI (open drawer, active tab) feels instant.
 */
interface UrlNav {
  /** a list navigation (filters, tabs, pages) is in flight */
  listPending: boolean;
  /** a detail navigation (?id= drawer) is in flight */
  detailPending: boolean;
  navigate: (href: string, opts?: { detail?: boolean; optimistic?: () => void }) => void;
}

const Ctx = React.createContext<UrlNav | null>(null);

export function UrlNavProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [listPending, startList] = React.useTransition();
  const [detailPending, startDetail] = React.useTransition();

  const navigate = React.useCallback<UrlNav["navigate"]>(
    (href, opts) => {
      const start = opts?.detail ? startDetail : startList;
      start(() => {
        opts?.optimistic?.();
        router.replace(href, { scroll: false });
      });
    },
    [router],
  );

  const value = React.useMemo(() => ({ listPending, detailPending, navigate }), [listPending, detailPending, navigate]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUrlNav(): UrlNav {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useUrlNav must be used inside <UrlNavProvider>");
  return ctx;
}

/** <Link> that keeps modifier-clicks native but runs plain clicks through the list transition. */
export function NavLink({
  href,
  onClick,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { navigate } = useUrlNav();
  return (
    <Link
      href={href}
      scroll={false}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
      {...props}
    />
  );
}

/** Thin indeterminate bar shown while the server re-renders the list. */
export function ListPendingBar({ className }: { className?: string }) {
  const { listPending } = useUrlNav();
  return (
    <div aria-hidden className={className}>
      <div
        className={
          listPending
            ? "h-px w-full animate-[shimmer_1.1s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgb(85_207_255/0.9),transparent)] bg-[length:200%_100%] opacity-100 transition-opacity"
            : "h-px w-full opacity-0 transition-opacity"
        }
      />
    </div>
  );
}

/** Dims its children while a list navigation is pending. */
export function ListPendingFade({ children, className }: { children: React.ReactNode; className?: string }) {
  const { listPending } = useUrlNav();
  return (
    <div
      aria-busy={listPending}
      className={className}
      style={{ opacity: listPending ? 0.55 : 1, transition: "opacity 150ms var(--ease-snappy)" }}
    >
      {children}
    </div>
  );
}
