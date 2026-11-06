import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CURRENT_PROJECT_ID, PROJECTS } from "@/lib/mock";
import { getStoreData } from "@/components/storefront/data";
import { StorefrontBuilder } from "@/components/storefront/builder/storefront-builder";

export const metadata: Metadata = { title: "Витрина" };

export default function StorefrontBuilderPage() {
  const project = PROJECTS.find((p) => p.id === CURRENT_PROJECT_ID);
  const data = project ? getStoreData(project.slug) : null;
  if (!data) notFound();
  return <StorefrontBuilder data={data} />;
}
