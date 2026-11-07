import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, Plus } from "lucide-react";
import { CURRENT_PROJECT_ID, NOW_MS, PRODUCTS, PROJECTS } from "@/lib/mock";
import type { ProductKind } from "@/lib/mock/types";
import { GAMES } from "@/lib/games";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ProductsCatalog } from "@/components/dashboard/products/products-catalog";
import { KIND_ORDER } from "@/components/dashboard/products/product-meta";
import type { CatalogFilters, CatalogProduct } from "@/components/dashboard/products/types";

export const metadata: Metadata = { title: "Товары" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ProductsPage({ searchParams }: PageProps<"/dashboard/products">) {
  const sp = await searchParams;
  const project = PROJECTS.find((p) => p.id === CURRENT_PROJECT_ID)!;
  const game = GAMES[project.game];

  const cat = one(sp.cat);
  const status = one(sp.status);
  const eula = one(sp.eula);
  const filters: CatalogFilters = {
    cat: (KIND_ORDER as string[]).includes(cat) ? (cat as ProductKind) : "all",
    status: status === "active" || status === "draft" || status === "hidden" ? status : "all",
    q: one(sp.q).slice(0, 60),
    eula: eula === "risk" || eula === "warn" ? eula : "all",
  };

  // 24 products — small enough to ship whole; filtering happens instantly on the client and stays in the URL
  const products: CatalogProduct[] = PRODUCTS.filter((p) => p.projectId === CURRENT_PROJECT_ID)
    .sort((a, b) => a.sort - b.sort)
    .map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      category: p.category,
      price: p.price,
      oldPrice: p.oldPrice,
      durationDays: p.durationDays,
      status: p.status,
      badge: p.badge,
      views30d: p.views30d,
      sales30d: p.sales30d,
      revenue30d: p.revenue30d,
      salesTrend: p.salesTrend,
      eula: p.eula,
      pool: p.pool,
      tint: p.tint,
      glyph: p.glyph,
      commandCount: p.commands.length,
      serverCount: p.serverIds.length,
    }));

  return (
    <>
      <PageHeader
        title="Товары"
        description={`Каталог магазина ${project.name}: цены, сроки и команды, которые сервер выполнит после оплаты`}
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href="/dashboard/settings?tab=import">
                <ArrowDownToLine />
                <span className="sm:hidden">Импорт</span>
                <span className="hidden sm:inline">Импорт с другой платформы</span>
              </Link>
            </Button>
            <Button asChild variant="primary" size="sm">
              <Link href="/dashboard/products/new">
                <Plus /> Новый товар
                <Kbd className="ml-0.5 h-[18px] min-w-[18px] border-white/25 bg-white/10 text-[11px] text-white">N</Kbd>
              </Link>
            </Button>
          </>
        }
      />
      <ProductsCatalog products={products} initialFilters={filters} now={NOW_MS} gameName={game.name} />
    </>
  );
}
