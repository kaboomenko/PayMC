"use client";

import * as React from "react";
import { Slider as S } from "radix-ui";
import { cn } from "@/lib/utils";

export function Slider({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  const count = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <S.Root className={cn("relative flex h-5 w-full touch-none items-center select-none", className)} {...props}>
      <S.Track className="relative h-1 grow overflow-hidden rounded-full bg-white/[0.08]">
        <S.Range className="absolute h-full rounded-full bg-azure-500" />
      </S.Track>
      {Array.from({ length: count }).map((_, i) => (
        <S.Thumb
          key={i}
          className="block size-4 rounded-full border-2 border-white bg-azure-500 shadow-[0_0_0_4px_rgb(51_119_255/0.2),0_2px_6px_rgb(0_0_0/0.5)] transition-shadow outline-none hover:shadow-[0_0_0_6px_rgb(51_119_255/0.25)] focus-visible:shadow-[0_0_0_6px_rgb(51_119_255/0.35)]"
        />
      ))}
    </S.Root>
  );
}
