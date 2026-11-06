"use client";

import * as React from "react";
import { PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { pluralize } from "@/lib/format";
import { GAMES } from "@/lib/games";
import { toast } from "@/components/ui/toaster";
import { StoreHeader } from "./store-header";
import {
  BlockHeading,
  FaqBlock,
  GoalWidget,
  NicknameCard,
  PoolCard,
  ProductGrid,
  RecentTicker,
  RulesBlock,
  ServersCard,
  StoreBackdrop,
  StoreFooter,
} from "./store-sections";
import { CheckoutDialog } from "./checkout-dialog";
import { useRememberedNick } from "./nickname";
import { BLOCK_META, CATALOG_BLOCKS, DEFAULT_BLOCKS, DEFAULT_THEME, themeVars } from "./theme";
import type { StoreBlock, StoreBlockId, StoreData, StoreProduct, StoreTheme } from "./types";

/**
 * The public storefront (what players see). Also rendered, scaled down, as
 * the live preview in the dashboard builder (`preview`): no sticky header,
 * no persistence, no checkout — just the exact same components.
 */
export function Storefront({
  data,
  theme = DEFAULT_THEME,
  blocks = DEFAULT_BLOCKS,
  preview = false,
  className,
}: {
  data: StoreData;
  theme?: StoreTheme;
  blocks?: StoreBlock[];
  preview?: boolean;
  className?: string;
}) {
  const [storedNick, setStoredNick] = useRememberedNick(`paymc:nick:${data.slug}`);
  const [previewNick, setPreviewNick] = React.useState("");
  const nick = preview ? previewNick : storedNick;
  const setNick = preview ? setPreviewNick : setStoredNick;
  const [checkout, setCheckout] = React.useState<StoreProduct | null>(null);
  const [tab, setTab] = React.useState<StoreBlockId | "all">("all");

  const visible = (id: StoreBlockId) => blocks.find((b) => b.id === id)?.visible ?? false;

  const groups = blocks
    .filter((b) => b.visible && CATALOG_BLOCKS.includes(b.id))
    .map((b) => ({
      id: b.id,
      label: BLOCK_META[b.id].label,
      products: data.products.filter((p) => BLOCK_META[b.id].categories?.includes(p.category)),
    }))
    .filter((g) => g.products.length > 0);
  const pools = data.products.filter((p) => p.kind === "pool" && p.pool);
  // the ticker only mentions products a player can actually find on this page
  const listed = new Set([...groups.flatMap((g) => g.products), ...(visible("pools") ? pools : [])].map((p) => p.id));
  const recent = data.recent.filter((r) => listed.has(r.productId)).slice(0, 14);
  const activeTab = tab !== "all" && groups.some((g) => g.id === tab) ? tab : "all";
  const shown = activeTab === "all" ? groups : groups.filter((g) => g.id === activeTab);

  const onBuy = (p: StoreProduct) => {
    if (preview) {
      toast("Это превью витрины", { description: "Оформление покупки работает в открытом магазине." });
      return;
    }
    setCheckout(p);
  };

  const showGoal = visible("goal") && data.goal;
  const empty = data.products.length === 0;

  return (
    <div
      id="top"
      style={themeVars(theme)}
      className={cn("@container relative isolate min-h-full overflow-x-clip bg-[#060912] text-fg", className)}
    >
      <StoreBackdrop theme={theme} />
      <StoreHeader data={data} preview={preview} />

      <main className="relative mx-auto max-w-[1200px] px-4 @3xl:px-8">
        {/* top: who / goal / pulse */}
        <section className="grid gap-3 pt-8 @3xl:pt-12 @4xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] @4xl:gap-4">
          <div className="flex flex-col gap-4">
            <div>
              <p className="label-mono text-[10.5px] text-(--st-accent-text)">Донат-магазин · {data.game === "minecraft" ? "Minecraft 1.21" : GAMES[data.game].name}</p>
              <h1 className="mt-2 font-display text-[30px] leading-[1.02] font-medium tracking-[-0.035em] text-fg @3xl:text-[44px]">
                Поддержите {data.name} —<span className="text-fg-3"> покупка придёт в игру сразу</span>
              </h1>
              <p className="mt-3 max-w-[520px] text-[14px] leading-relaxed text-fg-2">
                Офлайн — выдадим при входе. Сроки привилегий суммируются, шансы кейсов открыты.
              </p>
            </div>
            <NicknameCard nick={nick} onNick={setNick} storeName={data.name} platformHint={data.game === "minecraft" ? "Java и Bedrock" : "как в игре"} />
          </div>
          <div className="flex flex-col gap-3 @4xl:pt-[3px]">
            {showGoal && data.goal ? <GoalWidget goal={data.goal} /> : null}
            <ServersCard servers={data.servers} />
          </div>
        </section>

        {visible("recent") && recent.length ? (
          <div className="mt-3 @4xl:mt-4">
            <RecentTicker items={recent} now={data.now} />
          </div>
        ) : null}

        {empty ? (
          <EmptyStore name={data.name} />
        ) : (
          <>
            {visible("pools") && pools.length ? (
              <section id="pools" className="mt-12 scroll-mt-24">
                <BlockHeading eyebrow="Складчина" title="Скидываемся всем сервером" sub="Когда сумма собрана, бонус включается для всех. Не собрали — взносы вернутся." />
                <div className="grid gap-3 @4xl:grid-cols-2">
                  {pools.map((p) => (
                    <PoolCard key={p.id} p={p} now={data.now} onBuy={onBuy} />
                  ))}
                </div>
              </section>
            ) : null}

            <section id="shop" className="mt-12 scroll-mt-24">
              <BlockHeading
                eyebrow="Каталог"
                title="Что можно купить"
                aside={<p className="text-[12.5px] text-fg-3">Цены в рублях, без скрытых комиссий</p>}
              />
              {groups.length > 0 ? (
                <>
                  <div role="tablist" aria-label="Категории" className="scrollbar-none -mx-4 mb-5 flex gap-1 overflow-x-auto px-4 @3xl:mx-0 @3xl:px-0">
                    <CategoryTab active={activeTab === "all"} onClick={() => setTab("all")} label="Все" count={groups.reduce((a, g) => a + g.products.length, 0)} />
                    {groups.map((g) => (
                      <CategoryTab key={g.id} active={activeTab === g.id} onClick={() => setTab(g.id)} label={g.label} count={g.products.length} />
                    ))}
                  </div>
                  <div className="grid gap-9">
                    {shown.map((g) => (
                      <div key={g.id} role="tabpanel" aria-label={g.label}>
                        {activeTab === "all" ? (
                          <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-2">
                            <h3 className="text-[15px] font-medium text-fg">{g.label}</h3>
                            <span className="font-mono text-[11px] text-fg-4">{pluralize(g.products.length, ["товар", "товара", "товаров"])}</span>
                          </div>
                        ) : null}
                        <ProductGrid products={g.products} density={theme.density} onBuy={onBuy} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="rounded-(--st-r-card) border border-dashed border-white/[0.1] px-4 py-10 text-center text-[13px] text-fg-3">
                  Все разделы каталога скрыты. Включите хотя бы один блок в конструкторе витрины.
                </p>
              )}
            </section>
          </>
        )}

        {visible("rules") || visible("faq") ? (
          <div className="mt-14 grid gap-12 @5xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] @5xl:gap-8">
            {visible("rules") ? <RulesBlock /> : null}
            {visible("faq") ? <FaqBlock /> : null}
          </div>
        ) : null}
      </main>

      <StoreFooter data={data} />

      {!preview ? <CheckoutDialog product={checkout} onClose={() => setCheckout(null)} nick={nick} onNick={setNick} data={data} /> : null}
    </div>
  );
}

function CategoryTab({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-(--st-r-ctl) border px-3 text-[13px] font-medium transition-colors",
        active
          ? "border-(--st-accent-ring) bg-(--st-accent-soft) text-fg"
          : "border-white/[0.07] text-fg-3 hover:border-white/[0.14] hover:text-fg-2",
      )}
    >
      {label}
      <span className={cn("font-mono text-[11px] nums", active ? "text-(--st-accent-text)" : "text-fg-4")}>{count}</span>
    </button>
  );
}

function EmptyStore({ name }: { name: string }) {
  return (
    <section id="shop" className="mt-12 flex flex-col items-start gap-3 rounded-(--st-r-card) border border-dashed border-white/[0.1] bg-surface/40 px-5 py-12 @3xl:px-10">
      <PackageOpen className="size-6 text-fg-3" />
      <h2 className="font-display text-[22px] font-semibold tracking-[-0.03em] text-fg">Витрина {name} скоро откроется</h2>
      <p className="max-w-md text-[13px] leading-relaxed text-fg-3">
        Владелец ещё добавляет товары. Загляните позже или спросите в сообществе сервера — там обычно пишут о запуске.
      </p>
    </section>
  );
}
