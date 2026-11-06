import type { Metadata } from "next";
import { CURRENT_PROJECT_ID, getProduct } from "@/lib/mock";
import type { ProductKind } from "@/lib/mock/types";
import { ProductEditor } from "@/components/dashboard/products/product-editor";
import { KIND_ORDER } from "@/components/dashboard/products/product-meta";
import { blankProduct, copyOfProduct, defaultDeadline, editorContext, editorServers } from "@/components/dashboard/products/editor-data";

export const metadata: Metadata = { title: "Новый товар" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function NewProductPage({ searchParams }: PageProps<"/dashboard/products/new">) {
  const sp = await searchParams;
  const raw = one(sp.kind);
  const kind: ProductKind = raw && (KIND_ORDER as string[]).includes(raw) ? (raw as ProductKind) : "rank";
  const servers = editorServers();

  // «Дублировать» in the catalog: ?from=<id> opens an unsaved draft prefilled from that product
  const fromId = one(sp.from);
  const source = fromId ? getProduct(fromId) : undefined;
  const copy = source && source.projectId === CURRENT_PROJECT_ID ? copyOfProduct(source) : null;

  return (
    <ProductEditor
      key={copy ? `copy-${source?.id}` : kind}
      product={
        copy ??
        blankProduct(
          kind,
          servers.filter((s) => s.status !== "offline").map((s) => s.id),
        )
      }
      servers={servers}
      ctx={editorContext()}
      stats={null}
      defaultDeadline={defaultDeadline()}
    />
  );
}
