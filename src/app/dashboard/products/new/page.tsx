import type { Metadata } from "next";
import type { ProductKind } from "@/lib/mock/types";
import { ProductEditor } from "@/components/dashboard/products/product-editor";
import { KIND_ORDER } from "@/components/dashboard/products/product-meta";
import { blankProduct, defaultDeadline, editorContext, editorServers } from "@/components/dashboard/products/editor-data";

export const metadata: Metadata = { title: "Новый товар" };

export default async function NewProductPage({ searchParams }: PageProps<"/dashboard/products/new">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.kind) ? sp.kind[0] : sp.kind;
  const kind: ProductKind = raw && (KIND_ORDER as string[]).includes(raw) ? (raw as ProductKind) : "rank";
  const servers = editorServers();

  return (
    <ProductEditor
      key={kind}
      product={blankProduct(
        kind,
        servers.filter((s) => s.status !== "offline").map((s) => s.id),
      )}
      servers={servers}
      ctx={editorContext()}
      stats={null}
      defaultDeadline={defaultDeadline()}
    />
  );
}
