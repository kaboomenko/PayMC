import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CURRENT_PROJECT_ID, getProduct } from "@/lib/mock";
import { ProductEditor } from "@/components/dashboard/products/product-editor";
import {
  defaultDeadline,
  editorContext,
  editorServers,
  productStats,
  toEditorProduct,
} from "@/components/dashboard/products/editor-data";

export async function generateMetadata({ params }: PageProps<"/dashboard/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = getProduct(id);
  return { title: p ? `${p.name} · Товары` : "Товар не найден" };
}

export default async function ProductPage({ params }: PageProps<"/dashboard/products/[id]">) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product || product.projectId !== CURRENT_PROJECT_ID) notFound();

  return (
    <ProductEditor
      key={product.id}
      product={toEditorProduct(product)}
      servers={editorServers()}
      ctx={editorContext()}
      stats={productStats(product)}
      defaultDeadline={defaultDeadline()}
    />
  );
}
