"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useQueryState } from "./use-query-state";

/** Header action that opens a URL-driven dialog/sheet (?new=1, ?invite=1, ?batch=1). */
export function QueryButton({
  param,
  value = "1",
  hotkey,
  children,
  ...props
}: Omit<ButtonProps, "onClick"> & { param: string; value?: string; hotkey?: string }) {
  const [, set] = useQueryState(param);
  return (
    <Button {...props} onClick={() => set(value)}>
      {children}
      {hotkey ? (
        <Kbd className="ml-0.5 hidden border-white/25 bg-white/10 text-white/80 uppercase sm:inline-flex">{hotkey}</Kbd>
      ) : null}
    </Button>
  );
}
