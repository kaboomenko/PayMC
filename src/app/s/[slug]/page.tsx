import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront/storefront";
import { STORE_SLUGS, getStoreData } from "@/components/storefront/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return STORE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = getStoreData(slug);
  if (!data) return {};
  return {
    title: { absolute: `${data.name} — донат-магазин` },
    description: `Привилегии, кейсы и косметика для ${data.name}. Выдача в игру за секунду, оплата по СБП и картами.`,
  };
}

export default async function StorePage({ params }: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  const data = getStoreData(slug);
  if (!data) notFound();
  return <Storefront data={data} />;
}
