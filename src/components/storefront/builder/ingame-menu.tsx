import * as React from "react";
import { ChevronLeft, ChevronRight, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { ART_TINTS } from "../theme";
import type { StoreProduct } from "../types";

/** Chest-GUI-like preview of the in-game /donate menu (9×3 + navigation row). */
export function InGameMenu({ products, storeName }: { products: StoreProduct[]; storeName: string }) {
  const items = products.filter((p) => p.kind !== "pool").slice(0, 17);
  const slots: (StoreProduct | "qr" | null)[] = Array.from({ length: 27 }, (_, i) => (i === 13 ? "qr" : null));
  let k = 0;
  for (let i = 0; i < 27 && k < items.length; i++) {
    if (i === 13 || i % 9 === 0 || i % 9 === 8) continue;
    slots[i] = items[k++];
  }
  const featured = products.find((p) => p.badge === "hit") ?? products[0];
  return (
    <div className="rounded-lg border border-line bg-[#07090f] p-3">
      <div className="mx-auto w-full max-w-[400px] rounded-md border border-[#2a3346] bg-[#151b28] p-2 shadow-[inset_1px_1px_0_rgb(255_255_255/0.06),inset_-1px_-1px_0_rgb(0_0_0/0.5)]">
        <p className="mb-1.5 px-0.5 font-mono text-[11px] text-fg-2">Донат · {storeName}</p>
        <div className="grid grid-cols-9 gap-[3px]">
          {slots.map((s, i) => (
            <Slot key={i} item={s} />
          ))}
        </div>
        <div className="mt-[6px] grid grid-cols-9 gap-[3px]">
          <Slot nav={<ChevronLeft className="size-3.5" />} />
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="aspect-square rounded-[2px] bg-[#0e131d] shadow-[inset_1px_1px_0_rgb(0_0_0/0.6),inset_-1px_-1px_0_rgb(255_255_255/0.04)]" />
          ))}
          <Slot nav={<ChevronRight className="size-3.5" />} />
        </div>
      </div>
      <div className="mt-3 space-y-0.5 rounded-md bg-black/40 px-2.5 py-2 font-mono text-[11px] leading-[1.55]">
        <p className="truncate">
          <span className="text-ice-300">[PayMC]</span>{" "}
          <span className="text-fg-2">
            {featured ? `${featured.name} — ${formatMoney(featured.price)}. ` : ""}Наведите камеру на карту в руке
          </span>
        </p>
        <p className="truncate text-fg-3">
          <span className="text-fg-4">→ </span>QR действует 10 минут, после оплаты выдача сразу
        </p>
      </div>
    </div>
  );
}

function Slot({ item, nav }: { item?: StoreProduct | "qr" | null; nav?: React.ReactNode }) {
  const base =
    "relative flex aspect-square items-center justify-center rounded-[2px] bg-[#0e131d] shadow-[inset_1px_1px_0_rgb(0_0_0/0.6),inset_-1px_-1px_0_rgb(255_255_255/0.04)]";
  if (nav) return <span className={cn(base, "text-fg-3")}>{nav}</span>;
  if (item === "qr")
    return (
      <span className={cn(base, "bg-azure-500/20 text-azure-200 ring-1 ring-azure-400/60")} title="Оплата по QR">
        <QrCode className="size-4" />
      </span>
    );
  if (!item) return <span className={base} />;
  return (
    <span className={base} title={`${item.name} · ${formatMoney(item.price)}`}>
      <span
        className={cn(
          "flex size-[78%] items-center justify-center rounded-[2px] bg-gradient-to-br font-display text-[9px] font-bold text-white",
          ART_TINTS[item.tint % ART_TINTS.length],
        )}
      >
        {item.glyph}
      </span>
    </span>
  );
}
