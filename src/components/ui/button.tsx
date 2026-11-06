import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium select-none",
    "transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150 ease-out",
    "disabled:pointer-events-none disabled:opacity-45 active:translate-y-px",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure-400",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Main action inside the product */
        primary:
          "bg-azure-500 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.4)] hover:bg-azure-400",
        /** High-contrast marketing CTA */
        white:
          "bg-white text-canvas shadow-[inset_0_-1px_0_rgb(0_0_0/0.12),0_1px_2px_rgb(0_0_0/0.4)] hover:bg-azure-50",
        secondary:
          "bg-surface-2 text-fg border border-line hover:bg-surface-3 hover:border-line-strong shadow-raise",
        outline: "border border-line-strong text-fg hover:bg-white/[0.04] hover:border-fg-4",
        ghost: "text-fg-2 hover:text-fg hover:bg-white/[0.05]",
        danger: "bg-bad/90 text-white hover:bg-bad shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]",
        "danger-ghost": "text-bad hover:bg-bad-soft",
        link: "text-azure-300 hover:text-azure-200 underline-offset-4 hover:underline px-0! h-auto!",
      },
      size: {
        xs: "h-7 rounded-sm px-2.5 text-xs [&_svg]:size-3.5",
        sm: "h-8 rounded-md px-3 text-[13px] [&_svg]:size-4",
        md: "h-9 rounded-md px-3.5 text-sm [&_svg]:size-4",
        lg: "h-11 rounded-lg px-5 text-[15px] [&_svg]:size-[18px]",
        xl: "h-12 rounded-lg px-6 text-base [&_svg]:size-5",
        icon: "size-9 rounded-md [&_svg]:size-4",
        "icon-sm": "size-8 rounded-md [&_svg]:size-4",
        "icon-xs": "size-7 rounded-sm [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});
