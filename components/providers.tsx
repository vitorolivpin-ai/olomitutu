"use client";

import { AppStoreProvider } from "@/hooks/use-app-store";

export function Providers({
  children,
  initialUserId = null,
}: {
  children: React.ReactNode;
  initialUserId?: string | null;
}) {
  return (
    <AppStoreProvider initialUserId={initialUserId}>{children}</AppStoreProvider>
  );
}
