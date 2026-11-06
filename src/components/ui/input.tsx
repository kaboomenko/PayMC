import * as React from "react";
import { cn } from "@/lib/utils";

export const inputBase =
  "w-full rounded-md border border-line bg-surface-2 text-sm text-fg placeholder:text-fg-4 shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)] transition-[border-color,box-shadow,background-color] duration-150 outline-none hover:border-line-strong focus:border-azure-500/70 focus:shadow-[0_0_0_3px_rgb(51_119_255/0.18)] disabled:opacity-50 aria-[invalid=true]:border-bad/60";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leading, trailing, ...props },
  ref,
) {
  if (!leading && !trailing) {
    return <input ref={ref} className={cn(inputBase, "h-9 px-3", className)} {...props} />;
  }
  return (
    <div className={cn("relative flex items-center", className)}>
      {leading ? (
        <span className="pointer-events-none absolute left-3 flex items-center text-fg-3 [&_svg]:size-4">{leading}</span>
      ) : null}
      <input
        ref={ref}
        className={cn(inputBase, "h-9", leading ? "pl-9" : "pl-3", trailing ? "pr-10" : "pr-3")}
        {...props}
      />
      {trailing ? <span className="absolute right-2 flex items-center text-fg-3">{trailing}</span> : null}
    </div>
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(inputBase, "min-h-20 px-3 py-2 leading-relaxed", className)} {...props} />;
  },
);

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium text-fg-2", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
  aside,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={htmlFor}>{label}</Label>
          {aside}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-bad">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-3">{hint}</p>
      ) : null}
    </div>
  );
}
