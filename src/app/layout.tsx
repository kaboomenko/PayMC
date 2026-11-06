import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://paymc.ru"),
  title: {
    default: "PayMC — донат-магазин для игровых серверов",
    template: "%s · PayMC",
  },
  description:
    "Принимайте донат на Minecraft, Rust, GTA RP, ARK и ещё 15 играх. Выдача покупок на сервер за секунду, ежедневные выплаты, чеки для самозанятых и маркетинг прямо в игре.",
  applicationName: "PayMC",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "PayMC",
    title: "PayMC — донат, который доходит",
    description:
      "Донат-магазин для игровых серверов: мгновенная выдача, трассировка доставки, ежедневные выплаты.",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full bg-canvas text-fg antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
