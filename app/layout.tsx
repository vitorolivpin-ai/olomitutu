import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ILÉ OLÓRÒKÈ ÀṢẸ — OLÓMÌ TÚTÙ",
  description: "Gestão e organização do barracão",
  applicationName: "ILÉ OLÓRÒKÈ ÀṢẸ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ILÉ OLÓRÒKÈ ÀṢẸ",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A2F6E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const initialUserId = jar.get("ile-oloroke-sid")?.value ?? null;

  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full antialiased">
        <Providers initialUserId={initialUserId}>{children}</Providers>
      </body>
    </html>
  );
}
