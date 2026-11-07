import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "ILÉ OLÓRÒKÈ ÀṢẸ — OLÓMÌ TÚTÙ",
  description: "Gestão e organização do barracão",
  applicationName: "OLÓMÌ TÚTÙ",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "OLÓMÌ TÚTÙ",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B3475",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  let initialUserId = jar.get("ile-oloroke-sid")?.value ?? null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    if (user) initialUserId = user.id;
  }

  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full antialiased">
        {/* Splash nativa do 1º paint (PWA/Android) — removida após hidratação */}
        <div
          id="boot-splash"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0B3475",
          }}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brasao-designer.png"
            alt=""
            width={1024}
            height={1024}
            style={{
              width: "70vw",
              maxWidth: "24rem",
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>
        <Providers initialUserId={initialUserId}>{children}</Providers>
      </body>
    </html>
  );
}
